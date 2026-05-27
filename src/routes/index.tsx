import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CORE7 — Enterprise Transformation Readiness" },
      { name: "description", content: "CORE7 assesses enterprise transformation readiness across seven domains with explainable AI and mandatory human review." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-8 py-5">
          <div className="flex items-center gap-3">
            <div className="h-7 w-7" style={{ background: "var(--navy)" }} />
            <span className="font-mono text-sm font-medium tracking-wider">CORE7</span>
          </div>
          <span className="eyebrow">Transformation Readiness Platform</span>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-8 py-20">
        <p className="eyebrow mb-6">Phase 1 — Foundation</p>
        <h1 className="max-w-3xl text-5xl font-semibold leading-[1.05] tracking-tight" style={{ color: "var(--navy)" }}>
          Assess enterprise transformation readiness across seven domains.
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
          Strategy &amp; Leadership · Data Quality &amp; Insight · Process Maturity · Technology &amp; Tooling · People &amp; Capability · Governance &amp; Risk · Organisational Adaptability.
        </p>
        <section className="mt-16 grid gap-12 border-t border-border pt-12 md:grid-cols-2">
          <div>
            <p className="eyebrow mb-3">What is built</p>
            <ul className="space-y-2 text-sm">
              <li>· Full Postgres schema for organisations, assessments, the seven pillars, questions, responses, surveys, evidence, AI jobs, recommendations, risks, reviews, score overrides and audit logs.</li>
              <li>· Per-organisation BYOK AI settings (OpenAI by default; provider abstraction ready for Anthropic and Gemini).</li>
              <li>· Row-level security across every table, scoped to organisation membership.</li>
              <li>· Seeded 7 pillars, default weights, and a starter question per subdimension (35 in total).</li>
              <li>· Polished demo organisation <span className="font-mono">Northwind Industrials</span> with a fully populated ERP &amp; Operating Model Modernisation assessment — realistic AI rationale, evidence considered, missing evidence, next actions, risks, recommendations, reviewer comments and audit trail.</li>
              <li>· Boardroom design system: IBM Plex Sans / Mono, ivory background, graphite text, deep teal accent, print-friendly base.</li>
            </ul>
          </div>
          <div>
            <p className="eyebrow mb-3">What is next</p>
            <ul className="space-y-2 text-sm">
              <li>· Authentication (email/password + Google) and personal-workspace bootstrapping on sign-up.</li>
              <li>· Organisation dashboard, assessment overview, pillar detail page.</li>
              <li>· Opinionated 3-step assessment creation flow.</li>
              <li>· Tokenised stakeholder survey experience.</li>
              <li>· Reviewer queue with approve / request changes / override (mandatory rationale).</li>
              <li>· Print-optimised final report.</li>
              <li>· BYOK AI settings UI, key verification edge function, async AI worker, evidence ingestion.</li>
              <li>· Admin audit-log viewer and role management.</li>
            </ul>
          </div>
        </section>
        <section className="mt-16 border-t border-border pt-8">
          <p className="text-sm text-muted-foreground">
            Backend foundation and design system are in place. Reply <span className="font-mono">continue</span> to build the authenticated app shell, dashboard and full assessment workflow on top of this schema.
          </p>
        </section>
      </main>
    </div>
  );
}
