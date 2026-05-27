import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrg, PageHeader, StatusChip } from "@/components/app-shell";
import { weightedOverall, readinessBand, fmtDate, fmtRelative, ASSESSMENT_STATUS_LABELS } from "@/lib/scoring";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Plus, ArrowUpDown, AlertTriangle, Activity, ClipboardCheck, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/")({
  component: Dashboard,
});

function Dashboard() {
  const { data: orgData } = useCurrentOrg();
  const orgId = orgData?.current?.id;

  const { data: assessments, isLoading } = useQuery({
    queryKey: ["assessments", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assessments")
        .select("id, name, status, scope_level, complexity_level, transformation_profile, business_area, target_completion_date, created_at, updated_at, description")
        .eq("organisation_id", orgId!)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: pillars } = useQuery({
    queryKey: ["pillars-all", orgId],
    enabled: !!orgId && !!assessments?.length,
    queryFn: async () => {
      const ids = assessments!.map((a) => a.id);
      const [{ data: pa }, { data: p }] = await Promise.all([
        supabase.from("pillar_assessments").select("assessment_id, pillar_id, final_score, provisional_score, confidence, weight_override, status").in("assessment_id", ids),
        supabase.from("pillars").select("id, default_weight"),
      ]);
      const wmap = new Map((p ?? []).map((x: any) => [x.id, Number(x.default_weight)]));
      return (pa ?? []).map((row: any) => ({
        ...row,
        weight: wmap.get(row.pillar_id) ?? 0,
      }));
    },
  });

  const { data: activity } = useQuery({
    queryKey: ["activity", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data } = await supabase
        .from("audit_logs")
        .select("id, event_type, detail, actor_email, created_at")
        .eq("organisation_id", orgId!)
        .order("created_at", { ascending: false })
        .limit(8);
      return data ?? [];
    },
  });

  const [filter, setFilter] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [sort, setSort] = useState<string>("updated_at");

  const enriched = useMemo(() => {
    if (!assessments) return [];
    return assessments.map((a) => {
      const rows = (pillars ?? []).filter((p: any) => p.assessment_id === a.id);
      const scoreRows = rows.map((r: any) => ({ score: r.final_score ?? r.provisional_score, weight: r.weight, weight_override: r.weight_override }));
      const overall = weightedOverall(scoreRows);
      const band = readinessBand(overall);
      const confMap: Record<string, number> = { "Very High": 95, High: 80, Moderate: 60, Low: 35 };
      const conf = rows.length
        ? Math.round(rows.reduce((s: number, r: any) => s + (confMap[r.confidence ?? ""] ?? 0), 0) / rows.length)
        : 0;
      return { ...a, overall, band, conf, pillarCount: rows.length };
    });
  }, [assessments, pillars]);

  const filtered = useMemo(() => {
    let list = enriched;
    if (filter) {
      const q = filter.toLowerCase();
      list = list.filter((a) => `${a.name} ${a.business_area ?? ""} ${a.transformation_profile ?? ""}`.toLowerCase().includes(q));
    }
    if (status !== "all") list = list.filter((a) => a.status === status);
    list = [...list].sort((a: any, b: any) => {
      if (sort === "score") return (b.overall ?? -1) - (a.overall ?? -1);
      if (sort === "target") return new Date(a.target_completion_date ?? "9999").getTime() - new Date(b.target_completion_date ?? "9999").getTime();
      if (sort === "name") return a.name.localeCompare(b.name);
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });
    return list;
  }, [enriched, filter, status, sort]);

  const kpi = useMemo(() => {
    const active = enriched.filter((a) => a.status === "active" || a.status === "in_review").length;
    const inReview = enriched.filter((a) => a.status === "in_review").length;
    const avg = enriched.length ? Math.round(enriched.reduce((s, a) => s + (a.overall ?? 0), 0) / enriched.length) : 0;
    const lowConf = enriched.filter((a) => a.conf < 60).length;
    return { active, inReview, avg, lowConf };
  }, [enriched]);

  return (
    <>
      <PageHeader
        eyebrow={orgData?.current?.is_demo ? "Demo workspace · explore freely" : "Organisation dashboard"}
        title={orgData?.current?.name ?? "Dashboard"}
        description="Active transformation assessments, weighted readiness across the seven CORE7 domains, and the most recent activity in your organisation."
        actions={
          <Button asChild size="sm"><Link to="/app/assessments/new"><Plus className="h-3.5 w-3.5" /> New assessment</Link></Button>
        }
      >
        <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiTile icon={<ClipboardCheck className="h-4 w-4" />} label="Active assessments" value={String(kpi.active)} sub={`${enriched.length} total`} />
          <KpiTile icon={<Activity className="h-4 w-4" />} label="In review" value={String(kpi.inReview)} sub="Awaiting reviewer sign-off" />
          <KpiTile icon={<Sparkles className="h-4 w-4" />} label="Portfolio readiness" value={kpi.avg ? `${kpi.avg}` : "—"} sub={readinessBand(kpi.avg).label} />
          <KpiTile icon={<AlertTriangle className="h-4 w-4" />} label="Low confidence" value={String(kpi.lowConf)} sub="Need more evidence" />
        </div>
      </PageHeader>

      <div className="px-8 py-6 max-w-[1400px] grid lg:grid-cols-[1fr_320px] gap-8">
        <section>
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className="font-semibold tracking-tight" style={{ color: "var(--navy)" }}>Assessments</h2>
            <div className="flex items-center gap-2">
              <Input placeholder="Filter…" value={filter} onChange={(e) => setFilter(e.target.value)} className="h-8 w-48" />
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="h-8 w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {Object.entries(ASSESSMENT_STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={sort} onValueChange={setSort}>
                <SelectTrigger className="h-8 w-40"><ArrowUpDown className="h-3 w-3" /><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="updated_at">Recently updated</SelectItem>
                  <SelectItem value="score">Score</SelectItem>
                  <SelectItem value="target">Target date</SelectItem>
                  <SelectItem value="name">Name</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="border border-border rounded-sm bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/40">
                  <th className="text-left font-medium text-[11px] uppercase tracking-wider text-muted-foreground py-2.5 px-4">Assessment</th>
                  <th className="text-left font-medium text-[11px] uppercase tracking-wider text-muted-foreground py-2.5 px-3">Status</th>
                  <th className="text-left font-medium text-[11px] uppercase tracking-wider text-muted-foreground py-2.5 px-3">Scope · Complexity</th>
                  <th className="text-right font-medium text-[11px] uppercase tracking-wider text-muted-foreground py-2.5 px-3">Score</th>
                  <th className="text-right font-medium text-[11px] uppercase tracking-wider text-muted-foreground py-2.5 px-3">Conf.</th>
                  <th className="text-left font-medium text-[11px] uppercase tracking-wider text-muted-foreground py-2.5 px-3">Target</th>
                  <th className="text-left font-medium text-[11px] uppercase tracking-wider text-muted-foreground py-2.5 px-3 pr-4">Updated</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <tr><td colSpan={7} className="py-12 text-center text-muted-foreground">Loading…</td></tr>
                )}
                {!isLoading && filtered.length === 0 && (
                  <tr><td colSpan={7} className="py-12 text-center">
                    <p className="text-sm text-muted-foreground">No assessments match the current filter.</p>
                    <Button asChild size="sm" className="mt-3"><Link to="/app/assessments/new"><Plus className="h-3.5 w-3.5" /> Create assessment</Link></Button>
                  </td></tr>
                )}
                {filtered.map((a: any) => (
                  <tr key={a.id} className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors">
                    <td className="py-3 px-4">
                      <Link to="/app/assessments/$id" params={{ id: a.id }} className="font-medium hover:text-primary transition-colors">{a.name}</Link>
                      {a.transformation_profile && (
                        <div className="text-[11px] text-muted-foreground mt-0.5">{a.transformation_profile} · {a.business_area ?? "—"}</div>
                      )}
                    </td>
                    <td className="py-3 px-3"><StatusChip label={ASSESSMENT_STATUS_LABELS[a.status]} tone={a.status === "complete" ? "success" : a.status === "in_review" ? "warning" : a.status === "draft" ? "muted" : "info"} /></td>
                    <td className="py-3 px-3 text-muted-foreground">{a.scope_level ?? "—"} · {a.complexity_level ?? "—"}</td>
                    <td className="py-3 px-3 text-right">
                      {a.overall != null ? (
                        <div>
                          <span className="font-mono font-semibold">{a.overall}</span>
                          <span className="text-[10px] text-muted-foreground font-mono ml-1">/100</span>
                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">{a.band.label}</div>
                        </div>
                      ) : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-sm">{a.conf ? `${a.conf}` : "—"}</td>
                    <td className="py-3 px-3 text-muted-foreground">{fmtDate(a.target_completion_date)}</td>
                    <td className="py-3 px-3 pr-4 text-muted-foreground">{fmtRelative(a.updated_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <aside>
          <h2 className="font-semibold tracking-tight mb-4" style={{ color: "var(--navy)" }}>Recent activity</h2>
          <div className="border border-border rounded-sm bg-card divide-y divide-border">
            {(activity ?? []).length === 0 && <p className="p-4 text-sm text-muted-foreground">No activity yet.</p>}
            {(activity ?? []).map((e: any) => (
              <div key={e.id} className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{e.event_type.replace(/_/g, " ")}</span>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">{fmtRelative(e.created_at)}</span>
                </div>
                {e.actor_email && <div className="text-xs text-muted-foreground mt-1">{e.actor_email}</div>}
                {e.detail && typeof e.detail === "object" && (e.detail as any).note && (
                  <p className="text-sm mt-1 leading-snug">{(e.detail as any).note}</p>
                )}
              </div>
            ))}
          </div>
        </aside>
      </div>
    </>
  );
}

function KpiTile({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub: string }) {
  return (
    <div className="border border-border rounded-sm bg-card p-4">
      <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{icon} {label}</div>
      <div className="mt-2 text-2xl font-semibold font-mono tracking-tight" style={{ color: "var(--navy)" }}>{value}</div>
      <div className="text-[11px] text-muted-foreground mt-0.5">{sub}</div>
    </div>
  );
}