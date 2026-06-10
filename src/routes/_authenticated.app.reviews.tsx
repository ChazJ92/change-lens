import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { repositories as repo } from "@/lib/data";
import { useCurrentOrg, PageHeader, StatusChip } from "@/components/app-shell";
import { mapScore, readinessBand, fmtRelative, PILLAR_STATUS_LABELS } from "@/lib/scoring";
import { ArrowRight, ShieldCheck, MessageSquareWarning, CheckCircle2, Filter } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/app/reviews")({
  component: Reviews,
});

const REVIEW_STATUSES = ["ready_for_review", "changes_requested", "ai_analysis_complete"];

function Reviews() {
  const { data: orgData } = useCurrentOrg();
  const orgId = orgData?.current?.id;
  const [filter, setFilter] = useState<string>("open");

  const { data, isLoading } = useQuery({
    queryKey: ["reviews", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const assessments = await repo.assessments.listByOrg(orgId!);
      const aIds = new Set(assessments.map((r) => r.id));
      const [pillarAssessments, pillars, comments, overrides] = await Promise.all([
        repo.pillarAssessments.list(),
        repo.pillars.list(),
        repo.reviewComments.list(),
        repo.scoreOverrides.list(),
      ]);
      const rows = pillarAssessments.filter((row) => aIds.has(row.assessment_id));
      return {
        assessments,
        pas: rows,
        pillars,
        comments,
        overrides,
      };
    },
  });

  const items = useMemo(() => {
    if (!data) return [];
    return data.pas
      .map((row: any) => {
        const a = data.assessments.find((x: any) => x.id === row.assessment_id);
        const pillar = data.pillars.find((x: any) => x.id === row.pillar_id);
        const raw = row.final_score ?? row.provisional_score;
        return {
          ...row,
          assessment: a,
          pillar,
          score: mapScore(raw),
          rawScore: raw,
          band: readinessBand(mapScore(raw)),
        };
      })
      .filter((row: any) => row.assessment && row.pillar);
  }, [data]);

  const filtered = useMemo(() => {
    if (filter === "all") return items;
    if (filter === "complete") return items.filter((i: any) => i.status === "complete");
    if (filter === "changes") return items.filter((i: any) => i.status === "changes_requested");
    if (filter === "ready") return items.filter((i: any) => i.status === "ready_for_review");
    // open
    return items.filter((i: any) => REVIEW_STATUSES.includes(i.status));
  }, [items, filter]);

  const kpis = useMemo(() => {
    const ready = items.filter((i: any) => i.status === "ready_for_review").length;
    const changes = items.filter((i: any) => i.status === "changes_requested").length;
    const done = items.filter((i: any) => i.status === "complete").length;
    const total = items.length;
    return { ready, changes, done, total };
  }, [items]);

  const recentActivity = useMemo(() => {
    if (!data) return [];
    const decisions = data.comments
      .filter((c: any) => c.decision)
      .map((c: any) => ({ ...c, kind: "comment" as const, ts: c.created_at }));
    const overs = data.overrides.map((o: any) => ({ ...o, kind: "override" as const, ts: o.created_at }));
    return [...decisions, ...overs]
      .sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime())
      .slice(0, 10);
  }, [data]);

  return (
    <>
      <PageHeader
        eyebrow="Change Owner workspace"
        title="Reviewer queue"
        description="Pillar workspaces awaiting reviewer decision across every assessment in this organisation. Approvals, change requests and overrides are recorded on the audit trail and surfaced in the final report."
      >
        <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Kpi label="Awaiting review" value={kpis.ready} tone="warning" icon={<ShieldCheck className="h-4 w-4" />} />
          <Kpi label="Changes requested" value={kpis.changes} tone="info" icon={<MessageSquareWarning className="h-4 w-4" />} />
          <Kpi label="Approved pillars" value={kpis.done} tone="success" icon={<CheckCircle2 className="h-4 w-4" />} />
          <Kpi label="Total tracked" value={kpis.total} tone="muted" icon={<Filter className="h-4 w-4" />} />
        </div>
      </PageHeader>

      <div className="px-8 py-6 max-w-[1400px] grid lg:grid-cols-[1fr_320px] gap-8">
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold tracking-tight" style={{ color: "var(--navy)" }}>Pillar reviews</h2>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="h-8 w-52"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Open (awaiting reviewer)</SelectItem>
                <SelectItem value="ready">Ready for review</SelectItem>
                <SelectItem value="changes">Changes requested</SelectItem>
                <SelectItem value="complete">Approved</SelectItem>
                <SelectItem value="all">All pillars</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="border border-border rounded-sm bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/40">
                  <th className="text-left font-medium text-[11px] uppercase tracking-wider text-muted-foreground py-2.5 px-4">Pillar</th>
                  <th className="text-left font-medium text-[11px] uppercase tracking-wider text-muted-foreground py-2.5 px-3">Assessment</th>
                  <th className="text-left font-medium text-[11px] uppercase tracking-wider text-muted-foreground py-2.5 px-3">Status</th>
                  <th className="text-right font-medium text-[11px] uppercase tracking-wider text-muted-foreground py-2.5 px-3">Score</th>
                  <th className="text-right font-medium text-[11px] uppercase tracking-wider text-muted-foreground py-2.5 px-3">Conf.</th>
                  <th className="text-left font-medium text-[11px] uppercase tracking-wider text-muted-foreground py-2.5 px-3 pr-4 w-0">Open</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && <tr><td colSpan={6} className="py-12 text-center text-muted-foreground">Loading review queue…</td></tr>}
                {!isLoading && filtered.length === 0 && (
                  <tr><td colSpan={6} className="py-12 text-center text-sm text-muted-foreground">
                    Nothing in this filter. Once a pillar lead submits work, it will land here for the Change Owner.
                  </td></tr>
                )}
                {filtered.map((row: any) => (
                  <tr key={row.id} className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-medium">{row.pillar.name}</div>
                      <div className="text-[11px] text-muted-foreground">Pillar {row.pillar.display_order} · weight {Number(row.weight_override ?? row.pillar.default_weight)}%</div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="text-sm">{row.assessment.name}</div>
                      <div className="text-[11px] text-muted-foreground">{row.assessment.transformation_profile ?? "—"}</div>
                    </td>
                    <td className="py-3 px-3">
                      <StatusChip
                        label={PILLAR_STATUS_LABELS[row.status]}
                        tone={row.status === "complete" ? "success" : row.status === "ready_for_review" ? "warning" : row.status === "changes_requested" ? "danger" : "info"}
                      />
                    </td>
                    <td className="py-3 px-3 text-right">
                      {row.score != null ? (
                        <>
                          <span className="font-mono font-semibold">{row.score}</span>
                          <span className="text-[10px] text-muted-foreground font-mono ml-1">/100</span>
                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{row.band.label}</div>
                        </>
                      ) : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="py-3 px-3 text-right text-xs font-mono">{row.confidence ?? "—"}</td>
                    <td className="py-3 px-3 pr-4">
                      <Link
                        to="/app/assessments/$id/pillars/$pillarId"
                        params={{ id: row.assessment_id, pillarId: row.pillar_id }}
                        className="inline-flex items-center gap-1 text-primary hover:underline whitespace-nowrap text-xs"
                      >
                        Review <ArrowRight className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <aside>
          <h2 className="font-semibold tracking-tight mb-3" style={{ color: "var(--navy)" }}>Recent decisions</h2>
          <div className="border border-border rounded-sm bg-card divide-y divide-border">
            {recentActivity.length === 0 && <p className="p-4 text-sm text-muted-foreground">No reviewer activity yet.</p>}
            {recentActivity.map((e: any) => (
              <div key={`${e.kind}-${e.id}`} className="p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="eyebrow">{e.kind === "override" ? "Score override" : (e.decision ?? "Comment").replace(/_/g, " ")}</span>
                  <span className="text-[10px] text-muted-foreground">{fmtRelative(e.ts)}</span>
                </div>
                {e.kind === "override" ? (
                  <>
                    <div className="text-xs mt-1 font-mono">{e.previous_score ?? "—"} → <span className="font-semibold">{e.new_score}</span></div>
                    <p className="text-xs text-muted-foreground leading-snug mt-1">{e.rationale}</p>
                  </>
                ) : (
                  <p className="text-xs leading-snug mt-1">{e.comment}</p>
                )}
              </div>
            ))}
          </div>
        </aside>
      </div>
    </>
  );
}

function Kpi({ label, value, tone, icon }: { label: string; value: number; tone: string; icon: React.ReactNode }) {
  const colour: Record<string, string> = {
    success: "var(--success)",
    warning: "var(--warning)",
    danger: "var(--destructive)",
    info: "var(--info)",
    muted: "var(--muted-foreground)",
  };
  return (
    <div className="border border-border rounded-sm bg-card p-4">
      <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
        <span style={{ color: colour[tone] }}>{icon}</span> {label}
      </div>
      <div className="mt-2 text-2xl font-semibold font-mono tracking-tight" style={{ color: "var(--navy)" }}>{value}</div>
    </div>
  );
}