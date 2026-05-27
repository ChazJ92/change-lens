import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { CheckCircle2, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { Wordmark } from "@/components/brand";

export const Route = createFileRoute("/survey/$token")({
  head: () => ({ meta: [{ title: "Stakeholder survey — ChangeLens" }] }),
  component: SurveyPage,
});

function SurveyPage() {
  const { token } = Route.useParams();
  const [scores, setScores] = useState<Record<string, number>>({});
  const [comments, setComments] = useState<Record<string, string>>({});

  const { data, isLoading } = useQuery({
    queryKey: ["survey", token],
    queryFn: async () => {
      const supabase = await getSupabaseBrowserClient();
      const { data: rec } = await supabase
        .from("survey_recipients")
        .select("*, surveys(*, pillars(name, description))")
        .eq("token", token)
        .maybeSingle();
      if (!rec) return null;
      const { data: questions } = await supabase
        .from("questions")
        .select("*")
        .eq("pillar_id", (rec as any).surveys.pillar_id)
        .order("display_order");
      return { rec, questions: questions ?? [] };
    },
  });

  const submit = useMutation({
    mutationFn: async () => {
      if (!data) throw new Error("Survey not found");
      const supabase = await getSupabaseBrowserClient();
      const rows = (data.questions as any[]).map((q) => ({
        recipient_id: (data.rec as any).id,
        question_id: q.id,
        score: scores[q.id] ?? null,
        comment: comments[q.id]?.trim() || null,
      }));
      const { error } = await supabase.from("survey_responses").insert(rows);
      if (error) throw error;
      await supabase.from("survey_recipients").update({ submitted_at: new Date().toISOString() }).eq("id", (data.rec as any).id);
    },
    onSuccess: () => toast.success("Thank you — your response has been recorded."),
    onError: (e: any) => toast.error(e.message ?? "Failed to submit"),
  });

  if (isLoading) return <Shell><p className="text-sm text-muted-foreground">Loading survey…</p></Shell>;
  if (!data) return <Shell><h2 className="text-lg font-semibold">Survey not found</h2><p className="text-sm text-muted-foreground mt-2">This link is invalid or has expired.</p></Shell>;

  const rec: any = data.rec;
  const survey: any = rec.surveys;

  if (rec.submitted_at || submit.isSuccess) {
    return (
      <Shell>
        <div className="text-center py-8">
          <CheckCircle2 className="h-10 w-10 mx-auto mb-3" style={{ color: "var(--success)" }} />
          <h2 className="text-xl font-semibold tracking-tight" style={{ color: "var(--navy)" }}>Response received</h2>
          <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
            Thank you. Your input on <span className="font-medium text-foreground">{survey.pillars?.name}</span> has been recorded and will be aggregated anonymously into the readiness assessment.
          </p>
        </div>
      </Shell>
    );
  }

  const ready = data.questions.every((q: any) => scores[q.id] != null);

  return (
    <Shell>
      <div className="eyebrow">{survey.pillars?.name} · stakeholder input</div>
      <h1 className="text-2xl font-semibold tracking-tight mt-1.5" style={{ color: "var(--navy)" }}>{survey.title}</h1>
      {survey.description && <p className="text-sm text-muted-foreground mt-2 max-w-2xl">{survey.description}</p>}
      <div className="mt-4 flex items-center gap-2 text-[11px] text-muted-foreground">
        <ShieldCheck className="h-3.5 w-3.5" /> Responses are anonymous in aggregate. Takes ~3 minutes.
      </div>

      <ol className="mt-8 space-y-6">
        {data.questions.map((q: any, i: number) => (
          <li key={q.id} className="border border-border rounded-sm bg-card p-5">
            <div className="eyebrow">{q.subdimension}</div>
            <p className="text-sm mt-1.5 leading-snug font-medium">{i + 1}. {q.prompt}</p>
            <div className="mt-4 grid grid-cols-5 gap-2">
              {[1, 2, 3, 4, 5].map((n) => {
                const active = scores[q.id] === n;
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setScores((s) => ({ ...s, [q.id]: n }))}
                    className={cn(
                      "border rounded-sm py-2.5 text-center transition-colors",
                      active
                        ? "border-primary bg-primary text-primary-foreground font-semibold"
                        : "border-border bg-background hover:border-primary/50",
                    )}
                  >
                    <div className="text-lg font-mono">{n}</div>
                    <div className="text-[9px] uppercase tracking-wider mt-0.5">
                      {n === 1 ? "Weak" : n === 2 ? "Emerging" : n === 3 ? "OK" : n === 4 ? "Strong" : "Excellent"}
                    </div>
                  </button>
                );
              })}
            </div>
            <Textarea
              className="mt-3"
              rows={2}
              placeholder="Optional: anything specific worth flagging?"
              value={comments[q.id] ?? ""}
              onChange={(e) => setComments((c) => ({ ...c, [q.id]: e.target.value }))}
              maxLength={1000}
            />
          </li>
        ))}
      </ol>

      <div className="mt-8 flex items-center justify-between gap-3 border-t border-border pt-5">
        <span className="text-xs text-muted-foreground">
          {Object.keys(scores).length} of {data.questions.length} answered
        </span>
        <Button onClick={() => submit.mutate()} disabled={!ready || submit.isPending}>
          {submit.isPending ? "Submitting…" : "Submit response"}
        </Button>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background py-10 px-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center mb-8">
          <Wordmark size="sm" />
          <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground ml-auto">Stakeholder survey</span>
        </div>
        {children}
      </div>
    </div>
  );
}