import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { mockRepositories as repo } from "@/lib/mock";
import { PageHeader, StatusChip } from "@/components/app-shell";
import { weightedOverall, readinessBand, mapScore, fmtDate, fmtRelative, PILLAR_STATUS_LABELS, ASSESSMENT_STATUS_LABELS, confidenceFromLabel } from "@/lib/scoring";
import { pillarLabel, formatWeightPct } from "@/lib/pillars";
import { ArrowRight, AlertTriangle, Lightbulb, FileWarning, Printer, FileBarChart2, Sparkles, Layers3 } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/app/assessments/$id")({
  component: AssessmentOverview,
});

// Parse the compact profile summary persisted by the profiling flow, e.g.
// "Technology & Tooling (38%)" → { lead, weight }. Falls back gracefully.
function parseProfile(s?: string | null) {
  if (!s) return { lead: null as string | null, weight: null as number | null };
  const m = s.match(/^(.*?)\s*\((\d+)%\)\s*$/);
  if (m) return { lead: m[1].trim(), weight: Number(m[2]) };
  return { lead: s, weight: null as number | null };
}

function AssessmentOverview() {
  const { id } = Route.useParams();

  const { data, isLoading } = useQuery({
    queryKey: ["assessment", id],
    queryFn: async () => {
      return {
        a: repo.assessments.get(id),
        pa: repo.pillarAssessments.listByAssessment(id),
        p: repo.pillars.list(),
        risks: repo.risks.listByAssessment(id),
        recs: repo.recommendations.listByAssessment(id),
        act: repo.activity.listByAssessment(id, 10),
      };
    },
  });

  if (isLoading || !data?.a) return <div className="p-8 text-sm text-muted-foreground">Loading assessment…</div>;

  const { a, pa, p, risks, recs, act } = data;
  // Effective pillar weight = assessment-level override when set, otherwise the
  // global seeded default. New assessments persist equal weights as overrides,
  // while existing assessments keep their original weighting.
  const effWeight = (pillarId: string) => {
    const row = pa.find((x: any) => x.pillar_id === pillarId);
    const pp = p.find((x: any) => x.id === pillarId);
    return Number(row?.weight_override ?? pp?.default_weight ?? 0);
  };
  const scoreRows = pa.map((row: any) => {
    const pp = p.find((x: any) => x.id === row.pillar_id);
    return { score: row.final_score ?? row.provisional_score, weight: Number(pp?.default_weight ?? 0), weight_override: row.weight_override };
  });
  const overall = weightedOverall(scoreRows);
  const band = readinessBand(overall);
  const confAvg = pa.length ? Math.round(pa.reduce((s: number, r: any) => s + confidenceFromLabel(r.confidence), 0) / pa.length) : 0;
  const missingCount = pa.filter((r: any) => (r.ai_missing_evidence?.length ?? 0) > 0).reduce((s: number, r: any) => s + (r.ai_missing_evidence?.length ?? 0), 0);

  const statusTone = a.status === "complete" ? "success" : a.status === "in_review" ? "warning" : "info";

  const profile = parseProfile(a.transformation_profile);
  const topPillars = [...p]
    .map((x: any) => ({ ...x, eff: effWeight(x.id) }))
    .sort((x: any, y: any) => y.eff - x.eff)
    .slice(0, 3);
  const maxPillarWeight = Math.max(1, ...topPillars.map((x: any) => x.eff));
  const complexityLabel = a.complexity_level ?? "—";

  return (
    <>
      <PageHeader
        eyebrow={`${a.transformation_profile ?? "Transformation"} · ${a.business_area ?? "—"}`}
        title={a.name}
        description={a.description ?? undefined}
        actions={
          <>
            <StatusChip label={ASSESSMENT_STATUS_LABELS[a.status]} tone={statusTone} />
            <Button asChild variant="outline" size="sm">
              <Link to="/app/reports/$id" params={{ id }}><FileBarChart2 className="h-3.5 w-3.5" /> Final report</Link>
            </Button>
            <Button variant="ghost" size="sm" onClick={() => window.print()}><Printer className="h-3.5 w-3.5" /> Print</Button>
          </>
        }
      >
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-4 gap-3">
          <div className="border border-border rounded-sm bg-card p-5 lg:col-span-2">
            <div className="eyebrow mb-2">Overall readiness</div>
            <div className="flex items-end gap-3">
              <div className="text-5xl font-semibold font-mono tracking-tight" style={{ color: "var(--navy)" }}>{overall ?? "—"}</div>
              <div className="text-sm text-muted-foreground font-mono pb-2">/100</div>
              <div className="ml-auto pb-2"><StatusChip label={band.label} tone={band.tone} /></div>
            </div>
            <div className="mt-3 h-1.5 bg-secondary rounded-sm overflow-hidden">
              <div className="h-full bg-primary" style={{ width: `${overall ?? 0}%` }} />
            </div>
            <p className="mt-3 text-[11px] text-muted-foreground leading-snug">
              {overall == null
                ? "Awaiting readiness assessment — the transformation profile sets the lens, not the score."
                : "Weighted across the CORE7 pillars from completed readiness assessment."}
            </p>
          </div>
          <KpiBlock label="Confidence index" value={confAvg ? `${confAvg}` : "—"} sub={confAvg > 80 ? "High" : confAvg > 60 ? "Moderate" : "Low"} />
          <KpiBlock label="Open risks" value={String(risks.filter((r: any) => r.severity === "high" || r.severity === "critical").length)} sub={`${risks.length} total`} />
        </div>
        <div className="mt-3 grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Meta label="Scope" value={a.scope_level ?? "—"} />
          <Meta label="Complexity" value={a.complexity_level ?? "—"} />
          <Meta label="Target date" value={fmtDate(a.target_completion_date)} />
          <Meta label="Missing evidence" value={`${missingCount} prompts`} />
        </div>
      </PageHeader>

      <div className="px-8 py-6 max-w-[1400px] grid lg:grid-cols-[1fr_320px] gap-8">
        <div className="space-y-8 min-w-0">
          <section className="border border-border rounded-sm bg-card p-5">
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <h2 className="font-semibold tracking-tight text-sm" style={{ color: "var(--navy)" }}>Transformation profile</h2>
              </div>
              <StatusChip
                label={`Profile maturity · ${complexityLabel}`}
                tone={complexityLabel === "High" ? "warning" : complexityLabel === "Low" ? "muted" : "info"}
              />
            </div>

            <div className="mt-4 grid sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] gap-5">
              <div className="space-y-3">
                <div>
                  <div className="eyebrow">Lead lens</div>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="font-medium" style={{ color: "var(--navy)" }}>{profile.lead ?? "—"}</span>
                    {profile.weight != null && (
                      <span className="font-mono text-xs text-muted-foreground">{profile.weight}%</span>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><div className="eyebrow">Scope</div><div className="text-sm font-medium mt-1">{a.scope_level ?? "—"}</div></div>
                  <div><div className="eyebrow">Intensity</div><div className="text-sm font-medium mt-1">{complexityLabel}</div></div>
                </div>
              </div>

              <div>
                <div className="eyebrow flex items-center gap-1.5"><Layers3 className="h-3 w-3" /> Top weighted CORE7 pillars</div>
                <ul className="mt-2 space-y-2">
                  {topPillars.map((pillar: any) => (
                    <li key={pillar.id} className="grid grid-cols-[1fr_auto] items-center gap-3">
                      <div className="min-w-0">
                        <div className="text-[12px] truncate">{pillar.name}</div>
                        <div className="mt-1 h-1.5 bg-secondary rounded-sm overflow-hidden">
                          <div className="h-full bg-primary" style={{ width: `${(Number(pillar.default_weight ?? 0) / maxPillarWeight) * 100}%` }} />
                        </div>
                      </div>
                      <span className="font-mono text-[11px] text-muted-foreground">{pillar.default_weight}%</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <p className="mt-4 pt-3 border-t border-border text-[11px] text-muted-foreground leading-snug">
              This dynamic weighting profile tailors the later readiness assessment by directing analytical
              weight toward the most implicated lenses. It is not itself a readiness result.
            </p>
          </section>

          <section>
            <h2 className="font-semibold tracking-tight mb-3" style={{ color: "var(--navy)" }}>CORE7 pillars</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {p.map((pillar: any) => {
                const row = pa.find((x: any) => x.pillar_id === pillar.id);
                const raw = row?.final_score ?? row?.provisional_score;
                const mapped = mapScore(raw);
                const b = readinessBand(mapped);
                return (
                  <Link key={pillar.id} to="/app/assessments/$id/pillars/$pillarId" params={{ id, pillarId: pillar.id }} className="block border border-border rounded-sm bg-card p-4 hover:border-primary transition-colors group">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="eyebrow">Pillar {pillar.display_order} · weight {pillar.default_weight}%</div>
                        <div className="font-medium mt-1">{pillar.name}</div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <div className="mt-3 flex items-end gap-3">
                      <div>
                        <div className="text-2xl font-mono font-semibold" style={{ color: "var(--navy)" }}>{mapped ?? "—"}</div>
                        <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{raw != null ? `${raw}/5 raw` : "Unscored"}</div>
                      </div>
                      <div className="ml-auto flex flex-col items-end gap-1">
                        <StatusChip label={b.label} tone={b.tone} />
                        {row?.confidence && <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">Conf · {row.confidence}</span>}
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-border">
                      <StatusChip label={PILLAR_STATUS_LABELS[row?.status ?? "not_started"]} tone={row?.status === "complete" ? "success" : row?.status === "ready_for_review" ? "warning" : "muted"} />
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>

          <section className="grid md:grid-cols-2 gap-6">
            <Panel title="Top risks" icon={<AlertTriangle className="h-4 w-4" />}>
              {risks.length === 0 && <Empty msg="No risks logged yet." />}
              <ul className="divide-y divide-border">
                {risks.slice(0, 5).map((r: any) => (
                  <li key={r.id} className="py-2.5 first:pt-0 last:pb-0">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-medium leading-snug">{r.title}</span>
                      <StatusChip label={r.severity} tone={r.severity === "critical" ? "danger" : r.severity === "high" ? "warning" : "muted"} />
                    </div>
                    {r.description && <p className="text-xs text-muted-foreground mt-1 leading-snug">{r.description}</p>}
                  </li>
                ))}
              </ul>
            </Panel>
            <Panel title="Top recommendations" icon={<Lightbulb className="h-4 w-4" />}>
              {recs.length === 0 && <Empty msg="No recommendations yet." />}
              <ul className="divide-y divide-border">
                {recs.slice(0, 5).map((r: any) => (
                  <li key={r.id} className="py-2.5 first:pt-0 last:pb-0">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-medium leading-snug">{r.title}</span>
                      <StatusChip label={r.priority} tone={r.priority === "critical" ? "danger" : r.priority === "high" ? "warning" : "primary"} />
                    </div>
                    {r.rationale && <p className="text-xs text-muted-foreground mt-1 leading-snug">{r.rationale}</p>}
                  </li>
                ))}
              </ul>
            </Panel>
          </section>

          <Panel title="Missing evidence prompts" icon={<FileWarning className="h-4 w-4" />}>
            {pa.flatMap((row: any) => (row.ai_missing_evidence ?? []).map((m: string, i: number) => {
              const pillar = p.find((x: any) => x.id === row.pillar_id);
              return (
                <div key={`${row.id}-${i}`} className="py-2 border-b border-border last:border-0 text-sm flex items-start justify-between gap-3">
                  <span className="leading-snug">{m}</span>
                  <span className="eyebrow whitespace-nowrap">{pillarLabel(pillar?.code, pillar?.name)}</span>
                </div>
              );
            }))}
            {!pa.some((r: any) => (r.ai_missing_evidence?.length ?? 0) > 0) && <Empty msg="No outstanding evidence gaps recorded." />}
          </Panel>
        </div>

        <aside>
          <h2 className="font-semibold tracking-tight mb-3" style={{ color: "var(--navy)" }}>Activity</h2>
          <div className="border border-border rounded-sm bg-card divide-y divide-border">
            {act.length === 0 && <p className="p-4 text-sm text-muted-foreground">No activity yet.</p>}
            {act.map((e: any) => (
              <div key={e.id} className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <span className="eyebrow">{e.event_type.replace(/_/g, " ")}</span>
                  <span className="text-[10px] text-muted-foreground">{fmtRelative(e.created_at)}</span>
                </div>
                {e.actor_email && <div className="text-[11px] text-muted-foreground mt-1">{e.actor_email}</div>}
                {e.detail?.note && <p className="text-sm mt-1 leading-snug">{e.detail.note}</p>}
              </div>
            ))}
          </div>
        </aside>
      </div>
    </>
  );
}

function KpiBlock({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="border border-border rounded-sm bg-card p-5">
      <div className="eyebrow mb-2">{label}</div>
      <div className="text-3xl font-semibold font-mono" style={{ color: "var(--navy)" }}>{value}</div>
      <div className="text-[11px] text-muted-foreground mt-1">{sub}</div>
    </div>
  );
}
function Meta({ label, value }: { label: string; value: string }) {
  return <div className="border border-border rounded-sm bg-card px-4 py-3"><div className="eyebrow">{label}</div><div className="text-sm font-medium mt-1">{value}</div></div>;
}
function Panel({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="border border-border rounded-sm bg-card p-4">
      <div className="flex items-center gap-2 mb-3 pb-3 border-b border-border"><span className="text-primary">{icon}</span><h3 className="font-medium text-sm">{title}</h3></div>
      {children}
    </div>
  );
}
function Empty({ msg }: { msg: string }) {
  return <p className="text-sm text-muted-foreground py-2">{msg}</p>;
}