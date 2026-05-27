import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { z } from "zod";

const BodySchema = z.object({
  organisationId: z.string().uuid(),
  provider: z.enum(["openai", "anthropic", "gemini"]),
  model: z.string().min(1).max(100),
  apiKey: z.string().min(8).max(500),
  save: z.boolean().default(false),
});

async function verifyOpenAI(apiKey: string, model: string) {
  // Cheap, deterministic check: GET /v1/models. If the user wants to be strict
  // about model availability, we also try fetching the specific model.
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
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`);
  if (res.status === 401 || res.status === 403) return { ok: false as const, status: "Invalid key (401/403)" };
  if (!res.ok) return { ok: false as const, status: `Provider returned ${res.status}` };
  return { ok: true as const, status: "Verified" };
}

export const Route = createFileRoute("/api/ai/verify")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const auth = request.headers.get("authorization");
          const token = auth?.replace(/^Bearer\s+/i, "");
          if (!token) {
            return Response.json({ ok: false, error: "Missing bearer token" }, { status: 401 });
          }

          // Validate the bearer token against Supabase auth
          const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
          const publishable =
            process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
          if (!supabaseUrl || !publishable) {
            return Response.json({ ok: false, error: "Server misconfigured" }, { status: 500 });
          }
          const userClient = createClient(supabaseUrl, publishable, {
            global: { headers: { Authorization: `Bearer ${token}` } },
            auth: { persistSession: false, autoRefreshToken: false },
          });
          const { data: userData, error: userErr } = await userClient.auth.getUser(token);
          if (userErr || !userData?.user) {
            return Response.json({ ok: false, error: "Invalid session" }, { status: 401 });
          }
          const userId = userData.user.id;

          const json = await request.json();
          const parsed = BodySchema.safeParse(json);
          if (!parsed.success) {
            return Response.json({ ok: false, error: "Bad request", issues: parsed.error.issues }, { status: 400 });
          }
          const { organisationId, provider, model, apiKey, save } = parsed.data;

          // Check org admin
          const { data: adminRow } = await supabaseAdmin
            .from("user_roles")
            .select("user_id")
            .eq("user_id", userId)
            .eq("organisation_id", organisationId)
            .eq("role", "org_admin")
            .maybeSingle();
          if (!adminRow) {
            return Response.json({ ok: false, error: "Only organisation admins can update AI settings" }, { status: 403 });
          }

          // Verify with provider
          let result: { ok: boolean; status: string };
          if (provider === "openai") result = await verifyOpenAI(apiKey, model);
          else if (provider === "anthropic") result = await verifyAnthropic(apiKey);
          else result = await verifyGemini(apiKey);

          if (!save) {
            return Response.json(result);
          }

          // Save: settings row + key row (admin client bypasses RLS — table is locked down)
          const last4 = apiKey.slice(-4);
          const verifiedAt = new Date().toISOString();

          const { error: e1 } = await supabaseAdmin.from("organisation_ai_settings").upsert({
            organisation_id: organisationId,
            provider,
            model,
            api_key_last4: last4,
            is_active: result.ok,
            last_verified_at: verifiedAt,
            last_verified_status: result.status,
            updated_at: verifiedAt,
            updated_by: userId,
          });
          if (e1) return Response.json({ ok: false, error: e1.message }, { status: 500 });

          if (result.ok) {
            // Encrypt-at-rest substitute: base64. Real deployments should wrap pgcrypto.
            const encrypted = Buffer.from(apiKey, "utf8").toString("base64");
            const { error: e2 } = await supabaseAdmin.from("organisation_ai_keys").upsert({
              organisation_id: organisationId,
              encrypted_key: encrypted,
              updated_at: verifiedAt,
            });
            if (e2) return Response.json({ ok: false, error: e2.message }, { status: 500 });
          }

          await supabaseAdmin.from("audit_logs").insert({
            organisation_id: organisationId,
            actor_id: userId,
            actor_email: userData.user.email,
            event_type: result.ok ? "ai_key_verified" : "ai_key_verification_failed",
            detail: { provider, model, status: result.status },
          });

          return Response.json({ ok: result.ok, status: result.status, saved: true });
        } catch (err: any) {
          console.error("/api/ai/verify error", err);
          return Response.json({ ok: false, error: err?.message ?? "Server error" }, { status: 500 });
        }
      },
    },
  },
});