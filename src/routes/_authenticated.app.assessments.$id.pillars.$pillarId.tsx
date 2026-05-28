import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { mockRepositories as repo } from "@/lib/mock";
import { PageHeader, StatusChip } from "@/components/app-shell";
import { mapScore, readinessBand, fmtRelative, PILLAR_STATUS_LABELS } from "@/lib/scoring";
import { ArrowLeft, Sparkles, FileText, Users, AlertTriangle, Lightbulb, MessageSquare, History } from "lucide-react";
import { ReviewPanel, StatusTransitionPanel } from "@/components/review-panel";
import { EvidencePanel } from "@/components/evidence-panel";
import { SurveyPublishPanel } from "@/components/survey-publish-panel";
import { AiActionButton, AiConfigBanner } from "@/components/ai-gate";
import { useAiSettings, aiEnabled } from "@/lib/ai-config";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/assessments/$id/pillars/$pillarId")({
  component: PillarDetail,
});

function PillarDetail() {
  const { id, pillarId } = Route.useParams();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["pillar", id, pillarId],
    queryFn: async () => {
      const pa = repo.pillarAssessments
        .listByAssessment(id)
        .find((p) => p.pillar_id === pillarId) ?? null;
      const paId = pa?.id;
      const assessment = repo.assessments.get(id);
      return {
        pillar: repo.pillars.get(pillarId),
        pa,
        questions: repo.questions.listByPillar(pillarId),
        comments: paId ? repo.reviewComments.listByPillarAssessment(paId) : [],
        overrides: paId ? repo.scoreOverrides.listByPillarAssessment(paId) : [],
        risks: repo.risks.listByAssessment(id).filter((r) => r.pillar_id === pillarId),
        recs: repo.recommendations.listByAssessment(id).filter((r) => r.pillar_id === pillarId),
        organisationId: assessment?.organisation_id as string | undefined,
      };
    },
  });

  const transition = useMutation({
    mutationFn: async (status: any) => {
      if (!data?.pa?.id) return;
      repo.pillarAssessments.update(data.pa.id, { status });
    },
    onSuccess: () => { toast.success("Status updated"); qc.invalidateQueries({ queryKey: ["pillar"] }); },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  if (isLoading || !data?.pillar) return <div className="p-8 text-sm text-muted-foreground">Loading pillar…</div>;

  const { pillar, pa, questions, comments, overrides, risks, recs, organisationId } = data;
  const { data: aiSettings } = useAiSettings(organisationId);
  const raw = pa?.final_score ?? pa?.provisional_score;
  const mapped = mapScore(raw);
  const band = readinessBand(mapped);

  return (
    <>
      <PageHeader
        eyebrow={
          <Link to="/app/assessments/$id" params={{ id }} className="inline-flex items-center gap-1 hover:text-foreground">
            <ArrowLeft className="h-3 w-3" /> Back to assessment
          </Link> as any
        }
        title={pillar.name}
        description={pillar.description}
        actions={<StatusChip label={PILLAR_STATUS_LABELS[pa?.status ?? "not_started"]} tone={pa?.status === "complete" ? "success" : "info"} />}
      >
        <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="border border-border rounded-sm bg-card p-4 lg:col-span-2">
            <div className="eyebrow mb-2">Score</div>
            <div className="flex items-end gap-3">
              <span className="text-4xl font-mono font-semibold" style={{ color: "var(--navy)" }}>{mapped ?? "—"}</span>
              <span className="text-xs font-mono text-muted-foreground pb-1.5">/100 · raw {raw ?? "—"}/5</span>
              <span className="ml-auto pb-2"><StatusChip label={band.label} tone={band.tone} /></span>
            </div>
            <div className="mt-2 h-1.5 bg-secondary rounded-sm overflow-hidden"><div className="h-full bg-primary" style={{ width: `${mapped ?? 0}%` }} /></div>
          </div>
          <div className="border border-border rounded-sm bg-card p-4">
            <div className="eyebrow mb-1">Confidence</div>
            <div className="text-2xl font-mono font-semibold" style={{ color: "var(--navy)" }}>{pa?.confidence ?? "—"}</div>
          </div>
          <div className="border border-border rounded-sm bg-card p-4">
            <div className="eyebrow mb-1">Weight</div>
            <div className="text-2xl font-mono font-semibold" style={{ color: "var(--navy)" }}>{Number(pa?.weight_override ?? pillar.default_weight)}%</div>
          </div>
        </div>
      </PageHeader>

      <div className="px-8 py-6 max-w-[1400px] grid lg:grid-cols-[1fr_340px] gap-8">
        <div className="space-y-6 min-w-0">
          {!aiEnabled(aiSettings) && (
            <AiConfigBanner settings={aiSettings} />
          )}
          {/* AI Explainability — hero block */}
          <div className="border border-primary/30 rounded-sm bg-card p-5">
            <div className="flex items-center justify-between gap-3 mb-3 pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <h3 className="font-medium">AI analysis</h3>
                {pa?.ai_rationale ? (
                  <span className="eyebrow ml-2">Provisional · awaiting human review</span>
                ) : (
                  <span className="eyebrow ml-2">Not run</span>
                )}
              </div>
              <AiActionButton
                settings={aiSettings}
                label="Run analysis"
                onRun={() =>
                  toast.info(
                    "AI is configured. Per-pillar analysis runs are queued from this control in the next release.",
                  )
                }
              />
            </div>
            {pa?.ai_rationale ? (
              <div className="grid md:grid-cols-2 gap-5">
                <ExplainBlock label="Rationale" body={pa.ai_rationale} />
                <ExplainList label="Evidence considered" items={pa.ai_evidence_considered ?? []} />
                <ExplainList label="Missing evidence" items={pa.ai_missing_evidence ?? []} tone="warning" />
                <ExplainBlock label="Suggested next action" body={pa.ai_suggested_next_action ?? "—"} accent />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No AI analysis has been run for this pillar yet. The product works fully without AI — you can record scores, evidence and reviewer comments manually. Once an organisation admin configures a verified OpenAI key, AI analysis will become available here and will always show rationale, evidence considered, missing evidence, confidence, related risks and a suggested next action.</p>
            )}
          </div>

          {/* Questionnaire */}
          <Section title="Questionnaire" icon={<FileText className="h-4 w-4" />} sub={`${questions.length} subdimensions across ${pillar.name}`}>
            <ol className="divide-y divide-border">
              {questions.map((q: any, i: number) => (
                <li key={q.id} className="py-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="eyebrow">{q.subdimension}</div>
                      <p className="text-sm mt-1 leading-snug">{i + 1}. {q.prompt}</p>
                    </div>
                    <span className="font-mono text-xs text-muted-foreground whitespace-nowrap">— / 5</span>
                  </div>
                </li>
              ))}
            </ol>
          </Section>

          {/* Stakeholder survey */}
          <Section title="Stakeholder input summary" icon={<Users className="h-4 w-4" />}>
            <p className="text-sm text-muted-foreground">No stakeholder responses received yet. Once a survey is published, average scores and free-text themes per subdimension will appear here.</p>
          </Section>

          {/* Risks + Recs */}
          <div className="grid md:grid-cols-2 gap-6">
            <Section title="Risks" icon={<AlertTriangle className="h-4 w-4" />}>
              {risks.length === 0 ? <Empty msg="No risks recorded for this pillar." /> : (
                <ul className="divide-y divide-border">{risks.map((r: any) => (
                  <li key={r.id} className="py-2.5"><div className="flex items-start justify-between gap-2"><span className="text-sm font-medium leading-snug">{r.title}</span><StatusChip label={r.severity} tone={r.severity === "critical" ? "danger" : r.severity === "high" ? "warning" : "muted"} /></div>{r.description && <p className="text-xs text-muted-foreground mt-1 leading-snug">{r.description}</p>}</li>
                ))}</ul>
              )}
            </Section>
            <Section title="Recommendations" icon={<Lightbulb className="h-4 w-4" />}>
              {recs.length === 0 ? <Empty msg="No recommendations." /> : (
                <ul className="divide-y divide-border">{recs.map((r: any) => (
                  <li key={r.id} className="py-2.5"><div className="flex items-start justify-between gap-2"><span className="text-sm font-medium leading-snug">{r.title}</span><StatusChip label={r.priority} tone={r.priority === "critical" ? "danger" : r.priority === "high" ? "warning" : "primary"} /></div>{r.rationale && <p className="text-xs text-muted-foreground mt-1 leading-snug">{r.rationale}</p>}</li>
                ))}</ul>
              )}
            </Section>
          </div>
        </div>

        <aside className="space-y-6">
          {pa && organisationId && (
            <>
              <ReviewPanel pa={pa} assessmentId={id} organisationId={organisationId} pillarName={pillar.name} />
              <StatusTransitionPanel pa={pa} onChange={(s) => transition.mutate(s)} />
              <EvidencePanel assessmentId={id} organisationId={organisationId} pillarAssessmentId={pa.id} />
              <SurveyPublishPanel assessmentId={id} pillarId={pillarId} pillarName={pillar.name} />
            </>
          )}
          <Section title="Review comments" icon={<MessageSquare className="h-4 w-4" />}>
            {comments.length === 0 ? <Empty msg="No reviewer comments yet." /> : (
              <ul className="space-y-3">{comments.map((c: any) => (
                <li key={c.id} className="text-sm">
                  <div className="flex items-center justify-between gap-2"><span className="eyebrow">{c.decision ?? "Comment"}</span><span className="text-[10px] text-muted-foreground">{fmtRelative(c.created_at)}</span></div>
                  <p className="mt-1 leading-snug">{c.comment}</p>
                </li>
              ))}</ul>
            )}
          </Section>
          <Section title="Override history" icon={<History className="h-4 w-4" />}>
            {overrides.length === 0 ? <Empty msg="No score overrides." /> : (
              <ul className="space-y-3">{overrides.map((o: any) => (
                <li key={o.id} className="text-sm">
                  <div className="flex items-center justify-between gap-2"><span className="font-mono text-xs">{o.previous_score ?? "—"} → <span className="font-semibold">{o.new_score}</span></span><span className="text-[10px] text-muted-foreground">{fmtRelative(o.created_at)}</span></div>
                  <p className="text-xs text-muted-foreground mt-1 leading-snug">{o.rationale}</p>
                </li>
              ))}</ul>
            )}
          </Section>
          <div className="border border-border rounded-sm bg-secondary/40 p-4 text-xs leading-snug">
            <div className="font-medium mb-1 text-foreground">Human review required</div>
            <p className="text-muted-foreground">A pillar cannot move to <span className="font-mono text-foreground">Complete</span> without a reviewer approval. The assessment cannot be finalised until all seven pillars are complete.</p>
          </div>
        </aside>
      </div>
    </>
  );
}

function Section({ title, icon, sub, children }: { title: string; icon: React.ReactNode; sub?: string; children: React.ReactNode }) {
  return (
    <div className="border border-border rounded-sm bg-card p-4">
      <div className="flex items-center justify-between gap-2 mb-3 pb-3 border-b border-border">
        <div className="flex items-center gap-2"><span className="text-primary">{icon}</span><h3 className="font-medium text-sm">{title}</h3></div>
        {sub && <span className="eyebrow">{sub}</span>}
      </div>
      {children}
    </div>
  );
}
function Empty({ msg }: { msg: string }) { return <p className="text-sm text-muted-foreground py-1">{msg}</p>; }
function ExplainBlock({ label, body, accent }: { label: string; body: string; accent?: boolean }) {
  return (
    <div>
      <div className="eyebrow mb-1.5">{label}</div>
      <p className={`text-sm leading-snug ${accent ? "border-l-2 border-primary pl-3" : ""}`}>{body}</p>
    </div>
  );
}
function ExplainList({ label, items, tone }: { label: string; items: string[]; tone?: string }) {
  return (
    <div>
      <div className="eyebrow mb-1.5">{label}</div>
      {items.length === 0 ? <p className="text-xs text-muted-foreground">None recorded.</p> : (
        <ul className="space-y-1.5 text-sm">{items.map((it, i) => (
          <li key={i} className="flex items-start gap-2"><span className={`mt-1.5 h-1 w-1 rounded-full ${tone === "warning" ? "bg-[var(--warning)]" : "bg-primary"} shrink-0`} /><span className="leading-snug">{it}</span></li>
        ))}</ul>
      )}
    </div>
  );
}