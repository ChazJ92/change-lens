import { getBrowserDataClient } from "@/lib/local-data";
import { LOCAL_USER } from "@/lib/data";

export type AiVerifyResult = { ok: boolean; status: string; saved?: boolean };

async function verifyOpenAI(apiKey: string, model: string) {
  const res = await fetch("https://api.openai.com/v1/models", {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (res.status === 401 || res.status === 403) {
    return { ok: false as const, status: "Invalid key (401/403)" };
  }
  if (!res.ok) {
    return { ok: false as const, status: `Provider returned ${res.status}` };
  }
  const data = (await res.json()) as { data?: Array<{ id: string }> };
  const ids = (data.data ?? []).map((d) => d.id);
  if (model && !ids.includes(model)) {
    return { ok: false as const, status: `Model "${model}" not available on this key` };
  }
  return { ok: true as const, status: "Verified" };
}

async function verifyAnthropic(apiKey: string) {
  const res = await fetch("https://api.anthropic.com/v1/models", {
    headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
  });
  if (res.status === 401 || res.status === 403) return { ok: false as const, status: "Invalid key (401/403)" };
  if (!res.ok) return { ok: false as const, status: `Provider returned ${res.status}` };
  return { ok: true as const, status: "Verified" };
}

async function verifyGemini(apiKey: string) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`,
  );
  if (res.status === 401 || res.status === 403) return { ok: false as const, status: "Invalid key (401/403)" };
  if (!res.ok) return { ok: false as const, status: `Provider returned ${res.status}` };
  return { ok: true as const, status: "Verified" };
}

async function assertOrgAdmin(organisationId: string, userId: string) {
  const db = await getBrowserDataClient();
  const { data } = await db
    .from("user_roles")
    .select("user_id")
    .eq("user_id", userId)
    .eq("organisation_id", organisationId)
    .eq("role", "org_admin")
    .maybeSingle();
  if (!data) throw new Error("Only organisation admins can update AI settings");
}

export async function verifyAndMaybeSaveAiSettings(input: {
  organisationId: string;
  provider: "openai" | "anthropic" | "gemini";
  model: string;
  apiKey: string;
  save: boolean;
}): Promise<AiVerifyResult> {
  const { organisationId, provider, model, apiKey, save } = input;
  await assertOrgAdmin(organisationId, LOCAL_USER.id);

  let result: { ok: boolean; status: string };
  if (provider === "openai") result = await verifyOpenAI(apiKey, model);
  else if (provider === "anthropic") result = await verifyAnthropic(apiKey);
  else result = await verifyGemini(apiKey);

  if (!save) return result;

  const db = await getBrowserDataClient();
  const last4 = apiKey.slice(-4);
  const verifiedAt = new Date().toISOString();

  const { error: e1 } = await db.from("organisation_ai_settings").upsert({
    organisation_id: organisationId,
    provider,
    model,
    api_key_last4: last4,
    is_active: result.ok,
    last_verified_at: verifiedAt,
    last_verified_status: result.status,
    updated_at: verifiedAt,
    updated_by: LOCAL_USER.id,
  });
  if (e1) throw new Error(e1.message);

  if (result.ok) {
    const encrypted = btoa(apiKey);
    const { error: e2 } = await db.from("organisation_ai_keys").upsert({
      organisation_id: organisationId,
      encrypted_key: encrypted,
      updated_at: verifiedAt,
    });
    if (e2) throw new Error(e2.message);
  }

  await db.from("audit_logs").insert({
    organisation_id: organisationId,
    actor_id: LOCAL_USER.id,
    actor_email: LOCAL_USER.email,
    event_type: result.ok ? "ai_key_verified" : "ai_key_verification_failed",
    detail: { provider, model, status: result.status },
  });

  return { ...result, saved: true };
}
