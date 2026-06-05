import { emptyDb, type MockDb } from "./db";
import { CORE7_PILLARS } from "@/lib/pillars";

/**
 * Realistic seed data for offline / demo testing.
 *
 * Everything here is deterministic in shape but uses generated UUIDs so the
 * data looks production-like. `buildSeed()` returns a fresh database object;
 * the store decides when to persist it.
 */

const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `id-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;

const NOW = Date.now();
const iso = (msAgo: number) => new Date(NOW - msAgo).toISOString();
const days = (n: number) => n * 24 * 60 * 60 * 1000;
const hours = (n: number) => n * 60 * 60 * 1000;
const aheadDays = (n: number) => new Date(NOW + days(n)).toISOString().slice(0, 10);

/** The signed-in user used by the mock auth provider. */
export const MOCK_USER = {
  id: "00000000-0000-4000-8000-000000000001",
  aud: "authenticated",
  role: "authenticated",
  email: "avery.stone@meridiancapital.com",
  email_confirmed_at: iso(days(120)),
  phone: "",
  confirmed_at: iso(days(120)),
  last_sign_in_at: iso(hours(2)),
  app_metadata: { provider: "email", providers: ["email"] },
  user_metadata: { full_name: "Avery Stone" },
  identities: [],
  created_at: iso(days(120)),
  updated_at: iso(hours(2)),
} as const;

export const MOCK_SESSION = {
  access_token: "mock-access-token",
  refresh_token: "mock-refresh-token",
  expires_in: 3600,
  expires_at: Math.floor((NOW + hours(1)) / 1000),
  token_type: "bearer",
  user: MOCK_USER,
} as const;

type AnyRow = Record<string, unknown>;

export function buildSeed(): MockDb {
  const db = emptyDb();

  // --- Organisations -------------------------------------------------------
  const orgMeridian = uid();
  const orgDemo = uid();
  db.organisations = [
    {
      id: orgMeridian,
      name: "Meridian Capital",
      is_demo: false,
      sector: "Financial services",
      employee_count: 8400,
      change_population: 2600,
      countries_operated: 14,
      summary:
        "Mid-flight enterprise transformation across finance, customer and technology. Heavily regulated, multi-region operating model with strong governance but uneven delivery capacity.",
      created_at: iso(days(200)),
    },
    {
      id: orgDemo,
      name: "CORE7 Demo Workspace",
      is_demo: true,
      sector: "Cross-industry (demo)",
      employee_count: 1200,
      change_population: 400,
      countries_operated: 3,
      summary:
        "Sample workspace for exploring CORE7 across a representative digital transformation.",
      created_at: iso(days(40)),
    },
  ];

  // --- Profile + memberships ----------------------------------------------
  db.profiles = [
    { id: MOCK_USER.id, email: MOCK_USER.email, full_name: "Avery Stone", created_at: iso(days(120)) },
  ];
  db.memberships = [
    { id: uid(), organisation_id: orgMeridian, user_id: MOCK_USER.id, role: "admin", created_at: iso(days(120)) },
    { id: uid(), organisation_id: orgDemo, user_id: MOCK_USER.id, role: "admin", created_at: iso(days(40)) },
  ];
  db.user_roles = [
    { id: uid(), organisation_id: orgMeridian, user_id: MOCK_USER.id, role: "org_admin" },
    { id: uid(), organisation_id: orgDemo, user_id: MOCK_USER.id, role: "org_admin" },
  ];

  // --- Pillars (CORE7) -----------------------------------------------------
  // Canonical CORE7 pillars — single source of truth in src/lib/pillars.ts.
  const pillarDefs = CORE7_PILLARS.map((p) => ({
    code: p.code,
    name: p.name,
    default_weight: p.default_weight,
    display_order: p.display_order,
    description: p.description,
    subs: p.subdimensions,
  }));
  const pillars = pillarDefs.map((p) => ({
    id: uid(),
    code: p.code,
    name: p.name,
    description: p.description,
    default_weight: p.default_weight,
    display_order: p.display_order,
    subdimensions: p.subs,
  }));
  db.pillars = pillars as AnyRow[] as MockDb["pillars"];

  // --- Questions (one per subdimension) -----------------------------------
  const questions: AnyRow[] = [];
  for (const p of pillars) {
    const def = pillarDefs.find((d) => d.code === p.code)!;
    def.subs.forEach((sub, i) => {
      questions.push({
        id: uid(),
        pillar_id: p.id,
        subdimension: sub,
        prompt: `To what extent is "${sub.toLowerCase()}" defined, owned and evidenced for this transformation?`,
        display_order: i + 1,
      });
    });
  }
  db.questions = questions as MockDb["questions"];

  // --- Assessments ---------------------------------------------------------
  const a1 = uid(); // active, partly scored
  const a2 = uid(); // in review, mostly complete
  const a3 = uid(); // draft, not started
  const a4 = uid(); // demo org
  db.assessments = [
    { id: a1, organisation_id: orgMeridian, name: "ERP & Operating Model Modernisation", description: "Replatform core finance and supply chain onto a single ERP while redesigning the operating model across three business units.", transformation_profile: "ERP", scope_level: "Enterprise", complexity_level: "Very high", business_area: "Finance", status: "active", target_completion_date: aheadDays(180), created_by: MOCK_USER.id, created_at: iso(days(35)), updated_at: iso(hours(5)) },
    { id: a2, organisation_id: orgMeridian, name: "Customer Experience Transformation", description: "Unify digital and contact-centre journeys to lift retention and reduce cost-to-serve.", transformation_profile: "Customer experience", scope_level: "Business unit", complexity_level: "High", business_area: "Customer", status: "in_review", target_completion_date: aheadDays(60), created_by: MOCK_USER.id, created_at: iso(days(70)), updated_at: iso(days(2)) },
    { id: a3, organisation_id: orgMeridian, name: "Cloud Migration Programme", description: "Migrate on-premise workloads to cloud with a landing-zone first approach.", transformation_profile: "Cloud migration", scope_level: "Function", complexity_level: "Medium", business_area: "Technology", status: "draft", target_completion_date: aheadDays(240), created_by: MOCK_USER.id, created_at: iso(days(8)), updated_at: iso(days(8)) },
    { id: a4, organisation_id: orgDemo, name: "Demo: Enterprise Digital Readiness", description: "Sample assessment showing a mid-flight digital transformation across all seven CORE7 pillars.", transformation_profile: "Digital", scope_level: "Enterprise", complexity_level: "High", business_area: "Operations", status: "active", target_completion_date: aheadDays(120), created_by: MOCK_USER.id, created_at: iso(days(20)), updated_at: iso(hours(20)) },
  ];

  // --- Pillar assessments --------------------------------------------------
  // Score profiles per assessment, indexed by pillar display_order (1..7).
  type PaProfile = { score: number | null; final?: number | null; status: string; confidence: string | null };
  const profiles: Record<string, PaProfile[]> = {
    [a1]: [
      { score: 3.6, final: 3.6, status: "complete", confidence: "High" },
      { score: 3.2, status: "ready_for_review", confidence: "Moderate" },
      { score: 2.4, status: "changes_requested", confidence: "Moderate" },
      { score: 2.8, status: "in_progress", confidence: "Low" },
      { score: 3.0, status: "ai_analysis_complete", confidence: "High" },
      { score: null, status: "awaiting_evidence", confidence: null },
      { score: 2.2, status: "ready_for_review", confidence: "Low" },
    ],
    [a2]: [
      { score: 4.2, final: 4.2, status: "complete", confidence: "Very High" },
      { score: 3.9, final: 3.9, status: "complete", confidence: "High" },
      { score: 3.7, final: 3.7, status: "complete", confidence: "High" },
      { score: 3.4, final: 3.4, status: "complete", confidence: "Moderate" },
      { score: 3.8, final: 3.8, status: "complete", confidence: "High" },
      { score: 4.0, status: "ready_for_review", confidence: "High" },
      { score: 3.1, status: "ready_for_review", confidence: "Moderate" },
    ],
    [a3]: [
      { score: null, status: "not_started", confidence: null },
      { score: null, status: "not_started", confidence: null },
      { score: null, status: "not_started", confidence: null },
      { score: null, status: "not_started", confidence: null },
      { score: null, status: "not_started", confidence: null },
      { score: null, status: "not_started", confidence: null },
      { score: null, status: "not_started", confidence: null },
    ],
    [a4]: [
      { score: 3.5, status: "ai_analysis_complete", confidence: "High" },
      { score: 3.0, status: "in_progress", confidence: "Moderate" },
      { score: 2.6, status: "awaiting_stakeholder_input", confidence: "Low" },
      { score: 3.3, status: "ready_for_review", confidence: "Moderate" },
      { score: 3.9, final: 3.9, status: "complete", confidence: "High" },
      { score: 2.9, status: "in_progress", confidence: "Moderate" },
      { score: null, status: "awaiting_evidence", confidence: null },
    ],
  };

  const paIndex: Record<string, Record<number, string>> = { [a1]: {}, [a2]: {}, [a3]: {}, [a4]: {} };
  const pillarAssessments: AnyRow[] = [];
  for (const assessmentId of [a1, a2, a3, a4]) {
    pillars.forEach((p, i) => {
      const prof = profiles[assessmentId][i];
      const id = uid();
      paIndex[assessmentId][p.display_order] = id;
      const hasAi = prof.status === "ai_analysis_complete" || prof.status === "ready_for_review" || prof.status === "complete";
      pillarAssessments.push({
        id,
        assessment_id: assessmentId,
        pillar_id: p.id,
        status: prof.status,
        provisional_score: prof.score,
        final_score: prof.final ?? null,
        confidence: prof.confidence,
        weight_override: null,
        reviewed_at: prof.status === "complete" ? iso(days(3)) : null,
        ai_rationale: hasAi
          ? `Evidence indicates ${p.name.toLowerCase()} is developing but uneven across subdimensions. Strengths in governance cadence are offset by gaps in measurable outcomes.`
          : null,
        ai_evidence_considered: hasAi ? ["Strategy on a page", "Programme governance pack", "Latest steering deck"] : null,
        ai_missing_evidence: hasAi ? ["Quantified benefits baseline", "Independent assurance review"] : null,
        ai_suggested_next_action: hasAi ? "Commission a benefits baseline and schedule an assurance checkpoint before the next gate." : null,
        created_at: iso(days(34)),
        updated_at: iso(hours(6)),
      });
    });
  }
  db.pillar_assessments = pillarAssessments as MockDb["pillar_assessments"];

  const pillarByOrder = (n: number) => pillars.find((p) => p.display_order === n)!.id;

  // --- Risks ---------------------------------------------------------------
  db.risks = [
    { id: uid(), organisation_id: orgMeridian, assessment_id: a1, pillar_id: pillarByOrder(3), title: "Cutover window collides with year-end close", description: "Proposed go-live overlaps statutory reporting, risking finance operations.", severity: "critical", likelihood: "high", mitigation: "Move go-live two weeks earlier and run parallel ledgers.", created_at: iso(days(10)) },
    { id: uid(), organisation_id: orgMeridian, assessment_id: a1, pillar_id: pillarByOrder(4), title: "Insufficient backfill for SMEs", description: "Key subject-matter experts are not released from BAU.", severity: "high", likelihood: "high", mitigation: "Secure backfill funding in the next steering committee.", created_at: iso(days(9)) },
    { id: uid(), organisation_id: orgMeridian, assessment_id: a1, pillar_id: pillarByOrder(7), title: "Data migration controls unproven", description: "Reconciliation controls for migrated balances are not yet tested.", severity: "high", likelihood: "medium", mitigation: "Run a mock migration with full reconciliation.", created_at: iso(days(6)) },
    { id: uid(), organisation_id: orgMeridian, assessment_id: a2, pillar_id: pillarByOrder(5), title: "Legacy CRM integration fragile", description: "Real-time sync to the legacy CRM fails under load.", severity: "medium", likelihood: "medium", mitigation: "Introduce queue-based integration with retries.", created_at: iso(days(14)) },
    { id: uid(), organisation_id: orgDemo, assessment_id: a4, pillar_id: pillarByOrder(6), title: "Benefits not measurable", description: "No baseline exists for the target customer outcomes.", severity: "high", likelihood: "high", mitigation: "Define a measurement framework before the next phase.", created_at: iso(days(5)) },
  ];

  // --- Recommendations -----------------------------------------------------
  db.recommendations = [
    { id: uid(), organisation_id: orgMeridian, assessment_id: a1, pillar_id: pillarByOrder(1), title: "Re-baseline the roadmap around the year-end constraint", description: "Sequence releases to avoid the statutory close.", rationale: "Reduces the highest-severity delivery risk and protects finance operations.", category: "risk_mitigation", priority: "critical", status: "accepted", suggested_owner: "Programme Director", created_at: iso(days(8)) },
    { id: uid(), organisation_id: orgMeridian, assessment_id: a1, pillar_id: pillarByOrder(4), title: "Fund dedicated SME backfill", description: "Release key experts from BAU for the duration of build.", rationale: "Capacity is the binding constraint on the operating-model workstream.", category: "capability_uplift", priority: "high", status: "suggested", suggested_owner: "HR Business Partner", created_at: iso(days(7)) },
    { id: uid(), organisation_id: orgMeridian, assessment_id: a2, pillar_id: pillarByOrder(6), title: "Stand up a value-realisation dashboard", description: "Track retention and cost-to-serve weekly.", rationale: "Proves the transformation is working and sustains sponsorship.", category: "strategic_intervention", priority: "high", status: "in_progress", suggested_owner: "CX Lead", created_at: iso(days(12)) },
    { id: uid(), organisation_id: orgMeridian, assessment_id: a2, pillar_id: pillarByOrder(2), title: "Tighten benefits governance cadence", description: "Add a monthly benefits review to the steering rhythm.", rationale: "Closes the gap between decisions and realised value.", category: "governance_improvement", priority: "medium", status: "suggested", suggested_owner: "PMO Lead", created_at: iso(days(11)) },
    { id: uid(), organisation_id: orgDemo, assessment_id: a4, pillar_id: pillarByOrder(6), title: "Define an outcomes baseline", description: "Establish current-state metrics for all target outcomes.", rationale: "Without a baseline, benefits cannot be evidenced at the next gate.", category: "foundational_improvement", priority: "high", status: "suggested", suggested_owner: "Transformation Office", created_at: iso(days(4)) },
    { id: uid(), organisation_id: orgDemo, assessment_id: a4, pillar_id: pillarByOrder(3), title: "Run a quick-win process simplification", description: "Remove three redundant approval steps in onboarding.", rationale: "Builds momentum and frees capacity early.", category: "quick_win", priority: "medium", status: "accepted", suggested_owner: "Ops Manager", created_at: iso(days(3)) },
  ];

  // --- Review comments -----------------------------------------------------
  db.review_comments = [
    { id: uid(), pillar_assessment_id: paIndex[a1][3], author_id: MOCK_USER.id, comment: "Operating model gaps in transition readiness — please add cutover rehearsal evidence before resubmitting.", decision: "changes_requested", created_at: iso(days(2)) },
    { id: uid(), pillar_assessment_id: paIndex[a2][1], author_id: MOCK_USER.id, comment: "Strong strategic alignment and clear roadmap. Approved.", decision: "approved", created_at: iso(days(4)) },
    { id: uid(), pillar_assessment_id: paIndex[a1][2], author_id: MOCK_USER.id, comment: "Governance cadence looks solid. One question on funding gate ownership.", decision: null, created_at: iso(hours(20)) },
  ];

  // --- Score overrides -----------------------------------------------------
  db.score_overrides = [
    { id: uid(), pillar_assessment_id: paIndex[a2][1], author_id: MOCK_USER.id, previous_score: 4.0, new_score: 4.2, rationale: "Moderated up after reviewing the assurance evidence pack.", created_at: iso(days(4)) },
    { id: uid(), pillar_assessment_id: paIndex[a1][1], author_id: MOCK_USER.id, previous_score: 3.4, new_score: 3.6, rationale: "Adjusted to reflect the newly approved roadmap.", created_at: iso(days(3)) },
  ];

  // --- Audit logs (activity) ----------------------------------------------
  db.audit_logs = [
    { id: uid(), organisation_id: orgMeridian, assessment_id: a1, actor_id: MOCK_USER.id, actor_email: MOCK_USER.email, event_type: "assessment_created", detail: { note: 'Created assessment "ERP & Operating Model Modernisation"' }, created_at: iso(days(35)) },
    { id: uid(), organisation_id: orgMeridian, assessment_id: a1, actor_id: MOCK_USER.id, actor_email: MOCK_USER.email, event_type: "pillar_submitted", detail: { note: "Submitted Strategy & Vision for review" }, created_at: iso(days(5)) },
    { id: uid(), organisation_id: orgMeridian, assessment_id: a1, actor_id: MOCK_USER.id, actor_email: MOCK_USER.email, event_type: "changes_requested", detail: { note: "Requested changes on Operating Model & Process" }, created_at: iso(days(2)) },
    { id: uid(), organisation_id: orgMeridian, assessment_id: a1, actor_id: MOCK_USER.id, actor_email: MOCK_USER.email, event_type: "score_overridden", detail: { note: "Override on Strategy & Vision: 3.4 → 3.6" }, created_at: iso(days(3)) },
    { id: uid(), organisation_id: orgMeridian, assessment_id: a2, actor_id: MOCK_USER.id, actor_email: MOCK_USER.email, event_type: "pillar_approved", detail: { note: "Approved Strategy & Vision" }, created_at: iso(days(4)) },
    { id: uid(), organisation_id: orgMeridian, assessment_id: a2, actor_id: MOCK_USER.id, actor_email: MOCK_USER.email, event_type: "assessment_status_changed", detail: { note: "Moved to In review" }, created_at: iso(days(2)) },
    { id: uid(), organisation_id: orgMeridian, assessment_id: a3, actor_id: MOCK_USER.id, actor_email: MOCK_USER.email, event_type: "assessment_created", detail: { note: 'Created assessment "Cloud Migration Programme"' }, created_at: iso(days(8)) },
    { id: uid(), organisation_id: orgDemo, assessment_id: a4, actor_id: MOCK_USER.id, actor_email: MOCK_USER.email, event_type: "assessment_created", detail: { note: 'Created assessment "Demo: Enterprise Digital Readiness"' }, created_at: iso(days(20)) },
  ];

  // --- Surveys + recipients (stakeholder input) ---------------------------
  const survey1 = uid();
  db.surveys = [
    { id: survey1, assessment_id: a1, pillar_id: pillarByOrder(4), title: "People & Culture readiness pulse", description: "Short pulse for the operating-model working group.", created_at: iso(days(6)) },
  ];
  db.survey_recipients = [
    { id: uid(), survey_id: survey1, email: "lead.eng@meridiancapital.com", name: "J. Okafor", stakeholder_group: "Engineering", token: uid(), submitted_at: iso(days(4)), created_at: iso(days(6)) },
    { id: uid(), survey_id: survey1, email: "ops.manager@meridiancapital.com", name: "P. Nguyen", stakeholder_group: "Operations", token: uid(), submitted_at: null, created_at: iso(days(6)) },
  ];

  // --- Evidence ------------------------------------------------------------
  db.evidence_items = [
    { id: uid(), organisation_id: orgMeridian, assessment_id: a1, pillar_assessment_id: paIndex[a1][1], file_name: "Transformation strategy on a page.pdf", file_type: "application/pdf", evidence_type: "strategy_document", description: "Board-approved strategy summary.", processing_status: "complete", relevance_score: 0.9, ai_summary: "Clear ambition and sequenced roadmap aligned to enterprise strategy.", storage_path: null, uploaded_by: MOCK_USER.id, created_at: iso(days(7)) },
    { id: uid(), organisation_id: orgMeridian, assessment_id: a1, pillar_assessment_id: paIndex[a1][2], file_name: "Programme governance pack.pptx", file_type: "application/vnd.openxmlformats-officedocument.presentationml.presentation", evidence_type: "governance_paper", description: "Steering committee terms of reference and RACI.", processing_status: "complete", relevance_score: 0.8, ai_summary: "Defined decision rights and funding gates; cadence is monthly.", storage_path: null, uploaded_by: MOCK_USER.id, created_at: iso(days(6)) },
  ];

  return db;
}