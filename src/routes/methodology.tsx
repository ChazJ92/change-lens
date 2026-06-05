import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Wordmark, LensMark } from "@/components/brand";
import {
  ChevronRight,
  Compass,
  Database,
  Workflow,
  Cpu,
  Users,
  ShieldCheck,
  Activity,
  ArrowRight,
  FileText,
  MessageSquareQuote,
  ClipboardCheck,
  Gauge,
  Layers,
  ScanSearch,
  Target,
  GitBranch,
  Sparkles,
  Scale,
  ListChecks,
  Eye,
} from "lucide-react";

export const Route = createFileRoute("/methodology")({
  head: () => ({
    meta: [
      { title: "How the CORE7 Methodology Works — Transformation Readiness" },
      {
        name: "description",
        content:
          "CORE7 is an evidence-led transformation readiness methodology. Learn how profiling, structured assessment, evidence and tailored weighting produce a clear, explainable readiness view across seven critical domains.",
      },
      { property: "og:title", content: "How the CORE7 Methodology Works" },
      {
        property: "og:description",
        content:
          "An evidence-led transformation readiness methodology designed to help organisations understand, prioritise and act on the conditions required for successful change.",
      },
    ],
  }),
  component: MethodologyPage,
});

/* ---------------------------------------------------------------- */
/* Scroll reveal                                                    */
/* ---------------------------------------------------------------- */

function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.12 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? "none" : "translateY(16px)",
        transition: "opacity 0.7s ease, transform 0.7s ease",
        transitionDelay: `${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="eyebrow mb-3">{children}</p>;
}

function SectionHeading({
  eyebrow,
  title,
  lead,
  align = "left",
}: {
  eyebrow: string;
  title: string;
  lead?: string;
  align?: "left" | "center";
}) {
  return (
    <div className={align === "center" ? "max-w-[60ch] mx-auto text-center" : "max-w-[64ch]"}>
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2
        className="display text-[28px] md:text-[34px] leading-[1.12] tracking-[-0.018em]"
        style={{ color: "var(--ink)" }}
      >
        {title}
      </h2>
      {lead && <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">{lead}</p>}
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Data                                                             */
/* ---------------------------------------------------------------- */

const PILLARS = [
  {
    n: "01",
    icon: Compass,
    name: "Strategy & Leadership",
    body: "Assesses whether the change has clear strategic alignment, leadership ownership, direction and decision-making support.",
  },
  {
    n: "02",
    icon: Database,
    name: "Data Quality & Insight",
    body: "Assesses whether the organisation has the data, insight, quality, ownership and visibility needed to support the change.",
  },
  {
    n: "03",
    icon: Workflow,
    name: "Process Maturity",
    body: "Assesses whether key processes are understood, documented, owned and mature enough to support transformation.",
  },
  {
    n: "04",
    icon: Cpu,
    name: "Technology & Tooling",
    body: "Assesses whether the technology landscape, systems, integrations, architecture and tooling are ready for the change.",
  },
  {
    n: "05",
    icon: Users,
    name: "People & Capability",
    body: "Assesses whether the organisation has the skills, capacity, roles, behaviours and support needed to deliver and adopt the change.",
  },
  {
    n: "06",
    icon: ShieldCheck,
    name: "Governance & Risk",
    body: "Assesses whether decision rights, controls, accountability, assurance, risks and escalation routes are clear and effective.",
  },
  {
    n: "07",
    icon: Activity,
    name: "Organisational Adaptability",
    body: "Assesses whether the organisation has the cultural resilience, change capacity, adoption conditions and reinforcement mechanisms needed to sustain the change.",
  },
];

const PILLAR_SHORT = [
  "Strategy & Leadership",
  "Data Quality & Insight",
  "Process Maturity",
  "Technology & Tooling",
  "People & Capability",
  "Governance & Risk",
  "Organisational Adaptability",
];

/* Short, hover-friendly explanations keyed to each lens segment / pillar. */
const PILLAR_HINTS = [
  "Clear strategic alignment, leadership ownership and decision-making support.",
  "The data, insight, quality and visibility needed to support the change.",
  "Key processes understood, documented, owned and mature enough to transform.",
  "Systems, integrations, architecture and tooling ready for the change.",
  "The skills, capacity, roles and behaviours to deliver and adopt the change.",
  "Decision rights, controls, accountability and assurance that are clear and effective.",
  "Cultural resilience and change capacity to adopt and sustain the change.",
];

const FLOW = [
  { icon: Target, title: "Change Definition", body: "Capture the scope, intent and outcomes of the transformation in clear terms." },
  { icon: GitBranch, title: "Transformation Profiling", body: "Characterise the change to determine which readiness conditions matter most." },
  { icon: ScanSearch, title: "CORE7 Assessment", body: "Structured survey across the seven readiness pillars and their drivers." },
  { icon: FileText, title: "Evidence Review", body: "Validate responses against documentation and stakeholder perspectives." },
  { icon: Scale, title: "Scoring & Weighting", body: "Convert responses into driver, pillar and weighted readiness scores." },
  { icon: Gauge, title: "Readiness Intelligence", body: "Surface strengths, gaps, confidence and key risks across the picture." },
  { icon: ListChecks, title: "Action Plan & Recommendations", body: "Translate findings into prioritised, defensible next steps." },
];

const PROFILES = [
  {
    label: "AI implementation",
    emphasis: ["Data Quality & Insight", "Technology & Tooling", "Governance & Risk", "People & Capability"],
  },
  {
    label: "Operating model redesign",
    emphasis: ["Strategy & Leadership", "Process Maturity", "People & Capability", "Organisational Adaptability"],
  },
  {
    label: "Regulatory transformation",
    emphasis: ["Governance & Risk", "Process Maturity", "Data Quality & Insight", "Strategy & Leadership"],
  },
];

const SCORING = [
  { icon: ClipboardCheck, title: "Question Score", body: "Each survey response is scored using a defined maturity scale." },
  { icon: Layers, title: "Driver Score", body: "Related questions are grouped into readiness drivers. Driver scores show the specific strengths and weaknesses within each pillar." },
  { icon: Compass, title: "Pillar Score", body: "Driver scores are combined to create a score for each of the seven CORE7 pillars." },
  { icon: Scale, title: "Weighted Pillar Score", body: "Each pillar score is adjusted using the transformation profile weighting, so the final readiness view reflects the specific demands of the change." },
  { icon: Gauge, title: "Overall Readiness Score", body: "Weighted pillar scores are combined into an overall readiness position." },
];

const OUTPUTS = [
  { icon: Gauge, title: "Overall readiness rating" },
  { icon: Compass, title: "Seven pillar scores" },
  { icon: Layers, title: "Driver-level strengths and gaps" },
  { icon: ShieldCheck, title: "Evidence confidence ratings" },
  { icon: Activity, title: "Key risks" },
  { icon: ListChecks, title: "Recommended actions" },
  { icon: Target, title: "Priority areas" },
  { icon: FileText, title: "Executive summary" },
  { icon: ScanSearch, title: "Assessment trail for review and assurance" },
];

const EXPLAIN = [
  "Each score can be traced back to questions, drivers and pillars.",
  "Weightings are based on the transformation profile.",
  "Evidence strength is shown separately from readiness.",
  "AI supports analysis, but does not replace human judgement.",
  "Change Owners and Pillar Leads can review, challenge and finalise the assessment.",
];

const ROLES = [
  { title: "Change Owner", body: "Owns the assessment and reviews the final readiness position." },
  { title: "Pillar Lead", body: "Leads input and evidence review for one or more CORE7 pillars." },
  { title: "Contributor", body: "Provides survey responses, evidence or subject matter input." },
  { title: "Reviewer", body: "Reviews outputs, risks and recommendations before finalisation." },
];

/* ---------------------------------------------------------------- */
/* Page                                                             */
/* ---------------------------------------------------------------- */

function MethodologyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-30">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between px-6 md:px-8 py-4">
          <Link to="/">
            <Wordmark size="md" />
          </Link>
          <div className="flex items-center gap-6">
            <span className="eyebrow hidden md:inline">Methodology · CORE7 framework</span>
            <Button asChild size="sm" className="rounded-sm">
              <Link to="/app/assessments/new">Start an assessment</Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        {/* 1. Hero */}
        <section className="relative overflow-hidden border-b border-border">
          <div
            className="absolute inset-0 -z-10"
            style={{
              background:
                "radial-gradient(120% 90% at 85% 0%, color-mix(in oklab, var(--primary) 9%, transparent), transparent 60%)",
            }}
          />
          <div className="mx-auto max-w-[1200px] px-6 md:px-8 grid lg:grid-cols-[1.2fr_1fr] gap-14 items-center pt-20 pb-20 md:pt-28 md:pb-28">
            <Reveal>
              <p className="eyebrow mb-6">Enterprise transformation readiness</p>
              <h1
                className="display text-[40px] md:text-[58px] leading-[1.03] tracking-[-0.022em] max-w-[16ch]"
                style={{ color: "var(--ink)" }}
              >
                How the CORE7 Methodology Works
              </h1>
              <p className="mt-7 text-[17px] md:text-[19px] leading-relaxed max-w-[54ch] text-foreground/80">
                An evidence-led transformation readiness methodology designed to help organisations
                understand, prioritise and act on the conditions required for successful change.
              </p>
              <p className="mt-5 text-[15px] leading-relaxed max-w-[58ch] text-muted-foreground">
                CORE7 combines structured assessment, stakeholder insight, evidence validation and
                tailored weighting to produce a clear view of transformation readiness across seven
                critical domains.
              </p>
              <div className="mt-9 flex flex-wrap items-center gap-3">
                <Button asChild size="lg" className="rounded-sm h-11 px-5">
                  <Link to="/app/assessments/new">
                    Start an assessment <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="rounded-sm h-11 px-5">
                  <a href="#pillars">View the CORE7 pillars</a>
                </Button>
              </div>
            </Reveal>

            {/* Lens visual */}
            <Reveal delay={120} className="hidden lg:block">
              <div className="relative border border-border bg-card aspect-square overflow-hidden rounded-sm shadow-[0_24px_60px_-32px_color-mix(in_oklab,var(--ink)_45%,transparent)]">
                <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
                  <span className="eyebrow">CORE7 · Readiness lens</span>
                  <span className="font-mono text-[10px] text-muted-foreground">v1.0</span>
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <LensMark size={240} interactive />
                </div>
                <div className="absolute bottom-0 left-0 right-0 border-t border-border grid grid-cols-7 text-center">
                  {["Strategy", "Data", "Process", "Tech", "People", "Govern.", "Adapt."].map((d) => (
                    <div
                      key={d}
                      className="px-1 py-2.5 border-r border-border last:border-r-0 text-[8px] font-mono uppercase tracking-wider text-muted-foreground"
                    >
                      {d}
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* Why it exists */}
        <section className="border-b border-border bg-card">
          <div className="mx-auto max-w-[1200px] px-6 md:px-8 py-16 md:py-20 grid md:grid-cols-[1fr_1.3fr] gap-12">
            <Reveal>
              <SectionHeading
                eyebrow="Why CORE7 exists"
                title="Most change fails on readiness, not ambition."
              />
            </Reveal>
            <Reveal delay={100}>
              <div className="space-y-5 text-[15px] leading-relaxed text-muted-foreground max-w-[60ch]">
                <p>
                  Complex transformation rarely fails because the strategy is wrong. It fails because
                  the organisation was not ready to deliver, adopt, sustain and govern the change. The
                  conditions for success were assumed rather than evidenced.
                </p>
                <p>
                  CORE7 is an evidence-led readiness methodology for complex change. It replaces
                  opinion-led confidence with a structured, defensible view of where an organisation
                  truly stands — and what it must address before committing.
                </p>
                <p className="text-foreground">
                  The result is a clear, explainable readiness picture senior leaders can trust,
                  challenge and act on.
                </p>
              </div>
            </Reveal>
          </div>
        </section>

        {/* 2. Methodology overview */}
        <section className="border-b border-border">
          <div className="mx-auto max-w-[1200px] px-6 md:px-8 py-16 md:py-24">
            <Reveal>
              <SectionHeading
                eyebrow="End-to-end methodology"
                title="From change definition to action plan"
                lead="CORE7 follows a structured, repeatable path. Each stage builds on the last, so the final readiness view is traceable back to its inputs."
              />
            </Reveal>
            <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {FLOW.map((stage, i) => (
                <Reveal key={stage.title} delay={i * 70}>
                  <div className="relative h-full border border-border bg-card rounded-sm p-5">
                    <div className="flex items-center justify-between">
                      <div
                        className="h-9 w-9 rounded-sm flex items-center justify-center"
                        style={{ background: "color-mix(in oklab, var(--primary) 10%, transparent)" }}
                      >
                        <stage.icon className="h-5 w-5" style={{ color: "var(--primary)" }} />
                      </div>
                      <span className="font-mono text-[11px] text-muted-foreground">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                    </div>
                    <h3 className="mt-4 text-[15px] font-semibold tracking-tight" style={{ color: "var(--ink)" }}>
                      {stage.title}
                    </h3>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">{stage.body}</p>
                    {i < FLOW.length - 1 && (
                      <ChevronRight className="hidden lg:block absolute -right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-border" />
                    )}
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* 3. Seven pillars */}
        <section id="pillars" className="border-b border-border bg-card scroll-mt-20">
          <div className="mx-auto max-w-[1200px] px-6 md:px-8 py-16 md:py-24">
            <Reveal>
              <SectionHeading
                eyebrow="The framework"
                title="The seven CORE7 readiness pillars"
                lead="Together, the seven pillars describe whether an organisation can deliver, adopt, sustain and govern transformation. Each pillar is assessed across its own set of readiness drivers."
              />
            </Reveal>
            <div className="mt-12 grid gap-px bg-border rounded-sm overflow-hidden sm:grid-cols-2 lg:grid-cols-3">
              {PILLARS.map((p, i) => (
                <Reveal key={p.name} delay={(i % 3) * 70} className="h-full">
                  <div className="group h-full bg-card p-6 transition-colors hover:bg-secondary/40">
                    <div className="flex items-center justify-between">
                      <div
                        className="h-10 w-10 rounded-sm flex items-center justify-center border border-border"
                        style={{ background: "color-mix(in oklab, var(--primary) 8%, transparent)" }}
                      >
                        <p.icon className="h-5 w-5" style={{ color: "var(--primary)" }} />
                      </div>
                      <span className="font-mono text-[12px] tracking-wider text-muted-foreground">{p.n}</span>
                    </div>
                    <h3 className="mt-5 text-[16px] font-semibold tracking-tight" style={{ color: "var(--ink)" }}>
                      {p.name}
                    </h3>
                    <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">{p.body}</p>
                  </div>
                </Reveal>
              ))}
              <div className="hidden lg:flex bg-card p-6 items-center">
                <div>
                  <LensMark size={40} />
                  <p className="mt-4 text-[13px] leading-relaxed text-muted-foreground max-w-[28ch]">
                    One lens, seven domains — assessed consistently, weighted to the change.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 4. Transformation profiling */}
        <section className="border-b border-border">
          <div className="mx-auto max-w-[1200px] px-6 md:px-8 py-16 md:py-24">
            <Reveal>
              <SectionHeading
                eyebrow="Transformation profiling"
                title="Not every change demands the same readiness"
                lead="Before readiness is assessed, CORE7 profiles the nature of the change. This identifies which readiness conditions are most critical for that specific transformation."
              />
            </Reveal>

            <div className="mt-12 grid gap-6 lg:grid-cols-3">
              {PROFILES.map((profile, i) => (
                <Reveal key={profile.label} delay={i * 90}>
                  <div className="h-full border border-border bg-card rounded-sm p-6">
                    <div className="flex items-center gap-2">
                      <GitBranch className="h-4 w-4" style={{ color: "var(--primary)" }} />
                      <h3 className="text-[15px] font-semibold tracking-tight" style={{ color: "var(--ink)" }}>
                        {profile.label}
                      </h3>
                    </div>
                    <p className="mt-1 text-[11px] font-mono uppercase tracking-[0.14em] text-muted-foreground">
                      Higher emphasis
                    </p>
                    <div className="mt-4 space-y-2.5">
                      {PILLAR_SHORT.map((name) => {
                        const active = profile.emphasis.includes(name);
                        return (
                          <div key={name} className="flex items-center gap-3">
                            <span className="w-[150px] shrink-0 text-[12px] text-muted-foreground truncate">{name}</span>
                            <div className="h-2 flex-1 rounded-full bg-secondary overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: active ? "92%" : "34%",
                                  background: active
                                    ? "var(--primary)"
                                    : "color-mix(in oklab, var(--muted-foreground) 30%, transparent)",
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>

            <Reveal delay={120}>
              <div
                className="mt-8 flex gap-3 rounded-sm border-l-2 bg-secondary/40 p-5"
                style={{ borderColor: "var(--primary)" }}
              >
                <Sparkles className="h-4 w-4 mt-0.5 shrink-0" style={{ color: "var(--primary)" }} />
                <p className="text-[14px] leading-relaxed text-muted-foreground max-w-[80ch]">
                  Transformation profiling measures the characteristics of the change, not whether the
                  organisation is ready. It determines the weighting profile used in the subsequent
                  readiness assessment.
                </p>
              </div>
            </Reveal>
          </div>
        </section>

        {/* 5. Scoring logic */}
        <section className="border-b border-border bg-card">
          <div className="mx-auto max-w-[1200px] px-6 md:px-8 py-16 md:py-24">
            <Reveal>
              <SectionHeading
                eyebrow="Scoring logic"
                title="How answers become a readiness view"
                lead="Scores build up through a clear hierarchy. Nothing is hidden — every level can be opened up and examined."
              />
            </Reveal>

            <div className="mt-12 grid gap-6 lg:grid-cols-[1.1fr_0.9fr] items-start">
              {/* Hierarchy steps */}
              <Reveal>
                <ol className="relative space-y-0">
                  {SCORING.map((s, i) => (
                    <li key={s.title} className="relative flex gap-4 pb-7 last:pb-0">
                      {i < SCORING.length - 1 && (
                        <span className="absolute left-[19px] top-10 bottom-0 w-px bg-border" />
                      )}
                      <div
                        className="relative z-10 h-10 w-10 shrink-0 rounded-sm flex items-center justify-center border border-border bg-card"
                        style={{ background: "color-mix(in oklab, var(--primary) 8%, transparent)" }}
                      >
                        <s.icon className="h-5 w-5" style={{ color: "var(--primary)" }} />
                      </div>
                      <div className="pt-1">
                        <h3 className="text-[15px] font-semibold tracking-tight" style={{ color: "var(--ink)" }}>
                          {s.title}
                        </h3>
                        <p className="mt-1 text-[13.5px] leading-relaxed text-muted-foreground max-w-[52ch]">{s.body}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </Reveal>

              {/* Formula visual */}
              <Reveal delay={120}>
                <div className="lg:sticky lg:top-24 border border-border rounded-sm bg-background p-6">
                  <p className="eyebrow mb-4">The pipeline</p>
                  <div className="space-y-2.5">
                    {[
                      "Question responses",
                      "Driver scores",
                      "Pillar scores",
                      "Weighted readiness score",
                      "Readiness rating",
                    ].map((step, i, arr) => (
                      <div key={step}>
                        <div
                          className="rounded-sm px-4 py-3 text-[13px] font-medium border"
                          style={{
                            color: i === arr.length - 1 ? "var(--primary-foreground)" : "var(--ink)",
                            background:
                              i === arr.length - 1
                                ? "var(--primary)"
                                : `color-mix(in oklab, var(--primary) ${4 + i * 4}%, var(--card))`,
                            borderColor:
                              i === arr.length - 1
                                ? "var(--primary)"
                                : "color-mix(in oklab, var(--primary) 18%, transparent)",
                          }}
                        >
                          {step}
                        </div>
                        {i < arr.length - 1 && (
                          <div className="flex justify-center py-1 text-muted-foreground">
                            <ChevronRight className="h-4 w-4 rotate-90" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* 6. Evidence and confidence */}
        <section className="border-b border-border">
          <div className="mx-auto max-w-[1200px] px-6 md:px-8 py-16 md:py-24">
            <Reveal>
              <SectionHeading
                eyebrow="Evidence & confidence"
                title="Readiness isn't just an opinion poll"
                lead="CORE7 does not rely only on perception-based survey answers. Every readiness view is triangulated across three inputs and qualified by a confidence rating."
              />
            </Reveal>

            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {[
                { icon: ClipboardCheck, t: "Structured survey responses", b: "A consistent maturity scale applied across drivers and pillars." },
                { icon: FileText, t: "Supporting evidence and documentation", b: "Artefacts that substantiate — or challenge — what responses claim." },
                { icon: MessageSquareQuote, t: "Stakeholder perspectives and review", b: "Subject-matter input and reviewer judgement across the organisation." },
              ].map((c, i) => (
                <Reveal key={c.t} delay={i * 90}>
                  <div className="h-full border border-border bg-card rounded-sm p-6">
                    <c.icon className="h-5 w-5" style={{ color: "var(--primary)" }} />
                    <h3 className="mt-4 text-[15px] font-semibold tracking-tight" style={{ color: "var(--ink)" }}>
                      {c.t}
                    </h3>
                    <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">{c.b}</p>
                  </div>
                </Reveal>
              ))}
            </div>

            <div className="mt-8 grid gap-6 lg:grid-cols-[1.3fr_0.7fr] items-stretch">
              <Reveal>
                <div className="h-full border border-border bg-card rounded-sm p-6 space-y-4">
                  <p className="text-[14px] leading-relaxed text-muted-foreground">
                    Confidence ratings indicate how well-supported a score is — so leaders know how much
                    trust to place in each finding.
                  </p>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="rounded-sm border border-border p-4">
                      <div className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--warning)" }} />
                        <span className="text-[12px] font-mono uppercase tracking-wider text-muted-foreground">
                          High score · Low confidence
                        </span>
                      </div>
                      <p className="mt-2 text-[13.5px] leading-relaxed">
                        A pillar may score highly, but have low confidence if evidence is weak or incomplete.
                      </p>
                    </div>
                    <div className="rounded-sm border border-border p-4">
                      <div className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--success)" }} />
                        <span className="text-[12px] font-mono uppercase tracking-wider text-muted-foreground">
                          Moderate score · High confidence
                        </span>
                      </div>
                      <p className="mt-2 text-[13.5px] leading-relaxed">
                        A pillar may score moderately, but have high confidence if the evidence is strong
                        and consistent.
                      </p>
                    </div>
                  </div>
                </div>
              </Reveal>
              <Reveal delay={120}>
                <div
                  className="h-full rounded-sm p-6 flex flex-col justify-center"
                  style={{ background: "var(--sidebar)", color: "var(--sidebar-foreground)" }}
                >
                  <Eye className="h-5 w-5" style={{ color: "var(--sidebar-foreground)" }} />
                  <p className="mt-4 text-[15px] leading-relaxed">
                    <span className="font-semibold">Score</span> tells you what the assessment indicates.
                  </p>
                  <p className="mt-2 text-[15px] leading-relaxed">
                    <span className="font-semibold">Confidence</span> tells you how much trust to place in
                    that score.
                  </p>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* 7. Readiness outputs */}
        <section className="border-b border-border bg-card">
          <div className="mx-auto max-w-[1200px] px-6 md:px-8 py-16 md:py-24">
            <Reveal>
              <SectionHeading
                eyebrow="What you receive"
                title="A complete readiness intelligence picture"
                lead="Every assessment produces a layered, boardroom-ready set of outputs — from a single headline rating down to a full assurance trail."
              />
            </Reveal>
            <div className="mt-12 grid gap-px bg-border rounded-sm overflow-hidden sm:grid-cols-2 lg:grid-cols-3">
              {OUTPUTS.map((o, i) => (
                <Reveal key={o.title} delay={(i % 3) * 60} className="h-full">
                  <div className="h-full bg-card p-5 flex items-start gap-3">
                    <o.icon className="h-5 w-5 mt-0.5 shrink-0" style={{ color: "var(--primary)" }} />
                    <span className="text-[14px] font-medium" style={{ color: "var(--ink)" }}>
                      {o.title}
                    </span>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* 8. Explainability */}
        <section className="border-b border-border">
          <div className="mx-auto max-w-[1200px] px-6 md:px-8 py-16 md:py-24 grid lg:grid-cols-[1fr_1.2fr] gap-12">
            <Reveal>
              <SectionHeading
                eyebrow="Explainable by design"
                title="Not a black-box score"
                lead="CORE7 is built to be challenged. Every output is traceable, every weighting is justified, and human judgement stays in control."
              />
            </Reveal>
            <Reveal delay={100}>
              <ul className="space-y-px bg-border rounded-sm overflow-hidden">
                {EXPLAIN.map((point) => (
                  <li key={point} className="bg-card p-5 flex items-start gap-3">
                    <span
                      className="mt-1 h-5 w-5 shrink-0 rounded-sm flex items-center justify-center"
                      style={{ background: "color-mix(in oklab, var(--primary) 12%, transparent)" }}
                    >
                      <ShieldCheck className="h-3.5 w-3.5" style={{ color: "var(--primary)" }} />
                    </span>
                    <span className="text-[14.5px] leading-relaxed text-foreground/90">{point}</span>
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
        </section>

        {/* 9. Roles */}
        <section className="border-b border-border bg-card">
          <div className="mx-auto max-w-[1200px] px-6 md:px-8 py-16 md:py-24">
            <Reveal>
              <SectionHeading
                eyebrow="The human workflow"
                title="Clear roles, shared accountability"
                lead="CORE7 is delivered by people, supported by the platform. Each role has a defined part in producing a defensible result."
              />
            </Reveal>
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {ROLES.map((r, i) => (
                <Reveal key={r.title} delay={i * 80}>
                  <div className="h-full border border-border bg-background rounded-sm p-6">
                    <span className="font-mono text-[12px] text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                    <h3 className="mt-3 text-[16px] font-semibold tracking-tight" style={{ color: "var(--ink)" }}>
                      {r.title}
                    </h3>
                    <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">{r.body}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* 10. Final CTA */}
        <section
          className="relative overflow-hidden"
          style={{ background: "var(--sidebar)", color: "var(--sidebar-foreground)" }}
        >
          <div
            className="absolute inset-0 -z-0 opacity-60"
            style={{
              background:
                "radial-gradient(90% 120% at 100% 0%, color-mix(in oklab, var(--primary) 38%, transparent), transparent 55%)",
            }}
          />
          <div className="relative mx-auto max-w-[1200px] px-6 md:px-8 py-20 md:py-28 text-center">
            <Reveal>
              <LensMark size={48} tone="inverse" className="mx-auto" />
              <h2 className="mt-7 display text-[34px] md:text-[44px] leading-[1.06] tracking-[-0.02em]">
                From assessment to action
              </h2>
              <p className="mt-6 mx-auto max-w-[62ch] text-[16px] md:text-[17px] leading-relaxed text-[color-mix(in_oklab,var(--sidebar-foreground)_82%,transparent)]">
                CORE7 turns complex transformation readiness into a structured, explainable and
                evidence-led view of what matters most, where the organisation is exposed, and what
                leaders should do next.
              </p>
              <div className="mt-9 flex justify-center">
                <Button asChild size="lg" className="rounded-sm h-12 px-6">
                  <Link to="/app/assessments/new">
                    Create a CORE7 assessment <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-card">
        <div className="mx-auto max-w-[1200px] px-6 md:px-8 py-8 flex flex-wrap items-center justify-between gap-4">
          <Link to="/">
            <Wordmark size="sm" />
          </Link>
          <Link
            to="/methodology"
            className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground transition-colors"
          >
            © ChangeLens · Powered by the CORE7 framework
          </Link>
        </div>
      </footer>
    </div>
  );
}