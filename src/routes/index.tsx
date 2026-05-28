import { createFileRoute } from "@tanstack/react-router";
import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Wordmark, LensMark } from "@/components/brand";
import { ShieldCheck, FileText, GitBranch, ScanSearch, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ChangeLens — Evidence-led readiness for complex change" },
      { name: "description", content: "ChangeLens is an enterprise transformation readiness intelligence platform powered by the CORE7 framework. Evidence-led scoring, mandatory human review, full governance traceability." },
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
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between px-8 py-4">
          <Wordmark size="md" />
          <div className="flex items-center gap-6">
            <span className="eyebrow hidden md:inline">Strategic assurance · CORE7 framework</span>
            <Button asChild size="sm" variant="outline" className="rounded-sm">
              <Link to="/app">Open workspace</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1200px] px-8">
        {/* Hero — restrained, editorial */}
        <section className="pt-24 pb-20 grid lg:grid-cols-[1.15fr_1fr] gap-16 items-start border-b border-border">
          <div>
            <p className="eyebrow mb-8">Enterprise transformation readiness intelligence</p>
            <h1
              className="display text-[44px] md:text-[56px] leading-[1.04] tracking-[-0.02em] max-w-[18ch]"
              style={{ color: "var(--ink)" }}
            >
              Evidence-led readiness for complex change.
            </h1>
            <p className="mt-7 text-[15px] leading-relaxed max-w-[52ch] text-muted-foreground">
              ChangeLens is the strategic assurance platform transformation leaders use
              to score readiness, govern decisions, and defend recommendations with
              traceable evidence — across the seven CORE7 domains.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Button asChild size="lg" className="rounded-sm h-11 px-5">
                <Link to="/app">Enter workspace <ChevronRight className="h-4 w-4" /></Link>
              </Button>
            </div>
            <div className="mt-10 flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.18em] text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5" />
              Mandatory human review · Full audit trail · BYOK AI
            </div>
          </div>

          {/* Framework lens — abstract, structural */}
          <div className="hidden lg:block">
            <div className="border border-border bg-card aspect-[5/6] relative overflow-hidden">
              <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
                <span className="eyebrow">CORE7 · Readiness lens</span>
                <span className="font-mono text-[10px] text-muted-foreground">v1.0</span>
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <LensMark size={260} />
              </div>
              <div className="absolute bottom-0 left-0 right-0 border-t border-border grid grid-cols-7 text-center">
                {["Strategy", "Data", "Process", "Tech", "People", "Governance", "Adaptability"].map((d) => (
                  <div key={d} className="px-1 py-2.5 border-r border-border last:border-r-0 text-[9px] font-mono uppercase tracking-wider text-muted-foreground">
                    {d}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Capability stripes */}
        <section className="grid md:grid-cols-3 border-b border-border">
          {[
            { icon: ScanSearch, title: "Structured assessment", body: "An opinionated workflow across all seven CORE7 domains. Weighted scoring, readiness bands, confidence index — deterministic and explainable." },
            { icon: ShieldCheck, title: "Governance built-in", body: "Mandatory reviewer sign-off before any score is finalised. Evidence quality, rationale visibility, and reviewer alignment surfaced on every pillar." },
            { icon: FileText, title: "Boardroom-ready output", body: "Layered summaries, evidence traceability, and printable executive reports. Defensible decisions, not just dashboards." },
          ].map((c, i) => (
            <div key={c.title} className={`p-8 ${i < 2 ? "md:border-r border-border" : ""} ${i > 0 ? "border-t md:border-t-0 border-border" : ""}`}>
              <c.icon className="h-5 w-5" style={{ color: "var(--primary)" }} />
              <h3 className="mt-4 text-[15px] font-semibold tracking-tight" style={{ color: "var(--ink)" }}>{c.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{c.body}</p>
            </div>
          ))}
        </section>

        {/* Differentiator block — confidence + evidence */}
        <section className="py-20 grid md:grid-cols-[1fr_1.4fr] gap-16">
          <div>
            <p className="eyebrow mb-4">What makes it credible</p>
            <h2 className="display text-[30px] leading-[1.15] tracking-tight max-w-[22ch]" style={{ color: "var(--ink)" }}>
              Most readiness products stop at scores. ChangeLens shows the work behind them.
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-6">
            {[
              ["Evidence quality", "Every pillar is anchored in uploaded artefacts and stakeholder input, weighted by source."],
              ["Confidence levels", "A per-pillar confidence index makes thin evidence visible before decisions are made."],
              ["Reviewer alignment", "Side-by-side AI rationale and reviewer notes, with a single source of truth on what was approved."],
              ["Governance traceability", "Full audit trail from raw evidence to boardroom score, ready for assurance review."],
            ].map(([t, b]) => (
              <div key={t as string} className="border-l-2 pl-4" style={{ borderColor: "var(--primary)" }}>
                <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-muted-foreground">{t}</div>
                <p className="mt-2 text-sm leading-relaxed">{b}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Demo strip */}
        <section className="border-t border-border py-10 flex flex-wrap items-center justify-between gap-6">
          <div>
            <p className="eyebrow mb-1.5">Try the platform</p>
            <p className="text-sm text-muted-foreground max-w-xl">
              New accounts are added to <span className="font-mono text-foreground">Northwind Industrials</span>, a fully-populated demo organisation with a worked ERP &amp; operating model assessment.
            </p>
          </div>
          <Button asChild className="rounded-sm">
            <Link to="/app">Open the demo workspace <ChevronRight className="h-4 w-4" /></Link>
          </Button>
        </section>
      </main>

      <footer className="border-t border-border bg-card mt-8">
        <div className="mx-auto max-w-[1200px] px-8 py-8 flex flex-wrap items-center justify-between gap-4">
          <Wordmark size="sm" />
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            © ChangeLens · Powered by the CORE7 framework
          </p>
        </div>
      </footer>
    </div>
  );
}
