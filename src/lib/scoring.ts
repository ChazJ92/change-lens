export function mapScore(s?: number | null) {
  if (s == null) return null;
  return Math.round(((Number(s) - 1) / 4) * 100);
}

export function readinessBand(score?: number | null): { label: string; tone: string } {
  if (score == null) return { label: "Unscored", tone: "muted" };
  if (score <= 20) return { label: "Fragile", tone: "danger" };
  if (score <= 40) return { label: "Emerging", tone: "warning" };
  if (score <= 60) return { label: "Developing", tone: "info" };
  if (score <= 80) return { label: "Established", tone: "success" };
  return { label: "Adaptive", tone: "success" };
}

export function weightedOverall(
  pillars: Array<{ score?: number | null; weight: number; weight_override?: number | null }>,
): number | null {
  const usable = pillars.filter((p) => p.score != null);
  if (!usable.length) return null;
  const totalW = usable.reduce((s, p) => s + Number(p.weight_override ?? p.weight), 0);
  if (!totalW) return null;
  const sum = usable.reduce((s, p) => {
    const mapped = mapScore(p.score) ?? 0;
    return s + mapped * Number(p.weight_override ?? p.weight);
  }, 0);
  return Math.round(sum / totalW);
}

export function confidenceFromLabel(label?: string | null) {
  switch (label) {
    case "Very High": return 95;
    case "High": return 80;
    case "Moderate": return 60;
    case "Low": return 35;
    default: return 0;
  }
}

export const PILLAR_STATUS_LABELS: Record<string, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  awaiting_evidence: "Awaiting evidence",
  awaiting_stakeholder_input: "Awaiting stakeholder input",
  ready_for_ai_analysis: "Ready for AI analysis",
  ai_analysis_complete: "AI analysis complete",
  ready_for_review: "Ready for review",
  changes_requested: "Changes requested",
  complete: "Complete",
};

export const ASSESSMENT_STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  active: "Active",
  in_review: "In review",
  complete: "Complete",
  archived: "Archived",
};

export function fmtDate(d?: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

export function fmtRelative(d?: string | null) {
  if (!d) return "—";
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.round(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.round(h / 24);
  if (days < 30) return `${days}d ago`;
  return fmtDate(d);
}