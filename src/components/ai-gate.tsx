import { Link } from "@tanstack/react-router";
import { Lock, Sparkles, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { aiEnabled, type AiSettings, PROVIDER_LABELS } from "@/lib/ai-config";

/**
 * Inline lock pill shown next to disabled AI actions.
 */
export function AiLockBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm text-[11px] font-medium border border-border bg-secondary text-muted-foreground">
      <Lock className="h-3 w-3" /> AI off
    </span>
  );
}

/**
 * Wraps an AI action button. If AI is not configured, disables the action
 * and shows a clear inline call-to-action to configure a key.
 */
export function AiActionButton({
  settings,
  onRun,
  label = "Run AI analysis",
  size = "sm",
}: {
  settings: AiSettings | null | undefined;
  onRun?: () => void;
  label?: string;
  size?: "sm" | "default";
}) {
  if (aiEnabled(settings)) {
    return (
      <Button size={size} onClick={onRun}>
        <Sparkles className="h-3.5 w-3.5" /> {label}
      </Button>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <Button size={size} variant="outline" disabled className="cursor-not-allowed">
        <Lock className="h-3.5 w-3.5" /> {label}
      </Button>
      <Button asChild size={size} variant="ghost" className="text-primary">
        <Link to="/app/settings/ai">Configure AI →</Link>
      </Button>
    </div>
  );
}

/**
 * Full-width banner shown at the top of pages where AI is the headline value.
 */
export function AiConfigBanner({
  settings,
  className,
}: {
  settings: AiSettings | null | undefined;
  className?: string;
}) {
  if (aiEnabled(settings)) {
    return (
      <div
        className={cn(
          "flex items-center gap-3 rounded-sm border px-3 py-2 text-xs",
          "border-[color-mix(in_oklab,var(--success)_30%,transparent)] bg-[color-mix(in_oklab,var(--success)_8%,transparent)]",
          className,
        )}
      >
        <ShieldCheck className="h-4 w-4" style={{ color: "var(--success)" }} />
        <div className="flex-1">
          <span className="font-medium text-foreground">
            {PROVIDER_LABELS[settings!.provider]} · {settings!.model}
          </span>{" "}
          <span className="text-muted-foreground">
            verified · key ending {settings!.api_key_last4}. AI analysis is
            enabled for this organisation.
          </span>
        </div>
        <Link to="/app/settings/ai" className="text-[var(--success)] hover:underline">
          Manage
        </Link>
      </div>
    );
  }
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-sm border px-3 py-2 text-xs",
        "border-[color-mix(in_oklab,var(--warning)_30%,transparent)] bg-[color-mix(in_oklab,var(--warning)_8%,transparent)]",
        className,
      )}
    >
      <Lock className="h-4 w-4" style={{ color: "var(--warning)" }} />
      <div className="flex-1">
        <span className="font-medium text-foreground">AI not configured.</span>{" "}
        <span className="text-muted-foreground">
          The platform works fully without AI — record scores, evidence, and
          reviewer decisions manually. Add a verified OpenAI key to unlock
          rationale, evidence triage, and confidence scoring.
        </span>
      </div>
      <Link to="/app/settings/ai" className="text-[var(--warning)] hover:underline whitespace-nowrap">
        Configure AI →
      </Link>
    </div>
  );
}