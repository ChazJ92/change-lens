import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { getMockSupabaseClient } from "@/lib/mock";

/**
 * Set to `false` to use the real Supabase browser client instead of the
 * localStorage-backed mock data layer. This is the single switch that makes the
 * mock layer explicitly replaceable by a Supabase-backed implementation.
 */
export const USE_MOCK_DATA = true;

let browserClientPromise: Promise<SupabaseClient<Database>> | undefined;

export async function getSupabaseBrowserClient() {
  if (typeof window === "undefined") {
    throw new Error("The browser database client is not available during server rendering.");
  }

  if (USE_MOCK_DATA) {
    // The mock client mirrors the Supabase surface the app uses.
    return getMockSupabaseClient() as unknown as SupabaseClient<Database>;
  }

  browserClientPromise ??= import("@/integrations/supabase/client").then(
    ({ supabase }) => supabase,
  );

  return browserClientPromise;
}