import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { mockRepositories as repo } from "@/lib/mock";
import { useCurrentOrg, PageHeader } from "@/components/app-shell";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LensMark } from "@/components/brand";
import { toast } from "sonner";
import { ArrowRight, ArrowLeft, Sparkles, Radar, Save, CheckCircle2, Check, ListChecks, Gauge, Layers3, TrendingUp, ShieldCheck, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app/assessments/new")({
  component: NewAssessment,
});

// CORE7 pillars — used to render the emerging weighting profile in the rail.
const PILLARS = [
  { code: "STR", name: "Strategy & Vision", base: 18, kw: ["strategy", "vision", "ambition", "roadmap", "growth", "market", "competitive"] },
  { code: "GOV", name: "Leadership & Governance", base: 16, kw: ["governance", "sponsor", "leadership", "board", "decision", "funding", "budget"] },
  { code: "OPM", name: "Operating Model & Process", base: 14, kw: ["process", "operating model", "operations", "efficiency", "cutover", "workflow", "supply"] },
  { code: "PPL", name: "People & Culture", base: 14, kw: ["people", "culture", "team", "skills", "capability", "adoption", "training", "workforce"] },
  { code: "TEC", name: "Technology & Data", base: 16, kw: ["technology", "data", "platform", "system", "erp", "cloud", "integration", "digital", "ai", "software"] },
  { code: "CUS", name: "Customer & Value", base: 12, kw: ["customer", "value", "experience", "service", "revenue", "outcome", "benefit"] },
  { code: "RSK", name: "Risk & Compliance", base: 10, kw: ["risk", "compliance", "regulatory", "security", "control", "resilience", "audit"] },
];

const STAGES = [
  { key: "context", label: "Change context", hint: "What is changing and why" },
  { key: "survey", label: "Profiling survey", hint: "23 characteristic signals" },
  { key: "profile", label: "CORE7 weighting", hint: "Generated profile" },
];

// ---- Profiling survey definition --------------------------------------------
// 23 questions across 7 lenses. Progressive disclosure: one lens at a time,
// questions revealed in small pages to reduce perceived effort.
const EXTENT = ["Minimal", "Moderate", "Significant", "Decisive"];

type SurveyQuestion = { id: string; text: string; options: string[] };
type SurveyLens = { key: string; name: string; why: string; questions: SurveyQuestion[] };

const SURVEY: SurveyLens[] = [
  {
    key: "strategy",
    name: "Strategic Alignment & Leadership",
    why: "Transformations stall when scale, scope and leadership intent are not aligned. This lens profiles the reach of the change and the leadership commitment it will demand.",
    questions: [
      { id: "q1", text: "Approximately how many people are expected to be impacted by this change?", options: ["Under 50", "50–250", "250–1,000", "1,000+"] },
      { id: "q2", text: "What organisational level is primarily affected by this change?", options: ["Single team", "Department", "Division", "Enterprise-wide"] },
      { id: "q3", text: "Will success depend on alignment across multiple leadership teams?", options: ["Unlikely", "Possibly", "Likely", "Essential"] },
      { id: "q4", text: "To what extent will employee awareness and understanding influence successful delivery?", options: EXTENT },
      { id: "q5", text: "To what extent will success depend on leaders actively supporting and reinforcing the change?", options: EXTENT },
    ],
  },
  {
    key: "data",
    name: "Data Quality & Insight",
    why: "Change increasingly runs on data. This lens profiles how far delivery relies on trustworthy information and the new insight the organisation must produce.",
    questions: [
      { id: "q6", text: "To what extent will this change depend on accurate, reliable or accessible data?", options: EXTENT },
      { id: "q7", text: "Will new reporting, analytics or management information be required?", options: ["None", "Minor", "Moderate", "Extensive"] },
      { id: "q8", text: "Will success require new KPIs, measures or performance indicators?", options: ["No", "Some", "Several", "Fundamental"] },
    ],
  },
  {
    key: "process",
    name: "Process Maturity",
    why: "The depth of process change shapes operational risk. This lens profiles how much existing ways of working must be redesigned and re-connected.",
    questions: [
      { id: "q9", text: "Will existing business processes need to change?", options: ["No", "Minor", "Moderate", "Major"] },
      { id: "q10", text: "Will people need to perform their work differently?", options: ["Minimal", "Moderate", "Significant", "Fundamental"] },
      { id: "q11", text: "To what extent will successful delivery depend on multiple business processes working together effectively?", options: EXTENT },
    ],
  },
  {
    key: "technology",
    name: "Technology & Tooling",
    why: "Technical scope drives complexity and dependency. This lens profiles the systems footprint of the change and the integration effort it implies.",
    questions: [
      { id: "q12", text: "Does this change introduce new technology or digital tools?", options: ["None", "Minor", "Moderate", "Substantial"] },
      { id: "q13", text: "Will existing systems require integration, modification or replacement?", options: ["None", "Minor", "Moderate", "Extensive"] },
      { id: "q14", text: "How technically complex is the proposed change?", options: ["Low", "Moderate", "High", "Very high"] },
    ],
  },
  {
    key: "people",
    name: "People & Capability",
    why: "Capability gaps quietly determine adoption. This lens profiles the new skills, roles and specialist expertise success will rely upon.",
    questions: [
      { id: "q15", text: "Will employees require new skills or knowledge?", options: ["None", "Some", "Significant", "Extensive"] },
      { id: "q16", text: "Will roles or responsibilities change?", options: ["No", "Minor", "Moderate", "Major"] },
      { id: "q17", text: "To what extent does successful delivery depend on specialist expertise?", options: EXTENT },
    ],
  },
  {
    key: "governance",
    name: "Governance & Risk",
    why: "Assurance and coordination needs grow with exposure. This lens profiles the control, compliance and decision-making demands of the change.",
    questions: [
      { id: "q18", text: "Does the change introduce new risks, controls or assurance requirements?", options: ["None", "Minor", "Moderate", "Significant"] },
      { id: "q19", text: "Is the change subject to regulatory, legal or compliance requirements?", options: ["None", "Limited", "Moderate", "Heavily regulated"] },
      { id: "q20", text: "How many business areas will need to coordinate decisions during implementation?", options: ["1–2", "3–4", "5–6", "7+"] },
    ],
  },
  {
    key: "adaptability",
    name: "Organisational Adaptability",
    why: "Behavioural change is the hardest to sustain. This lens profiles how far the organisation must shift its habits, norms and ways of thinking.",
    questions: [
      { id: "q21", text: "How much behavioural change is required for success?", options: ["Minimal", "Moderate", "Significant", "Profound"] },
      { id: "q22", text: "To what extent will people need to adopt new behaviours, habits or ways of thinking?", options: EXTENT },
      { id: "q23", text: "To what extent does this change challenge existing ways of working or organisational norms?", options: ["Minimal", "Moderate", "Significant", "Fundamental"] },
    ],
  },
];

// How many questions to reveal at once within a lens (progressive disclosure).
const PAGE_SIZE = 3;

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// ---- Transparent local scoring model (CORE7 methodology) --------------------
// Each survey answer maps to a named *driver*. Driver scores aggregate into the
// seven CORE7 *pillar importance* scores, which normalise into a *weighting
// profile*. The profile shapes the later readiness assessment — it does not
// itself measure readiness.
type Weights = Partial<Record<string, number>>;
type Driver = { q: string; name: string; w: Weights };

const DRIVERS: Driver[] = [
  { q: "q1", name: "Scale of Impact", w: { STR: 0.6, PPL: 0.4 } },
  { q: "q2", name: "Organisational Reach", w: { STR: 1 } },
  { q: "q3", name: "Leadership Alignment Complexity", w: { GOV: 1 } },
  { q: "q4", name: "Awareness Dependency", w: { PPL: 0.6, GOV: 0.4 } },
  { q: "q5", name: "Sponsorship Dependency", w: { GOV: 1 } },
  { q: "q6", name: "Data Dependency", w: { TEC: 0.7, CUS: 0.3 } },
  { q: "q7", name: "Insight & Reporting Demand", w: { TEC: 0.6, CUS: 0.4 } },
  { q: "q8", name: "Measurement Change", w: { CUS: 0.6, STR: 0.4 } },
  { q: "q9", name: "Process Redesign", w: { OPM: 1 } },
  { q: "q10", name: "Ways-of-Working Change", w: { OPM: 0.6, PPL: 0.4 } },
  { q: "q11", name: "Process Integration", w: { OPM: 1 } },
  { q: "q12", name: "Technology Footprint", w: { TEC: 1 } },
  { q: "q13", name: "Integration Complexity", w: { TEC: 1 } },
  { q: "q14", name: "Technical Complexity", w: { TEC: 1 } },
  { q: "q15", name: "Capability Gap", w: { PPL: 1 } },
  { q: "q16", name: "Role Change", w: { PPL: 0.7, OPM: 0.3 } },
  { q: "q17", name: "Specialist Dependency", w: { PPL: 0.6, TEC: 0.4 } },
  { q: "q18", name: "Risk & Control Demand", w: { RSK: 1 } },
  { q: "q19", name: "Regulatory Exposure", w: { RSK: 1 } },
  { q: "q20", name: "Coordination Complexity", w: { GOV: 0.6, OPM: 0.4 } },
  { q: "q21", name: "Behaviour Change", w: { PPL: 0.7, CUS: 0.3 } },
  { q: "q22", name: "Mindset Shift", w: { PPL: 1 } },
  { q: "q23", name: "Cultural Challenge", w: { PPL: 0.6, GOV: 0.4 } },
];

const QMAP: Record<string, SurveyQuestion> = Object.fromEntries(
  SURVEY.flatMap((l) => l.questions).map((q) => [q.id, q]),
);

type ScoredDriver = Driver & { answered: boolean; score: number; topPillar: string };
type ScoredPillar = {
  code: string;
  name: string;
  importance: number;
  weight: number;
  confidence: number;
  answered: number;
  total: number;
};

function computeProfile(answers: Record<string, string>) {
  const drivers: ScoredDriver[] = DRIVERS.map((d) => {
    const opts = QMAP[d.q]?.options ?? [];
    const ans = answers[d.q];
    const idx = ans ? opts.indexOf(ans) : -1;
    const answered = idx >= 0;
    const score = answered && opts.length > 1 ? Math.round((idx / (opts.length - 1)) * 100) : 0;
    const topPillar = Object.entries(d.w).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))[0]?.[0] ?? "STR";
    return { ...d, answered, score, topPillar };
  });

  const pillars: ScoredPillar[] = PILLARS.map((p) => {
    const contrib = drivers.filter((d) => d.w[p.code] != null);
    const done = contrib.filter((d) => d.answered);
    let importance = 50;
    if (done.length) {
      const wsum = done.reduce((s, d) => s + (d.w[p.code] ?? 0), 0) || 1;
      importance = Math.round(done.reduce((s, d) => s + d.score * (d.w[p.code] ?? 0), 0) / wsum);
    }
    const confidence = contrib.length ? Math.round((done.length / contrib.length) * 100) : 0;
    return { code: p.code, name: p.name, importance, weight: 0, confidence, answered: done.length, total: contrib.length };
  });

  const totalImp = pillars.reduce((s, p) => s + p.importance, 0) || 1;
  pillars.forEach((p) => (p.weight = Math.round((p.importance / totalImp) * 100)));
  // reconcile rounding so weights total exactly 100%
  const drift = 100 - pillars.reduce((s, p) => s + p.weight, 0);
  if (drift !== 0) {
    const top = [...pillars].sort((a, b) => b.weight - a.weight)[0];
    if (top) top.weight += drift;
  }

  const sorted = [...pillars].sort((a, b) => b.weight - a.weight);
  const topDrivers = drivers.filter((d) => d.answered).sort((a, b) => b.score - a.score);
  return { drivers, pillars, sorted, topDrivers };
}

function confidenceLabel(pct: number, complete: boolean): { label: string; tone: string } {
  if (complete) return { label: "High", tone: "text-primary" };
  if (pct < 40) return { label: "Provisional · Low", tone: "text-muted-foreground" };
  if (pct < 75) return { label: "Provisional · Moderate", tone: "text-muted-foreground" };
  return { label: "Provisional · High", tone: "text-foreground" };
}

function NewAssessment() {
  const { user } = useAuth();
  const { data: orgData } = useCurrentOrg();
  const orgId = orgData?.current?.id;
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [stage, setStage] = useState<"context" | "survey" | "review">("context");
  const [lensIndex, setLensIndex] = useState(0);
  const [pageIndex, setPageIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    title: "",
    description: "",
    objectives: "",
  });

  // Lightweight, client-side signal detection from the free text so the rail
  // feels analytical as the user types. This is NOT a readiness score — it is a
  // preview of how the change characteristics begin to shape the CORE7 weights.
  const corpus = `${form.title} ${form.description} ${form.objectives}`.toLowerCase();

  const emerging = useMemo(() => {
    const hits = PILLARS.map((p) => {
      const count = p.kw.reduce((n, k) => (corpus.includes(k) ? n + 1 : n), 0);
      return { ...p, raw: p.base + count * 6, count };
    });
    const total = hits.reduce((n, h) => n + h.raw, 0);
    return hits
      .map((h) => ({ ...h, weight: Math.round((h.raw / total) * 100) }))
      .sort((a, b) => b.weight - a.weight);
  }, [corpus]);

  const signals = emerging.filter((p) => p.count > 0).slice(0, 4);

  const filled = [form.title, form.description, form.objectives].filter((v) => v.trim().length > 0).length;
  const progress = Math.round((filled / 3) * 100);
  const canAdvance = form.title.trim().length > 0 && form.description.trim().length > 0;

  // ---- Survey navigation derived state ----
  const lens = SURVEY[lensIndex];
  const lensPages = useMemo(() => chunk(lens.questions, PAGE_SIZE), [lens]);
  const pageQuestions = lensPages[pageIndex] ?? [];
  const totalQuestions = SURVEY.reduce((n, l) => n + l.questions.length, 0);
  const answeredCount = SURVEY.reduce(
    (n, l) => n + l.questions.filter((q) => answers[q.id]).length,
    0,
  );
  const surveyProgress = Math.round((answeredCount / totalQuestions) * 100);

  // Answer-driven CORE7 profile — updates live as questions are answered.
  const profile = useMemo(() => computeProfile(answers), [answers]);
  const profileComplete = answeredCount === totalQuestions;
  const overallConfidence = confidenceLabel(surveyProgress, profileComplete);
  const maxWeight = Math.max(1, ...profile.sorted.map((p) => p.weight));

  const lensAnswered = (l: SurveyLens) => l.questions.filter((q) => answers[q.id]).length;
  const lensComplete = (l: SurveyLens) => lensAnswered(l) === l.questions.length;
  const pageComplete = pageQuestions.every((q) => answers[q.id]);
  const isFirstPage = lensIndex === 0 && pageIndex === 0;
  const isLastPage = lensIndex === SURVEY.length - 1 && pageIndex === lensPages.length - 1;
  const allAnswered = answeredCount === totalQuestions;

  function setAnswer(id: string, value: string) {
    setAnswers((a) => ({ ...a, [id]: value }));
  }

  function goNext() {
    if (pageIndex < lensPages.length - 1) {
      setPageIndex((p) => p + 1);
    } else if (lensIndex < SURVEY.length - 1) {
      setLensIndex((l) => l + 1);
      setPageIndex(0);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goBack() {
    if (pageIndex > 0) {
      setPageIndex((p) => p - 1);
    } else if (lensIndex > 0) {
      const prev = lensIndex - 1;
      setLensIndex(prev);
      setPageIndex(chunk(SURVEY[prev].questions, PAGE_SIZE).length - 1);
    } else {
      setStage("context");
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function jumpToLens(i: number) {
    setLensIndex(i);
    setPageIndex(0);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function startSurvey() {
    setStage("survey");
    setLensIndex(0);
    setPageIndex(0);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goToReview() {
    setStage("review");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const create = useMutation({
    mutationFn: async () => {
      if (!orgId) throw new Error("No organisation");
      const top = profile.sorted[0];
      const avg = profile.topDrivers.length
        ? Math.round(profile.topDrivers.reduce((s, d) => s + d.score, 0) / profile.topDrivers.length)
        : 0;
      const complexity = avg >= 67 ? "High" : avg >= 34 ? "Medium" : "Low";
      const a = repo.assessments.create({
        organisation_id: orgId,
        name: form.title,
        description: form.description || null,
        transformation_profile: top ? `${top.name} (${top.weight}%)` : "Balanced",
        scope_level: answers["q2"] || "Business unit",
        complexity_level: complexity,
        business_area: "Operations",
        target_completion_date: null,
        status: "active",
        created_by: user!.id,
      });

      for (const p of repo.pillars.list()) {
        repo.pillarAssessments.create({ assessment_id: a.id, pillar_id: p.id, status: "not_started" });
      }
      repo.activity.log({
        organisation_id: orgId,
        assessment_id: a.id,
        actor_id: user!.id,
        actor_email: user!.email,
        event_type: "assessment_created",
        detail: { note: `Created transformation profile "${a.name}"` },
      });
      return a;
    },
    onSuccess: (a) => {
      qc.invalidateQueries({ queryKey: ["assessments"] });
      toast.success("Transformation profile created. Profiling survey ready next.");
      navigate({ to: "/app/assessments/$id", params: { id: a.id } });
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  return (
    <>
      <PageHeader
        eyebrow="Transformation intelligence"
        title="Create Transformation Profile"
        description="Describe the proposed change. ChangeLens reads its characteristics to generate a dynamic CORE7 weighting profile — the lens that will later tailor your readiness assessment."
      />

      <div className="px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-8 max-w-[1400px]">
          {/* ---- Main column ---- */}
          <div className="min-w-0 space-y-8">
            {/* Stage ribbon */}
            <ol className="flex items-stretch gap-3">
              {STAGES.map((s, i) => {
                const activeIndex = stage === "context" ? 0 : stage === "survey" ? 1 : 2;
                const active = i === activeIndex;
                const done = i < activeIndex;
                return (
                  <li key={s.key} className={cn(
                    "flex-1 rounded-sm border px-4 py-3",
                    active ? "border-primary bg-[color-mix(in_oklab,var(--primary)_6%,transparent)]" : "border-border bg-card opacity-70",
                  )}>
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-mono",
                        active ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground",
                      )}>
                        {done ? <CheckCircle2 className="h-3 w-3" /> : i + 1}
                      </span>
                      <span className={cn("text-[13px] font-medium", !active && "text-muted-foreground")}>{s.label}</span>
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground pl-7">{s.hint}</p>
                  </li>
                );
              })}
            </ol>

            {/* Stage 1 panel */}
            {stage === "context" && (
            <div className="rounded-sm border border-border bg-card">
              <div className="px-6 py-5 border-b border-border">
                <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.14em] text-muted-foreground">
                  <Sparkles className="h-3.5 w-3.5 text-primary" /> Stage 1 · Change context
                </div>
                <h2 className="display text-[20px] mt-1.5" style={{ color: "var(--ink)" }}>Describe the change</h2>
                <p className="mt-1 text-sm text-muted-foreground max-w-xl">
                  This stage captures the intent of the change — not its readiness. The richer the context, the sharper the profile ChangeLens can shape.
                </p>
              </div>

              <div className="px-6 py-6 space-y-6">
                <Field label="Change title" hint="The name a board would recognise.">
                  <Input
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="e.g. ERP & Operating Model Modernisation"
                    maxLength={200}
                  />
                </Field>

                <Field label="Change description" hint="What is changing, the trigger, and the intended end state.">
                  <Textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    rows={5}
                    placeholder="Describe the transformation in one clear paragraph an executive sponsor would endorse."
                    maxLength={1500}
                  />
                </Field>

                <Field label="Objectives / success criteria" hint="The outcomes that define success — one per line works well.">
                  <Textarea
                    value={form.objectives}
                    onChange={(e) => setForm({ ...form, objectives: e.target.value })}
                    rows={4}
                    placeholder={"e.g.\n— Reduce close cycle from 10 to 4 days\n— Single source of operational data\n— 90% process adoption within two quarters"}
                    maxLength={1500}
                  />
                </Field>
              </div>

              <div className="px-6 py-4 border-t border-border flex items-center justify-between gap-4">
                <Button variant="ghost" onClick={() => navigate({ to: "/app" })}>Cancel</Button>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-muted-foreground hidden sm:inline">
                    {canAdvance ? "Ready to profile" : "Add a title and description to continue"}
                  </span>
                  <Button onClick={startSurvey} disabled={!canAdvance}>
                    Begin profiling survey
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
            )}

            {/* Stage 2 — Profiling survey */}
            {stage === "survey" && (
            <div className="space-y-6">
              {/* Lens stepper */}
              <ol className="flex flex-wrap gap-2">
                {SURVEY.map((l, i) => {
                  const complete = lensComplete(l);
                  const current = i === lensIndex;
                  return (
                    <li key={l.key}>
                      <button
                        type="button"
                        onClick={() => jumpToLens(i)}
                        className={cn(
                          "flex items-center gap-1.5 rounded-sm border px-2.5 py-1.5 text-[11px] transition-colors",
                          current
                            ? "border-primary bg-[color-mix(in_oklab,var(--primary)_8%,transparent)] text-foreground"
                            : "border-border bg-card text-muted-foreground hover:text-foreground",
                        )}
                      >
                        <span className={cn(
                          "h-4 w-4 rounded-full flex items-center justify-center text-[9px] font-mono",
                          complete ? "bg-primary text-primary-foreground" : current ? "border border-primary text-foreground" : "border border-border",
                        )}>
                          {complete ? <Check className="h-2.5 w-2.5" /> : i + 1}
                        </span>
                        <span className="hidden sm:inline font-medium">{l.name}</span>
                      </button>
                    </li>
                  );
                })}
              </ol>

              {/* Lens panel */}
              <div className="rounded-sm border border-border bg-card">
                <div className="px-6 py-5 border-b border-border">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.14em] text-muted-foreground">
                      <ListChecks className="h-3.5 w-3.5 text-primary" /> Lens {lensIndex + 1} of {SURVEY.length}
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground">
                      {lensAnswered(lens)}/{lens.questions.length} profiled
                    </span>
                  </div>
                  <h2 className="display text-[20px] mt-1.5" style={{ color: "var(--ink)" }}>{lens.name}</h2>
                  <p className="mt-2 text-[12px] text-muted-foreground max-w-2xl border-l-2 border-primary pl-3">
                    <span className="font-medium text-foreground">Why this matters · </span>{lens.why}
                  </p>
                </div>

                <div className="px-6 py-6 space-y-7">
                  {pageQuestions.map((q, qi) => {
                    const globalIndex = lens.questions.findIndex((x) => x.id === q.id);
                    return (
                      <div key={q.id} className="space-y-3">
                        <div className="flex items-start gap-2.5">
                          <span className="mt-0.5 font-mono text-[11px] text-primary shrink-0">
                            {String(SURVEY.slice(0, lensIndex).reduce((n, l) => n + l.questions.length, 0) + globalIndex + 1).padStart(2, "0")}
                          </span>
                          <p className="text-[14px] leading-snug text-foreground">{q.text}</p>
                        </div>
                        <OptionCards
                          options={q.options}
                          value={answers[q.id]}
                          onChange={(v) => setAnswer(q.id, v)}
                        />
                        {qi < pageQuestions.length - 1 && <div className="h-px bg-border/60" />}
                      </div>
                    );
                  })}
                </div>

                <div className="px-6 py-4 border-t border-border flex items-center justify-between gap-4">
                  <Button variant="ghost" onClick={goBack}>
                    <ArrowLeft className="h-3.5 w-3.5" />
                    {isFirstPage ? "Back to context" : "Back"}
                  </Button>
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] text-muted-foreground hidden sm:inline">
                      {pageComplete ? "Lens signals captured" : "Profile the questions above to continue"}
                    </span>
                    {isLastPage ? (
                      <Button onClick={goToReview} disabled={!allAnswered}>
                        Generate transformation profile
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    ) : (
                      <Button onClick={goNext} disabled={!pageComplete}>
                        Continue
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
            )}

            {stage === "context" && (
              <p className="text-[11px] text-muted-foreground border-l-2 border-primary pl-3 max-w-2xl">
                Next, a short profiling survey (23 characteristic signals) refines the CORE7 weighting shown on the right. The readiness assessment itself comes afterwards, tailored to this profile.
              </p>
            )}
          </div>

          {/* ---- Intelligence rail ---- */}
          <aside className="lg:sticky lg:top-6 self-start space-y-4">
            <div className="rounded-sm border border-border bg-card overflow-hidden">
              <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.14em] text-muted-foreground">
                  <Radar className="h-3.5 w-3.5 text-primary" /> Intelligence
                </div>
                <span className="text-[10px] font-mono text-muted-foreground">{stage === "context" ? progress : surveyProgress}%</span>
              </div>

              {/* Progress */}
              <div className="px-5 py-4 border-b border-border">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-2">
                  <span>{stage === "context" ? "Context progress" : "Profiling progress"}</span>
                  <span className="font-mono">
                    {stage === "context" ? `${filled}/3 inputs` : `${answeredCount}/${totalQuestions} signals`}
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-500"
                    style={{ width: `${stage === "context" ? progress : surveyProgress}%` }}
                  />
                </div>
              </div>

              {/* Lens completion (survey stage) */}
              {stage === "survey" && (
                <div className="px-5 py-4 border-b border-border">
                  <div className="text-[11px] text-muted-foreground mb-2.5">Lens completion</div>
                  <ul className="space-y-1.5">
                    {SURVEY.map((l, i) => {
                      const done = lensComplete(l);
                      const current = i === lensIndex;
                      return (
                        <li key={l.key} className="flex items-center gap-2">
                          <span className={cn(
                            "h-3.5 w-3.5 rounded-full flex items-center justify-center text-[8px] font-mono shrink-0",
                            done ? "bg-primary text-primary-foreground" : current ? "border border-primary" : "border border-border",
                          )}>
                            {done ? <Check className="h-2 w-2" /> : ""}
                          </span>
                          <span className={cn("text-[11px] truncate", current ? "text-foreground" : "text-muted-foreground")}>{l.name}</span>
                          <span className="ml-auto font-mono text-[10px] text-muted-foreground">{lensAnswered(l)}/{l.questions.length}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {/* Emerging CORE7 profile */}
              <div className="px-5 py-4 border-b border-border">
                <div className="flex items-center gap-3 mb-3">
                  <LensMark size={36} />
                  <div>
                    <div className="text-[13px] font-medium" style={{ color: "var(--ink)" }}>Emerging CORE7 profile</div>
                    <div className="text-[11px] text-muted-foreground">
                      {stage === "survey" ? "Refines as you profile" : "Live weighting preview"}
                    </div>
                  </div>
                </div>
                <ul className="space-y-2">
                  {emerging.map((p) => (
                    <li key={p.code} className="grid grid-cols-[34px_1fr_30px] items-center gap-2">
                      <span className="font-mono text-[10px] text-muted-foreground">{p.code}</span>
                      <span className="h-1.5 rounded-full bg-secondary overflow-hidden">
                        <span
                          className={cn("block h-full transition-all duration-500", p.count > 0 ? "bg-primary" : "bg-muted-foreground/40")}
                          style={{ width: `${Math.min(100, p.weight * 2.4)}%` }}
                        />
                      </span>
                      <span className="font-mono text-[10px] text-right text-muted-foreground">{p.weight}%</span>
                    </li>
                  ))}
                </ul>
                {stage === "survey" && (
                  <p className="mt-3 text-[10px] text-muted-foreground/80 italic">
                    Placeholder preview — final weighting is computed from your survey responses when the profile is generated.
                  </p>
                )}
              </div>

              {/* Top detected signals */}
              <div className="px-5 py-4">
                <div className="text-[11px] text-muted-foreground mb-2">Top detected signals</div>
                {signals.length === 0 ? (
                  <p className="text-[12px] text-muted-foreground/80 italic">
                    Start describing the change to surface signals across the seven pillars.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {signals.map((s) => (
                      <span key={s.code} className="inline-flex items-center gap-1.5 rounded-sm border border-border bg-secondary px-2 py-0.5 text-[11px]">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                        {s.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-sm border border-dashed border-border bg-card/60 px-5 py-3 flex items-center gap-2 text-[11px] text-muted-foreground">
              <Save className="h-3.5 w-3.5" />
              {stage === "survey"
                ? `Responses held locally — ${answeredCount}/${totalQuestions} captured`
                : canAdvance ? "Draft held locally — saved on profile creation" : "Draft not started"}
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function OptionCards({
  options,
  value,
  onChange,
}: {
  options: string[];
  value?: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pl-7">
      {options.map((opt, i) => {
        const selected = value === opt;
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={cn(
              "group relative rounded-sm border px-3 py-2.5 text-left text-[12px] leading-tight transition-colors",
              selected
                ? "border-primary bg-[color-mix(in_oklab,var(--primary)_8%,transparent)] text-foreground"
                : "border-border bg-card text-muted-foreground hover:border-primary/50 hover:text-foreground",
            )}
          >
            <span className="font-mono text-[9px] text-muted-foreground block mb-0.5">{i + 1}</span>
            <span className="font-medium">{opt}</span>
            {selected && <Check className="absolute top-2 right-2 h-3 w-3 text-primary" />}
          </button>
        );
      })}
    </div>
  );
}