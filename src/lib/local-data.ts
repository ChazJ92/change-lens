import { getLocalDataClient } from "@/lib/data";

/**
 * Returns the singleton browser data client (Dexie-backed).
 * Throws during server rendering — callers must run in the browser.
 */
export async function getBrowserDataClient() {
  if (typeof window === "undefined") {
    throw new Error("The browser data client is not available during server rendering.");
  }
  return getLocalDataClient();
}
