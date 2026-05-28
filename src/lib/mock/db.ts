import type { Database } from "@/integrations/supabase/types";

/**
 * Shared type aliases for the localStorage-backed mock data layer.
 *
 * These mirror the generated Supabase row/insert/update shapes so the mock
 * layer is type-compatible with the eventual Supabase-backed implementation.
 * When real Supabase data is wired up, the repositories in `repositories.ts`
 * are the only thing that needs a second implementation — see `DataRepositories`.
 */
type Tables = Database["public"]["Tables"];

export type TableName = keyof Tables;
export type Row<T extends TableName> = Tables[T]["Row"];
export type Insert<T extends TableName> = Tables[T]["Insert"];
export type Update<T extends TableName> = Tables[T]["Update"];

/** The complete in-memory database shape persisted to localStorage. */
export type MockDb = { [K in TableName]: Row<K>[] };

/** Every table name, used to build a fully-populated empty database. */
export const TABLE_NAMES: TableName[] = [
  "ai_analysis_jobs",
  "assessment_roles",
  "assessments",
  "audit_logs",
  "evidence_items",
  "memberships",
  "organisation_ai_keys",
  "organisation_ai_settings",
  "organisations",
  "pillar_assessments",
  "pillar_assignments",
  "pillars",
  "profiles",
  "questions",
  "recommendations",
  "responses",
  "review_comments",
  "risks",
  "score_overrides",
  "survey_recipients",
  "survey_responses",
  "surveys",
  "user_roles",
];

/** An empty database with every table present as an empty array. */
export function emptyDb(): MockDb {
  const db = {} as MockDb;
  for (const name of TABLE_NAMES) {
    (db as Record<string, unknown[]>)[name] = [];
  }
  return db;
}

/**
 * Relationship config powering Supabase-style embedded selects
 * (e.g. `organisations(id, name)` or `survey_recipients(*)`).
 *
 * - `to-one`: the local row holds the foreign key (`fk`) pointing at the
 *   target table's `targetKey`.
 * - `to-many`: the target table holds the foreign key (`fk`) pointing back at
 *   the local row's `localKey`.
 */
export type Relation =
  | { kind: "to-one"; target: TableName; fk: string; targetKey: string }
  | { kind: "to-many"; target: TableName; fk: string; localKey: string };

export const RELATIONS: Partial<Record<TableName, Record<string, Relation>>> = {
  memberships: {
    organisations: { kind: "to-one", target: "organisations", fk: "organisation_id", targetKey: "id" },
  },
  surveys: {
    survey_recipients: { kind: "to-many", target: "survey_recipients", fk: "survey_id", localKey: "id" },
    pillars: { kind: "to-one", target: "pillars", fk: "pillar_id", targetKey: "id" },
  },
  survey_recipients: {
    surveys: { kind: "to-one", target: "surveys", fk: "survey_id", targetKey: "id" },
  },
};