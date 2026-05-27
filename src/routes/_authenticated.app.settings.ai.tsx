import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { useCurrentOrg, PageHeader, StatusChip } from "@/components/app-shell";
import { useAiSettings, PROVIDER_LABELS, PROVIDER_MODELS } from "@/lib/ai-config";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShieldCheck, KeyRound, ShieldAlert, Loader2, Sparkles, Eye, EyeOff, Info } from "lucide-react";
import { toast } from "sonner";
import { fmtRelative } from "@/lib/scoring";

export const Route = createFileRoute("/_authenticated/app/settings/ai")({
  component: AiSettingsPage,
});

type Provider = "openai" | "anthropic" | "gemini";

function AiSettingsPage() {
  const { data: orgData } = useCurrentOrg();
  const orgId = orgData?.current?.id;
  const { data: settings, isLoading } = useAiSettings(orgId);
  const qc = useQueryClient();

  const [provider, setProvider] = useState<Provider>("openai");
  const [model, setModel] = useState<string>("gpt-4o-mini");
  const [apiKey, setApiKey] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState<null | "test" | "save">(null);
  const [testResult, setTestResult] = useState<{ ok: boolean; status: string } | null>(null);

  useEffect(() => {
    if (settings) {
      setProvider(settings.provider);
      setModel(settings.model);
    }
  }, [settings]);

  const models = useMemo(() => PROVIDER_MODELS[provider] ?? [], [provider]);

  async function call(action: "test" | "save") {
    if (!orgId) return;
    if (!apiKey.trim()) {
      toast.error("Enter your API key first.");
      return;
    }
    setBusy(action);
    setTestResult(null);
    try {
      const supabase = await getSupabaseBrowserClient();
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("Not signed in");
      const res = await fetch("/api/ai/verify", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify({ organisationId: orgId, provider, model, apiKey, save: action === "save" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? `HTTP ${res.status}`);
      setTestResult({ ok: !!json.ok, status: json.status ?? "Unknown" });
      if (action === "save") {
        if (json.ok) {
          toast.success("AI configuration saved and activated.");
          setApiKey("");
        } else {
          toast.error(`Saved but inactive — ${json.status ?? "verification failed"}`);
        }
        qc.invalidateQueries({ queryKey: ["ai-settings", orgId] });
        qc.invalidateQueries({ queryKey: ["activity"] });
      } else {
        toast[json.ok ? "success" : "error"](json.ok ? "Key verified" : json.status ?? "Verification failed");
      }
    } catch (e: any) {
      toast.error(e.message ?? "Request failed");
      setTestResult({ ok: false, status: e.message ?? "Request failed" });
    } finally {
      setBusy(null);
    }
  }

  async function disableAi() {
    if (!orgId) return;
    const supabase = await getSupabaseBrowserClient();
    const { error } = await supabase
      .from("organisation_ai_settings")
      .update({ is_active: false })
      .eq("organisation_id", orgId);
    if (error) return toast.error(error.message);
    toast.success("AI disabled for this organisation");
    qc.invalidateQueries({ queryKey: ["ai-settings", orgId] });
  }

  const active = !!settings?.is_active;

  return (
    <>
      <PageHeader
        eyebrow="Organisation settings"
        title="AI configuration"
        description="CORE7 uses bring-your-own-key (BYOK) so AI runs against your own provider account. Verification is required before AI actions are enabled across the organisation."
        actions={
          active ? (
            <StatusChip label="AI enabled" tone="success" />
          ) : settings?.api_key_last4 ? (
            <StatusChip label="Saved · inactive" tone="warning" />
          ) : (
            <StatusChip label="Not configured" tone="muted" />
          )
        }
      />

      <div className="px-8 py-8 max-w-4xl grid lg:grid-cols-[1fr_320px] gap-8">
        <div className="space-y-6">
          <div className="border border-border rounded-sm bg-card">
            <div className="px-5 py-4 border-b border-border flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-primary" />
              <h2 className="font-medium">Provider, model and key</h2>
            </div>
            <div className="p-5 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-4">
                <div>
                  <Label className="text-xs">Provider</Label>
                  <Select value={provider} onValueChange={(v) => { setProvider(v as Provider); setModel(PROVIDER_MODELS[v][0]); }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="openai">OpenAI <span className="text-muted-foreground ml-1 text-[10px]">· production-ready</span></SelectItem>
                      <SelectItem value="anthropic">Anthropic <span className="text-muted-foreground ml-1 text-[10px]">· preview</span></SelectItem>
                      <SelectItem value="gemini">Google Gemini <span className="text-muted-foreground ml-1 text-[10px]">· preview</span></SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Model</Label>
                  <Select value={model} onValueChange={setModel}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {models.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label className="text-xs">API key</Label>
                <div className="relative">
                  <Input
                    type={show ? "text" : "password"}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder={settings?.api_key_last4 ? `••••••••${settings.api_key_last4} — paste a new key to rotate` : provider === "openai" ? "sk-…" : "Paste your key"}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShow((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={show ? "Hide" : "Show"}
                  >
                    {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1.5 leading-snug">
                  Keys are stored encrypted-at-rest and never returned to the
                  client. Only organisation admins can change AI settings.
                </p>
              </div>

              {testResult && (
                <div className={`rounded-sm border px-3 py-2 text-xs flex items-start gap-2 ${testResult.ok
                  ? "border-[color-mix(in_oklab,var(--success)_30%,transparent)] bg-[color-mix(in_oklab,var(--success)_8%,transparent)]"
                  : "border-[color-mix(in_oklab,var(--destructive)_30%,transparent)] bg-[color-mix(in_oklab,var(--destructive)_8%,transparent)]"}`}
                >
                  {testResult.ok ? <ShieldCheck className="h-3.5 w-3.5 mt-0.5" style={{ color: "var(--success)" }} /> : <ShieldAlert className="h-3.5 w-3.5 mt-0.5" style={{ color: "var(--destructive)" }} />}
                  <div>
                    <div className="font-medium">{testResult.ok ? "Key verified with provider" : "Verification failed"}</div>
                    <div className="text-muted-foreground">{testResult.status}</div>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 justify-end pt-2 border-t border-border">
                <Button variant="outline" size="sm" onClick={() => call("test")} disabled={!!busy || !apiKey}>
                  {busy === "test" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                  Test connection
                </Button>
                <Button size="sm" onClick={() => call("save")} disabled={!!busy || !apiKey}>
                  {busy === "save" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                  Verify and save
                </Button>
              </div>
            </div>
          </div>

          {settings?.api_key_last4 && (
            <div className="border border-border rounded-sm bg-card p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="eyebrow mb-1">Current configuration</div>
                  <div className="text-sm">
                    <span className="font-medium">{PROVIDER_LABELS[settings.provider]} · {settings.model}</span>
                    <span className="text-muted-foreground"> · key ending {settings.api_key_last4}</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-1">
                    {settings.last_verified_at ? (
                      <>Last verified {fmtRelative(settings.last_verified_at)} · {settings.last_verified_status}</>
                    ) : "Never verified"}
                  </div>
                </div>
                {active && (
                  <Button variant="outline" size="sm" onClick={disableAi}>Disable AI</Button>
                )}
              </div>
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <div className="border border-border rounded-sm bg-secondary/40 p-4 text-xs leading-snug">
            <div className="flex items-center gap-2 mb-2 text-foreground">
              <Info className="h-3.5 w-3.5" /> <span className="font-medium">Why BYOK?</span>
            </div>
            <p className="text-muted-foreground">
              CORE7 never proxies your evidence through a shared inference
              account. AI calls go from this organisation directly to your
              provider, so prompts, evidence, and rationale stay inside your
              tenancy and your billing.
            </p>
          </div>
          <div className="border border-border rounded-sm bg-card p-4 text-xs">
            <div className="eyebrow mb-2">When AI is off</div>
            <ul className="space-y-1.5 text-muted-foreground">
              <li>✓ Manual scoring, evidence and reviewer workflow stay fully usable</li>
              <li>✓ Stakeholder surveys still publish and aggregate</li>
              <li>✗ Per-pillar rationale and missing-evidence prompts are hidden</li>
              <li>✗ Confidence scores from AI are not generated</li>
            </ul>
          </div>
          {isLoading && <p className="text-xs text-muted-foreground">Loading current configuration…</p>}
        </aside>
      </div>
    </>
  );
}