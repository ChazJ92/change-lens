/**
 * Local-first data layer — browser persistence and typed repositories.
 *
 * - `repositories` — domain repositories (the replaceable seam for a future backend).
 * - `getLocalDataClient` — query-builder adapter used by screens with embedded selects.
 * - `resetLocalData` / `reseedLocalData` — demo data reset.
 * - `LOCAL_USER` / `LOCAL_SESSION` — the signed-in user for local operation.
 */
export { repositories, type DataRepositories, type Repository } from "./repositories";
export { getLocalDataClient } from "./client";
export { resetLocalData, reseedLocalData } from "./store";
export { LOCAL_USER, LOCAL_SESSION, type AppUser, type AppSession } from "./seed";
export type { LocalDb, TableName, Row } from "./db";
