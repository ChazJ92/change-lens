/**
 * localStorage-backed mock data layer.
 *
 * Public surface for the rest of the app:
 * - `mockRepositories` — typed repositories/services (the replaceable seam).
 * - `getMockSupabaseClient` — Supabase-compatible adapter used by existing screens.
 * - `resetMockData` / `reseedMockData` — demo data reset.
 * - `MOCK_USER` — the signed-in user the mock auth returns.
 *
 * To switch to a real Supabase backend later, implement `DataRepositories`
 * against Supabase and return the real client from `supabase-browser.ts`.
 */
export { mockRepositories, type DataRepositories, type Repository } from "./repositories";
export { getMockSupabaseClient } from "./client";
export { resetMockData, reseedMockData } from "./store";
export { MOCK_USER, MOCK_SESSION } from "./seed";
export type { MockDb, TableName, Row } from "./db";