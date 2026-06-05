-- Correct the CORE7 pillar source of truth so canonical names match the
-- approved ChangeLens pillar list exactly. Only the strategy pillar name
-- differed from canon; this update keeps it aligned and is non-destructive.
UPDATE public.pillars
SET name = 'Strategic Alignment & Leadership'
WHERE code = 'strategy_leadership';

-- Safety re-affirm the remaining canonical names (idempotent).
UPDATE public.pillars SET name = 'Data Quality & Insight'        WHERE code = 'data_quality_insight';
UPDATE public.pillars SET name = 'Process Maturity'              WHERE code = 'process_maturity';
UPDATE public.pillars SET name = 'Technology & Tooling'          WHERE code = 'technology_tooling';
UPDATE public.pillars SET name = 'People & Capability'           WHERE code = 'people_capability';
UPDATE public.pillars SET name = 'Governance & Risk'            WHERE code = 'governance_risk';
UPDATE public.pillars SET name = 'Organisational Adaptability'   WHERE code = 'organisational_adaptability';
