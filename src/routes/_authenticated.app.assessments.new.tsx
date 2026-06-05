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
import { ArrowRight, Sparkles, Radar, Save, CheckCircle2 } from "lucide-react";
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

function NewAssessment() {
  const { user } = useAuth();
  const { data: orgData } = useCurrentOrg();
  const orgId = orgData?.current?.id;
  const navigate = useNavigate();
  const qc = useQueryClient();

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

  const create = useMutation({
    mutationFn: async () => {
      if (!orgId) throw new Error("No organisation");
      const a = repo.assessments.create({
        organisation_id: orgId,
        name: form.title,
        description: form.description || null,
        transformation_profile: emerging[0]?.name ?? "Digital",
        scope_level: "Business unit",
        complexity_level: "Medium",
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
                const active = i === 0;
                const done = false;
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
                  <Button onClick={() => create.mutate()} disabled={!canAdvance || create.isPending}>
                    {create.isPending ? "Creating…" : "Begin profiling survey"}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-muted-foreground border-l-2 border-primary pl-3 max-w-2xl">
              Next, a short profiling survey (23 characteristic signals) refines the CORE7 weighting shown on the right. The readiness assessment itself comes afterwards, tailored to this profile.
            </p>
          </div>

          {/* ---- Intelligence rail ---- */}
          <aside className="lg:sticky lg:top-6 self-start space-y-4">
            <div className="rounded-sm border border-border bg-card overflow-hidden">
              <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.14em] text-muted-foreground">
                  <Radar className="h-3.5 w-3.5 text-primary" /> Intelligence
                </div>
                <span className="text-[10px] font-mono text-muted-foreground">{progress}%</span>
              </div>

              {/* Progress */}
              <div className="px-5 py-4 border-b border-border">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-2">
                  <span>Profile progress</span>
                  <span className="font-mono">{filled}/3 inputs</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
                  <div className="h-full bg-primary transition-all duration-500" style={{ width: `${progress}%` }} />
                </div>
              </div>

              {/* Emerging CORE7 profile */}
              <div className="px-5 py-4 border-b border-border">
                <div className="flex items-center gap-3 mb-3">
                  <LensMark size={36} />
                  <div>
                    <div className="text-[13px] font-medium" style={{ color: "var(--ink)" }}>Emerging CORE7 profile</div>
                    <div className="text-[11px] text-muted-foreground">Live weighting preview</div>
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
              {canAdvance ? "Draft held locally — saved on profile creation" : "Draft not started"}
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