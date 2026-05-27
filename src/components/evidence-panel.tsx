import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Upload, FileText, Loader2, ExternalLink, Trash2 } from "lucide-react";
import { fmtRelative } from "@/lib/scoring";

type Props = {
  assessmentId: string;
  organisationId: string;
  pillarAssessmentId?: string;
};

export function EvidencePanel({ assessmentId, organisationId, pillarAssessmentId }: Props) {
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["evidence", pillarAssessmentId ?? assessmentId],
    queryFn: async () => {
      const supabase = await getSupabaseBrowserClient();
      const q = supabase
        .from("evidence_items")
        .select("*")
        .eq("assessment_id", assessmentId)
        .order("created_at", { ascending: false });
      const { data, error } = pillarAssessmentId
        ? await q.eq("pillar_assessment_id", pillarAssessmentId)
        : await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const remove = useMutation({
    mutationFn: async (item: any) => {
      const supabase = await getSupabaseBrowserClient();
      if (item.storage_path) await supabase.storage.from("evidence").remove([item.storage_path]);
      const { error } = await supabase.from("evidence_items").delete().eq("id", item.id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["evidence"] }); toast.success("Evidence removed"); },
    onError: (e: any) => toast.error(e.message ?? "Failed to remove"),
  });

  async function openSigned(path: string) {
    const supabase = await getSupabaseBrowserClient();
    const { data, error } = await supabase.storage.from("evidence").createSignedUrl(path, 60 * 10);
    if (error || !data) { toast.error(error?.message ?? "Could not generate link"); return; }
    window.open(data.signedUrl, "_blank", "noopener");
  }

  async function onFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    const supabase = await getSupabaseBrowserClient();
    try {
      for (const file of Array.from(files)) {
        if (file.size > 25 * 1024 * 1024) { toast.error(`${file.name}: exceeds 25 MB`); continue; }
        const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `${organisationId}/${assessmentId}/${crypto.randomUUID()}-${safe}`;
        const { error: upErr } = await supabase.storage.from("evidence").upload(path, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type || "application/octet-stream",
        });
        if (upErr) { toast.error(`${file.name}: ${upErr.message}`); continue; }
        const { data: userRes } = await supabase.auth.getUser();
        const { error: insErr } = await supabase.from("evidence_items").insert({
          organisation_id: organisationId,
          assessment_id: assessmentId,
          pillar_assessment_id: pillarAssessmentId ?? null,
          file_name: file.name,
          file_type: file.type || null,
          storage_path: path,
          evidence_type: "other",
          processing_status: "uploaded",
          uploaded_by: userRes.user?.id ?? null,
        });
        if (insErr) toast.error(`${file.name}: ${insErr.message}`);
      }
      toast.success("Evidence uploaded");
      qc.invalidateQueries({ queryKey: ["evidence"] });
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="border border-border rounded-sm bg-card p-4">
      <div className="flex items-center justify-between gap-2 mb-3 pb-3 border-b border-border">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          <h3 className="font-medium text-sm">Evidence</h3>
          <span className="eyebrow">{items.length} file{items.length === 1 ? "" : "s"}</span>
        </div>
        <Button size="sm" variant="outline" onClick={() => inputRef.current?.click()} disabled={uploading}>
          {uploading ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading…</> : <><Upload className="h-3.5 w-3.5" /> Add files</>}
        </Button>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => onFiles(e.target.files)}
        />
      </div>
      {isLoading ? (
        <p className="text-sm text-muted-foreground py-2">Loading evidence…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground py-2">
          No evidence uploaded yet. Files are stored privately and accessed via short-lived signed links.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {items.map((it: any) => (
            <li key={it.id} className="py-2.5 flex items-start gap-3">
              <FileText className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium truncate">{it.file_name}</span>
                  <span className="text-[10px] text-muted-foreground font-mono whitespace-nowrap">{fmtRelative(it.created_at)}</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="eyebrow">{it.processing_status}</span>
                  {it.storage_path && (
                    <button
                      type="button"
                      onClick={() => openSigned(it.storage_path)}
                      className="text-[11px] text-primary hover:underline inline-flex items-center gap-1"
                    >
                      <ExternalLink className="h-3 w-3" /> Open
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => { if (confirm("Remove this evidence?")) remove.mutate(it); }}
                    className="text-[11px] text-muted-foreground hover:text-destructive inline-flex items-center gap-1 ml-auto"
                  >
                    <Trash2 className="h-3 w-3" /> Remove
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}