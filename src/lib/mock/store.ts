import { type MockDb, type TableName, type Row } from "./db";
import { buildSeed } from "./seed";

/**
 * localStorage-backed persistence for the mock database.
 *
 * A single JSON blob holds the whole database. An in-memory cache avoids
 * re-parsing on every read. All mutations funnel through the helpers below so
 * the repositories and the Supabase-compatible query builder share one source
 * of truth.
 */
const STORAGE_KEY = "core7.mock.db.v1";

let cache: MockDb | null = null;

function persist(db: MockDb) {
  cache = db;
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch {
    /* storage full / unavailable — keep the in-memory cache */
  }
}

export function loadDb(): MockDb {
  if (cache) return cache;
  if (typeof window !== "undefined") {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        cache = JSON.parse(raw) as MockDb;
        return cache;
      } catch {
        /* corrupt — fall through to reseed */
      }
    }
  }
  const seeded = buildSeed();
  persist(seeded);
  return seeded;
}

export function saveDb(db: MockDb) {
  persist(db);
}

/** Wipe persisted data and rebuild from the seed. Returns the fresh database. */
export function resetMockData(): MockDb {
  const seeded = buildSeed();
  persist(seeded);
  return seeded;
}

/** Alias kept for intent-revealing call sites. */
export const reseedMockData = resetMockData;

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/** Read all rows for a table (deep-cloned to prevent accidental mutation). */
export function getAll<T extends TableName>(table: T): Row<T>[] {
  return clone((loadDb()[table] ?? []) as Row<T>[]);
}

/** Append rows to a table and persist. Returns the inserted rows (cloned). */
export function insertRows<T extends TableName>(table: T, rows: Row<T>[]): Row<T>[] {
  const db = loadDb();
  const current = (db[table] ?? []) as Row<T>[];
  (db[table] as Row<T>[]) = [...current, ...rows];
  saveDb(db);
  return clone(rows);
}

/** Patch every row matching `predicate`. Returns the updated rows (cloned). */
export function updateWhere<T extends TableName>(
  table: T,
  predicate: (row: Row<T>) => boolean,
  patch: Partial<Row<T>>,
): Row<T>[] {
  const db = loadDb();
  const updated: Row<T>[] = [];
  (db[table] as Row<T>[]) = ((db[table] ?? []) as Row<T>[]).map((row) => {
    if (!predicate(row)) return row;
    const next = { ...row, ...patch } as Row<T>;
    updated.push(next);
    return next;
  });
  saveDb(db);
  return clone(updated);
}

/** Delete every row matching `predicate`. Returns the number removed. */
export function deleteWhere<T extends TableName>(
  table: T,
  predicate: (row: Row<T>) => boolean,
): number {
  const db = loadDb();
  const before = ((db[table] ?? []) as Row<T>[]).length;
  (db[table] as Row<T>[]) = ((db[table] ?? []) as Row<T>[]).filter((row) => !predicate(row));
  const removed = before - (db[table] as Row<T>[]).length;
  saveDb(db);
  return removed;
}