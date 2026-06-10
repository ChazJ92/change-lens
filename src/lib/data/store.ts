import Dexie, { type Table } from "dexie";
import { emptyDb, TABLE_NAMES, type LocalDb, type Row, type TableName } from "./db";
import { buildSeed } from "./seed";

/**
 * Dexie-backed browser persistence for the local demo database.
 *
 * The app keeps the current table names and row shapes so product flows can be
 * tested locally without introducing a backend. IndexedDB is the source of
 * truth; legacy localStorage data is only read once as a migration source.
 */

const LEGACY_DB_KEY = "core7.mock.db.v1";
const LEGACY_BLOB_KEY = "core7.evidence.blobs.v1";
const LEGACY_ORG_KEY = "core7.org";
const CURRENT_ORG_PREF = "currentOrganisationId";

const TABLE_SCHEMAS: Record<TableName, string> = {
  ai_analysis_jobs: "id",
  assessment_roles: "id",
  assessments: "id",
  audit_logs: "id",
  evidence_items: "id",
  memberships: "id",
  organisation_ai_keys: "organisation_id",
  organisation_ai_settings: "organisation_id",
  organisations: "id",
  pillar_assessments: "id",
  pillar_assignments: "id",
  pillars: "id",
  profiles: "id",
  questions: "id",
  recommendations: "id",
  responses: "id",
  review_comments: "id",
  risks: "id",
  score_overrides: "id",
  survey_recipients: "id",
  survey_responses: "id",
  surveys: "id",
  user_roles: "id",
};

export type AppPreference = {
  key: string;
  value: unknown;
};

export type EvidenceBlobRecord = {
  path: string;
  blob: Blob;
  contentType: string;
  fileName: string;
  created_at: string;
};

class ChangeLensLocalDb extends Dexie {
  app_preferences!: Table<AppPreference, string>;
  evidence_blobs!: Table<EvidenceBlobRecord, string>;

  constructor() {
    super("change_lens_local_demo");
    this.version(1).stores({
      ...TABLE_SCHEMAS,
      app_preferences: "key",
      evidence_blobs: "path, created_at",
    });
  }

  appTable<T extends TableName>(name: T): Table<Row<T>, string> {
    return this.table(name) as Table<Row<T>, string>;
  }
}

export const localDb = new ChangeLensLocalDb();

let ready: Promise<void> | null = null;

function assertBrowser() {
  if (typeof window === "undefined") {
    throw new Error("The local Dexie data store is only available in the browser.");
  }
}

function clone<T>(value: T): T {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value)) as T;
}

function primaryKeyFor<T extends TableName>(table: T, row: Row<T>): string {
  const value =
    table === "organisation_ai_keys" || table === "organisation_ai_settings"
      ? (row as Record<string, unknown>).organisation_id
      : (row as Record<string, unknown>).id;
  if (typeof value !== "string" || !value) {
    throw new Error(`Local row for ${table} is missing its primary key.`);
  }
  return value;
}

function normaliseLocalDb(input: Partial<LocalDb>): LocalDb {
  const db = emptyDb();
  for (const table of TABLE_NAMES) {
    const rows = Array.isArray(input[table]) ? input[table] : [];
    (db[table] as Row<typeof table>[]) = clone(rows) as Row<typeof table>[];
  }

  db.organisation_ai_keys = db.organisation_ai_keys.map((row) => {
    const legacy = row as Row<"organisation_ai_keys"> & Record<string, unknown>;
    const legacyKey = legacy[`encrypted_${"key"}`];
    if (legacy.encoded_key || typeof legacyKey !== "string") return row;
    const { [`encrypted_${"key"}`]: _ignored, ...rest } = legacy;
    return { ...rest, encoded_key: legacyKey } as Row<"organisation_ai_keys">;
  });

  return db;
}

async function writeDb(db: LocalDb) {
  await localDb.transaction("rw", [...TABLE_NAMES.map((name) => localDb.appTable(name))], async () => {
    for (const table of TABLE_NAMES) {
      await localDb.appTable(table).clear();
      const rows = db[table] as Row<typeof table>[];
      if (rows.length) await localDb.appTable(table).bulkPut(rows);
    }
  });
}

function legacyDb(): LocalDb | null {
  try {
    const raw = window.localStorage.getItem(LEGACY_DB_KEY);
    return raw ? normaliseLocalDb(JSON.parse(raw) as Partial<LocalDb>) : null;
  } catch {
    return null;
  }
}

async function importLegacyPreference() {
  const preferredOrg = window.localStorage.getItem(LEGACY_ORG_KEY);
  if (preferredOrg) {
    await localDb.app_preferences.put({ key: CURRENT_ORG_PREF, value: preferredOrg });
  }
}

function clearLegacyLocalStorage() {
  window.localStorage.removeItem(LEGACY_DB_KEY);
  window.localStorage.removeItem(LEGACY_BLOB_KEY);
  window.localStorage.removeItem(LEGACY_ORG_KEY);
}

async function seedIfEmpty() {
  const existing = await localDb.appTable("organisations").count();
  if (existing > 0) return;

  const migrated = legacyDb();
  await writeDb(migrated ?? buildSeed());
  await importLegacyPreference();
  clearLegacyLocalStorage();
}

export async function ensureLocalDataReady() {
  assertBrowser();
  ready ??= seedIfEmpty();
  await ready;
}

export async function loadDb(): Promise<LocalDb> {
  await ensureLocalDataReady();
  const db = emptyDb();
  for (const table of TABLE_NAMES) {
    (db[table] as Row<typeof table>[]) = await localDb.appTable(table).toArray();
  }
  return clone(db);
}

export async function saveDb(db: LocalDb) {
  await ensureLocalDataReady();
  await writeDb(normaliseLocalDb(db));
}

/** Wipe persisted data and rebuild from the seed. Returns the fresh database. */
export async function resetLocalData(): Promise<LocalDb> {
  await ensureLocalDataReady();
  const seeded = buildSeed();
  await localDb.transaction(
    "rw",
    [...TABLE_NAMES.map((name) => localDb.appTable(name)), localDb.app_preferences, localDb.evidence_blobs],
    async () => {
      for (const table of TABLE_NAMES) await localDb.appTable(table).clear();
      await localDb.app_preferences.clear();
      await localDb.evidence_blobs.clear();
      for (const table of TABLE_NAMES) {
        const rows = seeded[table] as Row<typeof table>[];
        if (rows.length) await localDb.appTable(table).bulkPut(rows);
      }
    },
  );
  clearLegacyLocalStorage();
  return clone(seeded);
}

/** Alias kept for intent-revealing call sites. */
export const reseedLocalData = resetLocalData;

/** Read all rows for a table (deep-cloned to prevent accidental mutation). */
export async function getAll<T extends TableName>(table: T): Promise<Row<T>[]> {
  await ensureLocalDataReady();
  return clone(await localDb.appTable(table).toArray());
}

/** Append rows to a table and persist. Returns the inserted rows (cloned). */
export async function insertRows<T extends TableName>(table: T, rows: Row<T>[]): Promise<Row<T>[]> {
  await ensureLocalDataReady();
  if (rows.length) await localDb.appTable(table).bulkAdd(clone(rows));
  return clone(rows);
}

/** Patch every row matching `predicate`. Returns the updated rows (cloned). */
export async function updateWhere<T extends TableName>(
  table: T,
  predicate: (row: Row<T>) => boolean,
  patch: Partial<Row<T>>,
): Promise<Row<T>[]> {
  await ensureLocalDataReady();
  const rows = await localDb.appTable(table).toArray();
  const updated = rows.filter(predicate).map((row) => ({ ...row, ...patch }) as Row<T>);
  if (updated.length) await localDb.appTable(table).bulkPut(updated);
  return clone(updated);
}

/** Delete every row matching `predicate`. Returns the number removed. */
export async function deleteWhere<T extends TableName>(
  table: T,
  predicate: (row: Row<T>) => boolean,
): Promise<number> {
  await ensureLocalDataReady();
  const rows = await localDb.appTable(table).toArray();
  const keys = rows.filter(predicate).map((row) => primaryKeyFor(table, row));
  if (keys.length) await localDb.appTable(table).bulkDelete(keys);
  return keys.length;
}

export async function getLocalPreference<T = unknown>(key: string): Promise<T | null> {
  await ensureLocalDataReady();
  const row = await localDb.app_preferences.get(key);
  return (row?.value as T | undefined) ?? null;
}

export async function setLocalPreference(key: string, value: unknown) {
  await ensureLocalDataReady();
  await localDb.app_preferences.put({ key, value });
}

export async function removeLocalPreference(key: string) {
  await ensureLocalDataReady();
  await localDb.app_preferences.delete(key);
}

export const LOCAL_PREF_KEYS = {
  currentOrganisationId: CURRENT_ORG_PREF,
} as const;
