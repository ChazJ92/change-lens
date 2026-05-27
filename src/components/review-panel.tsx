import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldCheck, MessageSquareWarning, Pencil, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { mapScore } from "@/lib/scoring";

/**
 * Reviewer / Change Owner panel. Lives on the pillar detail page.
 * Provides three enterprise-grade actions:
 *   1. Approve         → status = complete
 *   2. Request changes → status = changes_requested + reviewer comment required
 *   3. Override score  → writes score_overrides row + updates final_score; rationale required
 */
export function ReviewPanel({
  pa,
  assessmentId,
  organisationId,
  pillarName,
}: {
  pa: any;
  assessmentId: string;
  organisationId: string;
  pillarName: string;
}) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [mode, setMode] = useState<"idle" | "changes" | "override">("idle");
  const [comment, setComment] = useState("");
  const [newScore, setNewScore] = useState<string>(
    pa?.final_score != null ? String(pa.final_score) : pa?.provisional_score != null ? String(pa.provisional_score) : "",
  );
  const [rationale, setRationale] = useState("");

  function invalidate() {
    qc.invalidateQueries({ queryKey: ["pillar"] });
    qc.invalidateQueries({ queryKey: ["assessment"] });
    qc.invalidateQueries({ queryKey: ["reviews"] });
    qc.invalidateQueries({ queryKey: ["activity"] });
  }

  const approve = useMutation({
    mutationFn: async () => {
      const supabase = await getSupabaseBrowserClient();
      const finalScore = pa.final_score ?? pa.provisional_score;
      const upd: any = { status: "complete", reviewed_at: new Date().toISOString() };
      if (pa.final_score == null && finalScore != null) upd.final_score = finalScore;
      const { error } = await supabase.from("pillar_assessments").update(upd).eq("id", pa.id);
      if (error) throw error;
      await supabase.from("review_comments").insert({
        pillar_assessment_id: pa.id,
        author_id: user!.id,
        decision: "approved",
        comment: comment.trim() || `Approved — pillar ${pillarName} signed off.`,
      });
      await supabase.from("audit_logs").insert({
        organisation_id: organisationId,
        assessment_id: assessmentId,
        actor_id: user!.id,
        actor_email: user!.email,
        event_type: "pillar_approved",
        detail: { note: `Approved pillar "${pillarName}"`, pillar_assessment_id: pa.id },
      });
    },
    onSuccess: () => {
      toast.success("Pillar approved");
      setComment("");
      setMode("idle");
      invalidate();
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  const requestChanges = useMutation({
    mutationFn: async () => {
      if (!comment.trim()) throw new Error("A note is required when requesting changes.");
      const supabase = await getSupabaseBrowserClient();
      const { error } = await supabase
        .from("pillar_assessments")
        .update({ status: "changes_requested" })
        .eq("id", pa.id);
      if (error) throw error;
      await supabase.from("review_comments").insert({
        pillar_assessment_id: pa.id,
        author_id: user!.id,
        decision: "changes_requested",
        comment: comment.trim(),
      });
      await supabase.from("audit_logs").insert({
        organisation_id: organisationId,
        assessment_id: assessmentId,
        actor_id: user!.id,
        actor_email: user!.email,
        event_type: "changes_requested",
        detail: { note: `Requested changes on "${pillarName}"`, comment: comment.trim() },
      });
    },
    onSuccess: () => {
      toast.success("Changes requested");
      setComment("");
      setMode("idle");
      invalidate();
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  const override = useMutation({
    mutationFn: async () => {
      const ns = Number(newScore);
      if (!Number.isFinite(ns) || ns < 1 || ns > 5) throw new Error("Score must be between 1 and 5.");
      if (!rationale.trim() || rationale.trim().length < 8) throw new Error("Rationale is required (min 8 chars).");
      const supabase = await getSupabaseBrowserClient();
      const previous = pa.final_score ?? pa.provisional_score ?? null;
      const { error: e1 } = await supabase.from("score_overrides").insert({
        pillar_assessment_id: pa.id,
        author_id: user!.id,
        previous_score: previous,
        new_score: ns,
        rationale: rationale.trim(),
      });
      if (e1) throw e1;
      const { error: e2 } = await supabase
        .from("pillar_assessments")
        .update({ final_score: ns, status: pa.status === "complete" ? "complete" : "ready_for_review" })
        .eq("id", pa.id);
      if (e2) throw e2;
      await supabase.from("audit_logs").insert({
        organisation_id: organisationId,
        assessment_id: assessmentId,
        actor_id: user!.id,
        actor_email: user!.email,
        event_type: "score_overridden",
        detail: { note: `Overrode score on "${pillarName}" from ${previous ?? "—"} to ${ns}`, rationale: rationale.trim() },
      });
    },
    onSuccess: () => {
      toast.success("Score overridden");
      setRationale("");
      setMode("idle");
      invalidate();
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  const isComplete = pa?.status === "complete";

  return (
    <div className="border border-border rounded-sm bg-card">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <h3 className="font-medium text-sm">Reviewer decision</h3>
        </div>
        <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
          Change Owner gate
        </span>
      </div>
      <div className="p-4 space-y-3">
        {mode === "idle" && (
          <>
            <p className="text-xs text-muted-foreground leading-snug">
              Every pillar requires explicit reviewer sign-off before it can move
              to <span className="font-mono text-foreground">Complete</span>.
              Overrides are recorded with rationale and surfaced in the final
              report.
            </p>
            <div className="grid grid-cols-1 gap-2">
              <Button
                size="sm"
                onClick={() => approve.mutate()}
                disabled={approve.isPending || isComplete}
                className="justify-start"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                {isComplete ? "Already complete" : "Approve pillar"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setMode("changes")} className="justify-start">
                <MessageSquareWarning className="h-3.5 w-3.5" /> Request changes
              </Button>
              <Button size="sm" variant="outline" onClick={() => setMode("override")} className="justify-start">
                <Pencil className="h-3.5 w-3.5" /> Override score
              </Button>
            </div>
          </>
        )}

        {mode === "changes" && (
          <>
            <Label className="text-xs">Required: note for the pillar lead</Label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              placeholder="What needs to change before this pillar can be approved?"
              maxLength={2000}
            />
            <div className="flex items-center gap-2 justify-end">
              <Button size="sm" variant="ghost" onClick={() => setMode("idle")}>Cancel</Button>
              <Button size="sm" onClick={() => requestChanges.mutate()} disabled={requestChanges.isPending || !comment.trim()}>
                {requestChanges.isPending ? "Saving…" : "Send to pillar lead"}
              </Button>
            </div>
          </>
        )}

        {mode === "override" && (
          <>
            <div className="grid grid-cols-[120px_1fr] gap-3 items-end">
              <div>
                <Label className="text-xs">New score (1–5)</Label>
                <Input
                  type="number"
                  min={1}
                  max={5}
                  step={0.1}
                  value={newScore}
                  onChange={(e) => setNewScore(e.target.value)}
                />
                <div className="text-[10px] text-muted-foreground font-mono mt-1">
                  ≈ {mapScore(Number(newScore)) ?? "—"} /100
                </div>
              </div>
              <div className="text-[11px] text-muted-foreground leading-snug">
                Will create an audit-logged override. The final report shows the
                AI/provisional score, your override, and the rationale side-by-side.
              </div>
            </div>
            <div>
              <Label className="text-xs">Required: rationale</Label>
              <Textarea
                value={rationale}
                onChange={(e) => setRationale(e.target.value)}
                rows={4}
                placeholder="Why is the reviewer overriding the score? Reference evidence or stakeholder context."
                maxLength={2000}
              />
            </div>
            <div className="flex items-center gap-2 justify-end">
              <Button size="sm" variant="ghost" onClick={() => setMode("idle")}>Cancel</Button>
              <Button size="sm" onClick={() => override.mutate()} disabled={override.isPending}>
                {override.isPending ? "Saving…" : "Record override"}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function StatusTransitionPanel({
  pa,
  onChange,
}: {
  pa: any;
  onChange: (status: string) => void;
}) {
  const next: Record<string, { label: string; to: string } | null> = {
    not_started: { label: "Start pillar", to: "in_progress" },
    in_progress: { label: "Submit for review", to: "ready_for_review" },
    awaiting_evidence: { label: "Mark evidence received", to: "in_progress" },
    awaiting_stakeholder_input: { label: "Mark survey closed", to: "in_progress" },
    ai_analysis_complete: { label: "Submit for review", to: "ready_for_review" },
    changes_requested: { label: "Resubmit for review", to: "ready_for_review" },
    ready_for_review: null,
    ready_for_ai_analysis: null,
    complete: null,
  };
  const action = next[pa?.status ?? "not_started"];
  if (!action) return null;
  return (
    <Button size="sm" variant="outline" className="w-full" onClick={() => onChange(action.to)}>
      {action.label} →
    </Button>
  );
}