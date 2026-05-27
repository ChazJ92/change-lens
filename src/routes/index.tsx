import { createFileRoute } from "@tanstack/react-router";
import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

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
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (!loading && user) navigate({ to: "/app" });
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-8 py-5">
          <div className="flex items-center gap-3">
            <div className="h-7 w-7" style={{ background: "var(--navy)" }} />
            <span className="font-mono text-sm font-medium tracking-wider">CORE7</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="eyebrow hidden sm:inline">Transformation Readiness Platform</span>
            <Button asChild size="sm" variant="outline"><Link to="/login">Sign in</Link></Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-8 py-20">
        <p className="eyebrow mb-6">Enterprise transformation readiness</p>
        <h1 className="max-w-3xl text-5xl font-semibold leading-[1.05] tracking-tight" style={{ color: "var(--navy)" }}>
          Assess enterprise transformation readiness across seven domains.
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
          Strategy &amp; Leadership · Data Quality &amp; Insight · Process Maturity · Technology &amp; Tooling · People &amp; Capability · Governance &amp; Risk · Organisational Adaptability.
        </p>
        <div className="mt-8 flex gap-3">
          <Button asChild size="lg"><Link to="/login">Sign in to your workspace</Link></Button>
          <Button asChild size="lg" variant="outline"><Link to="/login" search={{ mode: "signup" } as never}>Create account</Link></Button>
        </div>
        <section className="mt-16 grid gap-12 border-t border-border pt-12 md:grid-cols-2">
          <div>
            <p className="eyebrow mb-3">What you get</p>
            <ul className="space-y-2 text-sm">
              <li>· An opinionated assessment workflow across all seven CORE7 domains.</li>
              <li>· Deterministic weighted scoring, readiness bands and confidence index.</li>
              <li>· Mandatory human review before any score is finalised.</li>
              <li>· BYOK AI: bring your own OpenAI key, per organisation. Anthropic and Gemini ready behind the same interface.</li>
              <li>· Stakeholder surveys, evidence library and full audit trail.</li>
              <li>· Boardroom-ready printable report.</li>
            </ul>
          </div>
          <div>
            <p className="eyebrow mb-3">Try the demo</p>
            <ul className="space-y-2 text-sm">
              <li>· Every new account is added to <span className="font-mono">Northwind Industrials</span>, our demo organisation.</li>
              <li>· Explore a fully populated <em>ERP &amp; Operating Model Modernisation</em> assessment with realistic AI rationale, risks, recommendations and reviewer notes.</li>
              <li>· Create your own assessment in three steps and walk through the full pillar workflow.</li>
            </ul>
          </div>
        </section>
      </main>
    </div>
  );
}
