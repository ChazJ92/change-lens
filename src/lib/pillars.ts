/**
 * Canonical CORE7 pillar source of truth.
 *
 * These are the seven ChangeLens CORE7 pillars. Names here are authoritative —
 * UI must render `name` in primary surfaces and may only use `abbr` (the
 * approved abbreviation) in genuinely space-constrained, compact contexts.
 *
 * Never display the raw stable `code` or any legacy abbreviation
 * (STR, GOV, TEC, OPM, PPL, CUS, RSK) in the UI.
 */
export type PillarAbbr = "Strat" | "Data" | "Process" | "Tech" | "People" | "Govern" | "Adapt";

export interface CanonicalPillar {
  /** Stable snake_case code aligned with the database `pillars.code`. */
  code: string;
  /** Approved abbreviation for compact UI only. */
  abbr: PillarAbbr;
  /** Canonical full name — the single source of truth for display. */
  name: string;
  default_weight: number;
  display_order: number;
  description: string;
  subdimensions: string[];
}

export const CORE7_PILLARS: CanonicalPillar[] = [
  {
    code: "strategy_leadership",
    abbr: "Strat",
    name: "Strategic Alignment & Leadership",
    default_weight: 20,
    display_order: 1,
    description:
      "Clarity of strategic intent, executive sponsorship, decision rights and alignment of the transformation to enterprise strategy.",
    subdimensions: [
      "Strategic clarity",
      "Executive sponsorship",
      "Decision rights",
      "Alignment to enterprise priorities",
      "Investment commitment",
    ],
  },
  {
    code: "data_quality_insight",
    abbr: "Data",
    name: "Data Quality & Insight",
    default_weight: 7,
    display_order: 2,
    description:
      "Trustworthy data, single source of truth, analytics maturity and the ability to evidence the case for change.",
    subdimensions: [
      "Data trust & quality",
      "Single source of truth",
      "Analytics & insight",
      "Data governance",
      "Evidence-based decision making",
    ],
  },
  {
    code: "process_maturity",
    abbr: "Process",
    name: "Process Maturity",
    default_weight: 12,
    display_order: 3,
    description:
      "Standardisation, documentation, performance management, process ownership and continuous improvement.",
    subdimensions: [
      "Process documentation",
      "Standardisation",
      "Performance management",
      "Process ownership",
      "Continuous improvement",
    ],
  },
  {
    code: "technology_tooling",
    abbr: "Tech",
    name: "Technology & Tooling",
    default_weight: 15,
    display_order: 4,
    description:
      "Fitness, scalability and supportability of the technology landscape underpinning the transformation.",
    subdimensions: [
      "Architecture fitness",
      "Scalability",
      "Supportability",
      "Integration",
      "Technical debt",
    ],
  },
  {
    code: "people_capability",
    abbr: "People",
    name: "People & Capability",
    default_weight: 18,
    display_order: 5,
    description:
      "Skills, capacity, learning culture and capability to absorb and operate the change.",
    subdimensions: [
      "Skills & capability",
      "Capacity",
      "Learning culture",
      "Talent strategy",
      "Knowledge management",
    ],
  },
  {
    code: "governance_risk",
    abbr: "Govern",
    name: "Governance & Risk",
    default_weight: 10,
    display_order: 6,
    description:
      "Governance forums, risk management, compliance, control environment and assurance.",
    subdimensions: [
      "Governance design",
      "Risk management",
      "Compliance posture",
      "Control environment",
      "Assurance & audit",
    ],
  },
  {
    code: "organisational_adaptability",
    abbr: "Adapt",
    name: "Organisational Adaptability",
    default_weight: 18,
    display_order: 7,
    description:
      "Change appetite, behavioural readiness, communications and the ability to sustain the change.",
    subdimensions: [
      "Change appetite",
      "Behavioural readiness",
      "Communications",
      "Adoption & sustainment",
      "Resilience",
    ],
  },
];

const BY_CODE = new Map(CORE7_PILLARS.map((p) => [p.code, p]));
const BY_ABBR = new Map(CORE7_PILLARS.map((p) => [p.abbr, p]));
const BY_NAME = new Map(CORE7_PILLARS.map((p) => [p.name.toLowerCase(), p]));

/** Resolve a pillar from a code, approved abbreviation, or canonical name. */
export function resolvePillar(key?: string | null): CanonicalPillar | undefined {
  if (!key) return undefined;
  return BY_CODE.get(key) ?? BY_ABBR.get(key as PillarAbbr) ?? BY_NAME.get(key.toLowerCase());
}

/**
 * Deterministic full-name label. Falls back to the resolved canonical name,
 * otherwise returns a humanised version of the input so labels never drift to
 * raw codes in the UI.
 */
export function pillarLabel(key?: string | null, fallbackName?: string | null): string {
  const p = resolvePillar(key);
  if (p) return p.name;
  if (fallbackName) return fallbackName;
  if (!key) return "—";
  return key.replace(/_/g, " ");
}

/** Approved abbreviation for compact UI only. */
export function pillarAbbr(key?: string | null): string {
  return resolvePillar(key)?.abbr ?? "";
}

/** Fallback mapping for legacy abbreviation codes used in the profiling survey. */
const COMPACT_LABELS: Record<string, string> = {
  SAL: "Strat",
  DQI: "Data",
  PRM: "Process",
  TAT: "Tech",
  PAC: "People",
  GAR: "Govern",
  OAD: "Adapt",
};

/** Compact label for user-facing abbreviations. Handles both canonical pillar codes and legacy survey codes. */
export function pillarCompactLabel(key?: string | null): string {
  if (!key) return "";
  const p = resolvePillar(key);
  if (p) return p.abbr;
  return COMPACT_LABELS[key] ?? key;
}

/** Number of CORE7 pillars. */
export const PILLAR_COUNT = CORE7_PILLARS.length;

/**
 * Equal starting weight applied to every pillar of a newly created assessment.
 * Stored per assessment (not on the global pillar table) so no pillar is
 * favoured at creation time. 100 / 7 ≈ 14.2857, and the seven values sum to
 * exactly 100 in weighting maths.
 */
export const EQUAL_PILLAR_WEIGHT = 100 / PILLAR_COUNT;

/**
 * Format a weight percentage for display, trimming to at most two decimals
 * (e.g. 14.2857 → "14.29", 20 → "20") so the UI stays clean.
 */
export function formatWeightPct(w?: number | null): string {
  if (w == null) return "0";
  return String(Math.round(Number(w) * 100) / 100);
}
