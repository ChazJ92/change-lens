import type { Insert, Row, Update } from "./db";
import { getAll, insertRows, updateWhere } from "./store";

/**
 * Typed client-side repositories for the domain entities the product flows
 * exercise. These are intentionally storage-agnostic in shape: the
 * `DataRepositories` interface is the seam to swap the localStorage-backed
 * implementation for a remote backend later without touching callers.
 *
 * The local implementation below shares the same persisted store as the
 * query-builder client, so reads and writes stay consistent
 * regardless of which API a screen uses.
 */

const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `id-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;

const now = () => new Date().toISOString();

export interface Repository<TRow, TInsert, TUpdate> {
  list(): TRow[];
  get(id: string): TRow | null;
  create(input: TInsert): TRow;
  update(id: string, patch: TUpdate): TRow | null;
}

export interface DataRepositories {
  organisations: Repository<Row<"organisations">, Insert<"organisations">, Update<"organisations">> & {
    listForUser(userId: string): (Row<"organisations"> & { role: string })[];
    isAdmin(orgId: string, userId: string): boolean;
    /**
     * Atomically create an organisation, make the creator an admin and seed
     * the default organisation settings. Mirrors the eventual server-side
     * `create_organisation` transaction.
     */
    createWithMembership(input: Insert<"organisations">, userId: string): Row<"organisations">;
  };
  assessments: Repository<Row<"assessments">, Insert<"assessments">, Update<"assessments">> & {
    listByOrg(orgId: string): Row<"assessments">[];
  };
  pillars: Repository<Row<"pillars">, Insert<"pillars">, Update<"pillars">>;
  pillarAssessments: Repository<Row<"pillar_assessments">, Insert<"pillar_assessments">, Update<"pillar_assessments">> & {
    listByAssessment(assessmentId: string): Row<"pillar_assessments">[];
  };
  risks: Repository<Row<"risks">, Insert<"risks">, Update<"risks">> & {
    listByAssessment(assessmentId: string): Row<"risks">[];
  };
  recommendations: Repository<Row<"recommendations">, Insert<"recommendations">, Update<"recommendations">> & {
    listByAssessment(assessmentId: string): Row<"recommendations">[];
  };
  reviewComments: Repository<Row<"review_comments">, Insert<"review_comments">, Update<"review_comments">> & {
    listByPillarAssessment(pillarAssessmentId: string): Row<"review_comments">[];
  };
  scoreOverrides: Repository<Row<"score_overrides">, Insert<"score_overrides">, Update<"score_overrides">> & {
    listByPillarAssessment(pillarAssessmentId: string): Row<"score_overrides">[];
  };
  questions: Repository<Row<"questions">, Insert<"questions">, Update<"questions">> & {
    listByPillar(pillarId: string): Row<"questions">[];
  };
  activity: {
    listByOrg(orgId: string, limit?: number): Row<"audit_logs">[];
    listByAssessment(assessmentId: string, limit?: number): Row<"audit_logs">[];
    log(input: Insert<"audit_logs">): Row<"audit_logs">;
  };
}

function byCreatedDesc<T extends { created_at?: string | null }>(a: T, b: T) {
  return new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime();
}

export const repositories: DataRepositories = {
  organisations: {
    list: () => getAll("organisations"),
    listForUser: (userId) => {
      const memberships = getAll("memberships").filter((m) => m.user_id === userId);
      const orgs = getAll("organisations");
      return memberships
        .map((m) => {
          const org = orgs.find((o) => o.id === m.organisation_id);
          return org ? { ...org, role: m.role as string } : null;
        })
        .filter(Boolean) as (Row<"organisations"> & { role: string })[];
    },
    isAdmin: (orgId, userId) =>
      getAll("memberships").some(
        (m) => m.organisation_id === orgId && m.user_id === userId && m.role === "admin",
      ),
    get: (id) => getAll("organisations").find((o) => o.id === id) ?? null,
    create: (input) =>
      insertRows("organisations", [
        {
          id: uid(),
          created_at: now(),
          is_demo: false,
          sector: null,
          employee_count: null,
          change_population: null,
          countries_operated: null,
          summary: null,
          ...input,
        } as Row<"organisations">,
      ])[0],
    update: (id, patch) => updateWhere("organisations", (o) => o.id === id, patch)[0] ?? null,
    createWithMembership: (input, userId) => {
      const org = insertRows("organisations", [
        {
          id: uid(),
          created_at: now(),
          is_demo: false,
          sector: null,
          employee_count: null,
          change_population: null,
          countries_operated: null,
          summary: null,
          ...input,
        } as Row<"organisations">,
      ])[0];
      insertRows("memberships", [
        { id: uid(), organisation_id: org.id, user_id: userId, role: "admin", created_at: now() } as Row<"memberships">,
      ]);
      insertRows("user_roles", [
        { id: uid(), organisation_id: org.id, user_id: userId, role: "org_admin" } as Row<"user_roles">,
      ]);
      insertRows("organisation_ai_settings", [
        {
          organisation_id: org.id,
          is_active: false,
          provider: "openai",
          model: "gpt-4o-mini",
          api_key_last4: null,
          last_verified_at: null,
          last_verified_status: null,
          updated_at: now(),
          updated_by: userId,
        } as Row<"organisation_ai_settings">,
      ]);
      return org;
    },
  },

  assessments: {
    list: () => getAll("assessments"),
    listByOrg: (orgId) => getAll("assessments").filter((a) => a.organisation_id === orgId),
    get: (id) => getAll("assessments").find((a) => a.id === id) ?? null,
    create: (input) => {
      const row = {
        id: uid(),
        created_at: now(),
        updated_at: now(),
        description: null,
        transformation_profile: null,
        scope_level: null,
        complexity_level: null,
        business_area: null,
        target_completion_date: null,
        created_by: null,
        status: "draft",
        ...input,
      } as Row<"assessments">;
      return insertRows("assessments", [row])[0];
    },
    update: (id, patch) =>
      updateWhere("assessments", (a) => a.id === id, { ...patch, updated_at: now() })[0] ?? null,
  },

  pillars: {
    list: () => getAll("pillars").sort((a, b) => a.display_order - b.display_order),
    get: (id) => getAll("pillars").find((p) => p.id === id) ?? null,
    create: (input) => insertRows("pillars", [{ id: uid(), subdimensions: [], ...input } as Row<"pillars">])[0],
    update: (id, patch) => updateWhere("pillars", (p) => p.id === id, patch)[0] ?? null,
  },

  pillarAssessments: {
    list: () => getAll("pillar_assessments"),
    listByAssessment: (assessmentId) =>
      getAll("pillar_assessments").filter((p) => p.assessment_id === assessmentId),
    get: (id) => getAll("pillar_assessments").find((p) => p.id === id) ?? null,
    create: (input) => {
      const row = {
        id: uid(),
        created_at: now(),
        updated_at: now(),
        status: "not_started",
        provisional_score: null,
        final_score: null,
        confidence: null,
        weight_override: null,
        reviewed_at: null,
        ai_rationale: null,
        ai_evidence_considered: null,
        ai_missing_evidence: null,
        ai_suggested_next_action: null,
        ...input,
      } as Row<"pillar_assessments">;
      return insertRows("pillar_assessments", [row])[0];
    },
    update: (id, patch) =>
      updateWhere("pillar_assessments", (p) => p.id === id, { ...patch, updated_at: now() })[0] ?? null,
  },

  risks: {
    list: () => getAll("risks"),
    listByAssessment: (assessmentId) => getAll("risks").filter((r) => r.assessment_id === assessmentId),
    get: (id) => getAll("risks").find((r) => r.id === id) ?? null,
    create: (input) =>
      insertRows("risks", [
        {
          id: uid(),
          created_at: now(),
          description: null,
          mitigation: null,
          pillar_id: null,
          severity: "medium",
          likelihood: "medium",
          ...input,
        } as Row<"risks">,
      ])[0],
    update: (id, patch) => updateWhere("risks", (r) => r.id === id, patch)[0] ?? null,
  },

  recommendations: {
    list: () => getAll("recommendations"),
    listByAssessment: (assessmentId) =>
      getAll("recommendations").filter((r) => r.assessment_id === assessmentId),
    get: (id) => getAll("recommendations").find((r) => r.id === id) ?? null,
    create: (input) =>
      insertRows("recommendations", [
        {
          id: uid(),
          created_at: now(),
          description: null,
          rationale: null,
          pillar_id: null,
          suggested_owner: null,
          category: "foundational_improvement",
          priority: "medium",
          status: "suggested",
          ...input,
        } as Row<"recommendations">,
      ])[0],
    update: (id, patch) => updateWhere("recommendations", (r) => r.id === id, patch)[0] ?? null,
  },

  reviewComments: {
    list: () => getAll("review_comments"),
    listByPillarAssessment: (pillarAssessmentId) =>
      getAll("review_comments")
        .filter((c) => c.pillar_assessment_id === pillarAssessmentId)
        .sort(byCreatedDesc),
    get: (id) => getAll("review_comments").find((c) => c.id === id) ?? null,
    create: (input) =>
      insertRows("review_comments", [
        { id: uid(), created_at: now(), author_id: null, decision: null, ...input } as Row<"review_comments">,
      ])[0],
    update: (id, patch) => updateWhere("review_comments", (c) => c.id === id, patch)[0] ?? null,
  },

  scoreOverrides: {
    list: () => getAll("score_overrides").sort(byCreatedDesc),
    listByPillarAssessment: (pillarAssessmentId) =>
      getAll("score_overrides")
        .filter((o) => o.pillar_assessment_id === pillarAssessmentId)
        .sort(byCreatedDesc),
    get: (id) => getAll("score_overrides").find((o) => o.id === id) ?? null,
    create: (input) =>
      insertRows("score_overrides", [
        { id: uid(), created_at: now(), author_id: null, previous_score: null, ...input } as Row<"score_overrides">,
      ])[0],
    update: (id, patch) => updateWhere("score_overrides", (o) => o.id === id, patch)[0] ?? null,
  },

  questions: {
    list: () => getAll("questions").sort((a, b) => a.display_order - b.display_order),
    listByPillar: (pillarId) =>
      getAll("questions")
        .filter((q) => q.pillar_id === pillarId)
        .sort((a, b) => a.display_order - b.display_order),
    get: (id) => getAll("questions").find((q) => q.id === id) ?? null,
    create: (input) =>
      insertRows("questions", [{ id: uid(), display_order: 0, ...input } as Row<"questions">])[0],
    update: (id, patch) => updateWhere("questions", (q) => q.id === id, patch)[0] ?? null,
  },

  activity: {
    listByOrg: (orgId, limit) => {
      const rows = getAll("audit_logs").filter((l) => l.organisation_id === orgId).sort(byCreatedDesc);
      return limit ? rows.slice(0, limit) : rows;
    },
    listByAssessment: (assessmentId, limit) => {
      const rows = getAll("audit_logs").filter((l) => l.assessment_id === assessmentId).sort(byCreatedDesc);
      return limit ? rows.slice(0, limit) : rows;
    },
    log: (input) =>
      insertRows("audit_logs", [
        {
          id: uid(),
          created_at: now(),
          actor_id: null,
          actor_email: null,
          assessment_id: null,
          organisation_id: null,
          detail: null,
          ...input,
        } as Row<"audit_logs">,
      ])[0],
  },
};