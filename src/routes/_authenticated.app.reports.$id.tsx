import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { mockRepositories as repo } from "@/lib/mock";
import { PageHeader, StatusChip } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import {
  weightedOverall,
  readinessBand,
  mapScore,
  fmtDate,
  ASSESSMENT_STATUS_LABELS,
  PILLAR_STATUS_LABELS,
  confidenceFromLabel,
} from "@/lib/scoring";
import { Printer, ArrowLeft, ShieldCheck, AlertTriangle, Lightbulb, Sparkles, FileWarning } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/reports/$id")({
  component: ReportPage,
});

function ReportPage() {
  const { id } = Route.useParams();

  const { data, isLoading } = useQuery({
    queryKey: ["report", id],
    queryFn: async () => {
      return {
        a: repo.assessments.get(id),
        pa: repo.pillarAssessments.listByAssessment(id),
        p: repo.pillars.list(),
        risks: repo.risks.listByAssessment(id),
        recs: repo.recommendations.listByAssessment(id),
        ov: repo.scoreOverrides.list(),
        com: repo.reviewComments.list(),
        act: repo.activity.listByAssessment(id),
      };
    },
  });

  if (isLoading || !data?.a) return <div className="p-8 text-sm text-muted-foreground">Composing report…</div>;

  const { a, pa, p, risks, recs, ov, com, act } = data;
  const paIds = new Set(pa.map((r: any) => r.id));
  const overrides = ov.filter((o: any) => paIds.has(o.pillar_assessment_id));
  const comments = com.filter((c: any) => paIds.has(c.pillar_assessment_id));

  const rows = pa.map((row: any) => {
    const pp = p.find((x: any) => x.id === row.pillar_id);
    return { ...row, pillar: pp };
  });
  const scoreRows = rows.map((r: any) => ({
    score: r.final_score ?? r.provisional_score,
    weight: Number(r.pillar?.default_weight ?? 0),
    weight_override: r.weight_override,
  }));
  const overall = weightedOverall(scoreRows);
  const band = readinessBand(overall);
  const confAvg = pa.length
    ? Math.round(pa.reduce((s: number, r: any) => s + confidenceFromLabel(r.confidence), 0) / pa.length)
    : 0;
  const completed = pa.filter((r: any) => r.status === "complete").length;

  const sortedRisks = [...risks].sort((a: any, b: any) => sev(b.severity) - sev(a.severity));
  const sortedRecs = [...recs].sort((a: any, b: any) => sev(b.priority) - sev(a.priority));

  return (
    <>
      <PageHeader
        eyebrow={
          (
            <Link to="/app/assessments/$id" params={{ id }} className="inline-flex items-center gap-1 hover:text-foreground">
              <ArrowLeft className="h-3 w-3" /> Back to assessment
            </Link>
          ) as any
        }
        title={`Final report · ${a.name}`}
        description="Board-ready transformation readiness report. Every score is traceable to evidence, stakeholder input and reviewer decisions."
        actions={
          <>
            <StatusChip label={ASSESSMENT_STATUS_LABELS[a.status]} tone={a.status === "complete" ? "success" : "info"} />
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="h-3.5 w-3.5" /> Print / PDF
            </Button>
          </>
        }
      >
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-4 gap-3">
          <div className="border border-border rounded-sm bg-card p-5 lg:col-span-2">
            <div className="eyebrow mb-2">Overall readiness</div>
            <div className="flex items-end gap-3">
              <div className="text-5xl font-semibold font-mono tracking-tight" style={{ color: "var(--navy)" }}>
                {overall ?? "—"}
              </div>
              <div className="text-sm text-muted-foreground font-mono pb-2">/100</div>
              <div className="ml-auto pb-2"><StatusChip label={band.label} tone={band.tone} /></div>
            </div>
            <div className="mt-3 h-1.5 bg-secondary rounded-sm overflow-hidden">
              <div className="h-full bg-primary" style={{ width: `${overall ?? 0}%` }} />
            </div>
          </div>
          <Kpi label="Pillars complete" value={`${completed}/${pa.length || 7}`} sub="Reviewer-approved" />
          <Kpi label="Confidence index" value={confAvg ? String(confAvg) : "—"} sub={confAvg > 80 ? "High" : confAvg > 60 ? "Moderate" : "Low"} />
        </div>
        <div className="mt-3 grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Meta label="Transformation" value={a.transformation_profile ?? "—"} />
          <Meta label="Business area" value={a.business_area ?? "—"} />
          <Meta label="Scope" value={a.scope_level ?? "—"} />
          <Meta label="Target date" value={fmtDate(a.target_completion_date)} />
        </div>
      </PageHeader>

      <div className="px-8 py-6 max-w-[1100px] space-y-10">
        <Section title="Executive summary">
          <p className="text-sm leading-relaxed">
            <span className="font-medium">{a.name}</span> has reached an overall readiness of{" "}
            <span className="font-mono font-semibold">{overall ?? "—"}/100</span> ({band.label}). Of the seven
            CORE7 pillars, <span className="font-mono">{completed}</span> have been fully approved by a
            Change Owner. Confidence in the evidence base is rated{" "}
            <span className="font-mono">{confAvg ? `${confAvg}/100` : "—"}</span>.
          </p>
          {overrides.length > 0 && (
            <p className="text-sm leading-relaxed mt-3">
              <span className="font-medium">{overrides.length}</span> reviewer score override(s) were recorded,
              each with an audit-logged rationale — see "Reviewer decisions" below.
            </p>
          )}
        </Section>

        <Section title="Pillar scorecard">
          <div className="border border-border rounded-sm bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-secondary/40 text-[10px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-2 font-medium">Pillar</th>
                  <th className="text-right px-4 py-2 font-medium">Weight</th>
                  <th className="text-right px-4 py-2 font-medium">Score</th>
                  <th className="text-right px-4 py-2 font-medium">Band</th>
                  <th className="text-right px-4 py-2 font-medium">Confidence</th>
                  <th className="text-right px-4 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {p.map((pillar: any) => {
                  const row = pa.find((x: any) => x.pillar_id === pillar.id);
                  const raw = row?.final_score ?? row?.provisional_score;
                  const mapped = mapScore(raw);
                  const b = readinessBand(mapped);
                  const weight = Number(row?.weight_override ?? pillar.default_weight);
                  return (
                    <tr key={pillar.id}>
                      <td className="px-4 py-2.5">
                        <div className="font-medium">{pillar.name}</div>
                        <div className="eyebrow">{pillar.code?.replace(/_/g, " ")}</div>
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono">{weight}%</td>
                      <td className="px-4 py-2.5 text-right font-mono">
                        {mapped ?? "—"}
                        <span className="text-muted-foreground text-xs"> /100</span>
                      </td>
                      <td className="px-4 py-2.5 text-right"><StatusChip label={b.label} tone={b.tone} /></td>
                      <td className="px-4 py-2.5 text-right font-mono">{row?.confidence ?? "—"}</td>
                      <td className="px-4 py-2.5 text-right">
                        <StatusChip
                          label={PILLAR_STATUS_LABELS[row?.status ?? "not_started"]}
                          tone={row?.status === "complete" ? "success" : row?.status === "ready_for_review" ? "warning" : "muted"}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Section>

        <Section title="Reviewer decisions" icon={<ShieldCheck className="h-4 w-4" />}>
          {overrides.length === 0 && comments.length === 0 ? (
            <Empty msg="No reviewer overrides or comments have been recorded yet." />
          ) : (
            <div className="space-y-4">
              {overrides.map((o: any) => {
                const row = rows.find((r: any) => r.id === o.pillar_assessment_id);
                return (
                  <div key={o.id} className="border border-border rounded-sm bg-card p-4">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="font-medium text-sm">{row?.pillar?.name ?? "Pillar"}</div>
                      <span className="font-mono text-xs">
                        {o.previous_score ?? "—"} → <span className="font-semibold">{o.new_score}</span>
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-snug">{o.rationale}</p>
                  </div>
                );
              })}
              {comments.slice(0, 5).map((c: any) => {
                const row = rows.find((r: any) => r.id === c.pillar_assessment_id);
                return (
                  <div key={c.id} className="border border-border rounded-sm bg-card p-4">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="font-medium text-sm">{row?.pillar?.name ?? "Pillar"}</div>
                      <span className="eyebrow">{c.decision ?? "Comment"}</span>
                    </div>
                    <p className="text-xs leading-snug">{c.comment}</p>
                  </div>
                );
              })}
            </div>
          )}
        </Section>

        <Section title="Top risks" icon={<AlertTriangle className="h-4 w-4" />}>
          {sortedRisks.length === 0 ? <Empty msg="No risks recorded." /> : (
            <ul className="divide-y divide-border border border-border rounded-sm bg-card">
              {sortedRisks.slice(0, 10).map((r: any) => (
                <li key={r.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-medium leading-snug">{r.title}</span>
                    <StatusChip label={r.severity} tone={r.severity === "critical" ? "danger" : r.severity === "high" ? "warning" : "muted"} />
                  </div>
                  {r.description && <p className="text-xs text-muted-foreground mt-1 leading-snug">{r.description}</p>}
                  {r.mitigation && <p className="text-xs mt-1.5 leading-snug"><span className="eyebrow">Mitigation</span> {r.mitigation}</p>}
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Prioritised recommendations" icon={<Lightbulb className="h-4 w-4" />}>
          {sortedRecs.length === 0 ? <Empty msg="No recommendations." /> : (
            <ul className="divide-y divide-border border border-border rounded-sm bg-card">
              {sortedRecs.map((r: any) => (
                <li key={r.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-medium leading-snug">{r.title}</span>
                    <StatusChip label={r.priority} tone={r.priority === "critical" ? "danger" : r.priority === "high" ? "warning" : "primary"} />
                  </div>
                  {r.description && <p className="text-xs mt-1 leading-snug">{r.description}</p>}
                  {r.rationale && <p className="text-xs text-muted-foreground mt-1 leading-snug"><span className="eyebrow">Why</span> {r.rationale}</p>}
                  {r.suggested_owner && <p className="text-xs text-muted-foreground mt-1"><span className="eyebrow">Suggested owner</span> {r.suggested_owner}</p>}
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="AI explainability" icon={<Sparkles className="h-4 w-4" />}>
          <p className="text-xs text-muted-foreground mb-3 leading-snug">
            Every AI-generated score on this report includes its rationale, evidence considered and missing evidence.
            Reviewers have full traceability from pillar score → AI rationale → underlying evidence.
          </p>
          <div className="space-y-3">
            {rows.filter((r: any) => r.ai_rationale).map((r: any) => (
              <div key={r.id} className="border border-border rounded-sm bg-card p-4">
                <div className="font-medium text-sm mb-1">{r.pillar?.name}</div>
                <p className="text-xs leading-snug">{r.ai_rationale}</p>
                {(r.ai_missing_evidence?.length ?? 0) > 0 && (
                  <div className="mt-2 text-[11px] text-muted-foreground"><span className="eyebrow">Missing evidence</span> {r.ai_missing_evidence.join(" · ")}</div>
                )}
              </div>
            ))}
            {!rows.some((r: any) => r.ai_rationale) && <Empty msg="No AI analyses have been run for this assessment." />}
          </div>
        </Section>

        <Section title="Audit trail" icon={<FileWarning className="h-4 w-4" />}>
          <div className="border border-border rounded-sm bg-card divide-y divide-border max-h-96 overflow-auto">
            {act.length === 0 && <p className="p-4 text-sm text-muted-foreground">No audit events recorded.</p>}
            {act.map((e: any) => (
              <div key={e.id} className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <span className="eyebrow">{e.event_type.replace(/_/g, " ")}</span>
                  <span className="text-[10px] text-muted-foreground font-mono">{fmtDate(e.created_at)}</span>
                </div>
                {e.actor_email && <div className="text-[11px] text-muted-foreground mt-1">{e.actor_email}</div>}
                {e.detail?.note && <p className="text-sm mt-1 leading-snug">{e.detail.note}</p>}
              </div>
            ))}
          </div>
        </Section>
      </div>
    </>
  );
}

function sev(s: string) {
  return { critical: 4, high: 3, medium: 2, low: 1 }[s as "critical" | "high" | "medium" | "low"] ?? 0;
}
function Kpi({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="border border-border rounded-sm bg-card p-5">
      <div className="eyebrow mb-2">{label}</div>
      <div className="text-3xl font-semibold font-mono" style={{ color: "var(--navy)" }}>{value}</div>
      <div className="text-[11px] text-muted-foreground mt-1">{sub}</div>
    </div>
  );
}
function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-border rounded-sm bg-card px-4 py-3">
      <div className="eyebrow">{label}</div>
      <div className="text-sm font-medium mt-1">{value}</div>
    </div>
  );
}
function Section({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        {icon && <span className="text-primary">{icon}</span>}
        <h2 className="font-semibold tracking-tight" style={{ color: "var(--navy)" }}>{title}</h2>
      </div>
      {children}
    </section>
  );
}
function Empty({ msg }: { msg: string }) {
  return <p className="text-sm text-muted-foreground py-2">{msg}</p>;
}