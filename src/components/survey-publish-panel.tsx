import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getBrowserDataClient } from "@/lib/local-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Users, Link2, CheckCircle2, Clock } from "lucide-react";
import { fmtRelative } from "@/lib/scoring";

type Props = {
  assessmentId: string;
  pillarId: string;
  pillarName: string;
};

export function SurveyPublishPanel({ assessmentId, pillarId, pillarName }: Props) {
  const qc = useQueryClient();
  const [title, setTitle] = useState(`${pillarName} stakeholder input`);
  const [description, setDescription] = useState("");
  const [emails, setEmails] = useState("");

  const { data } = useQuery({
    queryKey: ["surveys", assessmentId, pillarId],
    queryFn: async () => {
      const db = await getBrowserDataClient();
      const { data: surveys } = await db
        .from("surveys")
        .select("*, survey_recipients(*)")
        .eq("assessment_id", assessmentId)
        .eq("pillar_id", pillarId)
        .order("created_at", { ascending: false });
      return surveys ?? [];
    },
  });

  const publish = useMutation({
    mutationFn: async () => {
      const parsedEmails = emails
        .split(/[,\s\n]+/)
        .map((e) => e.trim().toLowerCase())
        .filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
      if (parsedEmails.length === 0) throw new Error("Add at least one valid email");
      const db = await getBrowserDataClient();
      const { data: survey, error } = await db
        .from("surveys")
        .insert({ assessment_id: assessmentId, pillar_id: pillarId, title, description: description || null })
        .select()
        .single();
      if (error) throw error;
      const rows = parsedEmails.map((email) => ({ survey_id: survey.id, email }));
      const { error: e2 } = await db.from("survey_recipients").insert(rows);
      if (e2) throw e2;
      return survey;
    },
    onSuccess: () => {
      toast.success("Survey published — share the links with stakeholders");
      setEmails("");
      qc.invalidateQueries({ queryKey: ["surveys"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to publish"),
  });

  function linkFor(token: string) {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/survey/${token}`;
  }

  return (
    <div className="border border-border rounded-sm bg-card p-4">
      <div className="flex items-center gap-2 mb-3 pb-3 border-b border-border">
        <Users className="h-4 w-4 text-primary" />
        <h3 className="font-medium text-sm">Stakeholder survey</h3>
      </div>

      <div className="space-y-3">
        <div>
          <Label className="text-xs">Title</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />
        </div>
        <div>
          <Label className="text-xs">Description <span className="text-muted-foreground">(optional)</span></Label>
          <Textarea value={description} rows={2} onChange={(e) => setDescription(e.target.value)} maxLength={500} />
        </div>
        <div>
          <Label className="text-xs">Stakeholder emails</Label>
          <Textarea
            value={emails}
            onChange={(e) => setEmails(e.target.value)}
            rows={3}
            placeholder="comma- or newline-separated"
          />
        </div>
        <Button size="sm" onClick={() => publish.mutate()} disabled={publish.isPending} className="w-full">
          {publish.isPending ? "Publishing…" : "Publish & generate links"}
        </Button>
      </div>

      {(data ?? []).length > 0 && (
        <div className="mt-4 pt-4 border-t border-border space-y-3">
          {(data ?? []).map((s: any) => (
            <div key={s.id}>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-xs font-medium truncate">{s.title}</span>
                <span className="text-[10px] text-muted-foreground">{fmtRelative(s.created_at)}</span>
              </div>
              <ul className="space-y-1.5">
                {(s.survey_recipients ?? []).map((r: any) => (
                  <li key={r.id} className="text-[11px] flex items-center gap-2">
                    {r.submitted_at ? (
                      <CheckCircle2 className="h-3 w-3 shrink-0" style={{ color: "var(--success)" }} />
                    ) : (
                      <Clock className="h-3 w-3 shrink-0 text-muted-foreground" />
                    )}
                    <span className="truncate flex-1">{r.email}</span>
                    <button
                      type="button"
                      title="Copy link"
                      onClick={() => {
                        navigator.clipboard.writeText(linkFor(r.token));
                        toast.success("Link copied");
                      }}
                      className="text-primary hover:underline inline-flex items-center gap-1"
                    >
                      <Link2 className="h-3 w-3" /> Copy
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}