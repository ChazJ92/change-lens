import { useQuery } from "@tanstack/react-query";
import { getBrowserDataClient } from "@/lib/local-data";

export type AiSettings = {
  organisation_id: string;
  provider: "openai" | "anthropic" | "gemini";
  model: string;
  is_active: boolean;
  api_key_last4: string | null;
  last_verified_at: string | null;
  last_verified_status: string | null;
};

export function useAiSettings(orgId?: string) {
  return useQuery({
    queryKey: ["ai-settings", orgId],
    enabled: !!orgId,
    queryFn: async (): Promise<AiSettings | null> => {
      const db = await getBrowserDataClient();
      const { data } = await db
        .from("organisation_ai_settings")
        .select("*")
        .eq("organisation_id", orgId!)
        .maybeSingle();
      return (data as AiSettings) ?? null;
    },
  });
}

export function aiEnabled(s?: AiSettings | null) {
  return !!s?.is_active && !!s?.api_key_last4;
}

export const PROVIDER_LABELS: Record<string, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  gemini: "Google Gemini",
};

export const PROVIDER_MODELS: Record<string, string[]> = {
  openai: ["gpt-4o-mini", "gpt-4o", "gpt-4.1-mini", "gpt-4.1"],
  anthropic: ["claude-3-5-sonnet-latest", "claude-3-5-haiku-latest"],
  gemini: ["gemini-1.5-flash", "gemini-1.5-pro"],
};
