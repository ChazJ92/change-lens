import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

let browserClientPromise: Promise<SupabaseClient<Database>> | undefined;

export async function getSupabaseBrowserClient() {
  if (typeof window === "undefined") {
    throw new Error("The browser database client is not available during server rendering.");
  }

  browserClientPromise ??= import("@/integrations/supabase/client").then(
    ({ supabase }) => supabase,
  );

  return browserClientPromise;
}