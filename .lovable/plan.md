# CORE7 MVP — Build Plan (v2)

Enterprise transformation readiness assessment across 7 pillars: opinionated workflow, BYOK AI per organisation, mandatory human review, exportable boardroom-ready report.

## Stack

- **Frontend**: Vite + React + TypeScript + Tailwind + shadcn/ui (Lovable's standard; Next.js isn't available here — Edge Functions cover server-side needs).
- **Backend**: Lovable Cloud (Postgres + Auth + Storage + Edge Functions). Email/password + Google sign-in.
- **AI**: BYOK per organisation. No reliance on Lovable AI Gateway. Provider abstraction supports OpenAI at launch; Anthropic + Gemini stubs ready.
- **Async**: `ai_analysis_jobs` table; an edge function worker processes jobs and writes results back. UI polls status.
- **Export**: print-optimised report page (`window.print()` to PDF).

## BYOK AI architecture

**Per-organisation configuration** (Org Admin only, `/app/admin/ai`):

- `organisation_ai_settings` table: `organisation_id`, `provider` (`openai` | `anthropic` | `gemini`), `model` (free text, with curated defaults per provider), `temperature`, `max_tokens`, `is_active`, `last_verified_at`, `last_verified_status`.
- Provider API key stored as a Supabase Vault secret keyed by `organisation_id` (never returned to the client; only the last 4 chars surface in the UI).
- "Test connection" button calls a `verify-ai-key` edge function that performs a tiny chat completion and persists the result.

**Provider abstraction** (in edge functions, `supabase/functions/_shared/ai/`):

```
interface AIProvider {
  chat(messages, opts): Promise<{ text, usage }>
  chatStructured<T>(messages, schema, opts): Promise<T>
}
```

Implementations: `OpenAIProvider` (launch), `AnthropicProvider` + `GeminiProvider` (stub interfaces wired but throwing "not yet supported" — switching them on later is a single-file change). A `getProviderForOrg(orgId)` factory pulls the org's settings + vault secret.

**Gating**:

- A `useOrgAiStatus()` hook exposes `{ configured, verified, provider, model }`.
- All AI action buttons (Run analysis, Re-analyse evidence, Generate executive summary) render disabled with a tooltip + inline "Configure AI" CTA when not configured/verified.
- The rest of the product (assessments, questionnaires, surveys, evidence, manual scoring, review, report) works fully without AI. Scores can be entered manually; the report degrades gracefully (no AI rationale section, "AI not configured for this organisation" caveat).
- Cost sits with the customer org — we never proxy through a Lovable-paid gateway.

## Data model (Postgres, all org-scoped, RLS-protected)

- `organisations`, `profiles` (1:1 `auth.users`), `memberships` (user × org × `org_role`).
- `app_role` enum + `user_roles` (org-level admin). Assessment-scoped roles live in `assessment_roles` (`change_owner`, `reviewer`, `observer`) and `pillar_assignments` (`pillar_lead`, `contributor`) — both support multiple users per assessment / per pillar.
- `assessments` (profile, scope, complexity, status, target date).
- `pillars` (seeded: 7 with default weights).
- `pillar_assessments` (status, provisional + final 1–5 score, mapped 0–100, confidence, weight override).
- `questions` (per pillar × subdimension), `responses`.
- `surveys`, `survey_recipients` (tokenised), `survey_responses`.
- `evidence_items` (Storage refs, evidence type, AI summary, relevance, processing status).
- `ai_analysis_jobs` (provider, model, input/output, status, cost estimate, timestamps).
- `recommendations`, `risks`, `review_comments`, `score_overrides` (mandatory rationale), `audit_logs`.
- `organisation_ai_settings` + vault-stored key.

RLS pattern: every table carries `organisation_id`; `SECURITY DEFINER` helpers (`has_org_access`, `has_assessment_role`, `has_role`) prevent recursion. Storage bucket `evidence` is private; signed URLs only.

## Scoring & confidence

- Deterministic roll-up: `overall = Σ(pillar_score_100 × weight)` using seeded defaults (editable per assessment).
- `readiness_band(score)` SQL function → Fragile / Emerging / Developing / Established / Adaptive.
- Confidence function derives Low / Moderate / High / Very High from the seven signals (evidence breadth/relevance/freshness, response volume/diversity, alignment, scope-proportional expectations).
- AI proposes provisional scores; **human review is mandatory** before a pillar can reach Complete and before the assessment can move to Complete.

## AI edge functions (all routed through the org's provider)

- `verify-ai-key` — validates a new key with a minimal call.
- `analyze-evidence` — extracts text from PDF/DOCX/PPTX/XLSX/TXT, summarises, scores relevance.
- `analyze-pillar` — synthesises responses + survey summary + evidence into provisional score, rationale, confidence inputs, risks, recommendations, missing-evidence list, suggested next action.
- `generate-executive-summary` — assessment-level synthesis.

Every AI output row stores and the UI always surfaces: **rationale, evidence considered, missing evidence, confidence, related risks, suggested next action**. No AI output auto-finalises.

## Visual direction (enterprise, analytical, boardroom-ready)

- **Type**: IBM Plex Sans for UI (weights 400/500/600/700), IBM Plex Mono for tabular numerics and IDs. No Inter anywhere.
- **Colour tokens** (HSL, defined in `index.css` `:root`):
  - `--background`: warm ivory `40 33% 97%`
  - `--surface`: soft stone `36 18% 93%`
  - `--foreground`: graphite `220 13% 18%`
  - `--muted-foreground`: `220 9% 38%`
  - `--border`: `35 14% 84%`
  - `--accent`: deep teal `190 65% 28%` (single restrained accent; deep navy `216 60% 22%` reserved for headings/charts)
  - Status: `success 152 45% 32%`, `warning 35 78% 42%`, `danger 0 62% 42%`, `info 210 55% 38%` — all desaturated, never neon.
- **Layout**: dense but readable. 12-col grid, generous vertical rhythm, hairline `--border` rules between sections, sentence-case section labels in Plex Mono uppercase tracking-wide. No card stacking for decoration — only when data demands it.
- **Components**: tables over card grids for lists; sticky table headers; pill status chips with explicit text labels; numeric KPIs in Plex Mono; rounded-sm not rounded-xl; subtle 1px borders, no large drop shadows.
- **Charts**: Recharts with the deep teal / navy / graphite palette, no gradients, gridlines in `--border`.
- **Motion**: restrained — fade/translate ≤120ms, no bouncy easings, no parallax. No hero animations.
- **Print stylesheet** (`@media print`): white background, black-on-white type, page-break controls between report sections, hidden navigation, table-friendly layout.
- **What we avoid**: gradient hero blobs, "Trusted by" rows, glassmorphism, oversized rounded cards, marketing-style emoji, neon accents.

## Pages / routes

1. `/` — restrained sign-in surface (product name + one-line positioning + sign-in panel). No marketing fluff.
2. `/app` — org dashboard: assessments table, overall portfolio KPIs, recent activity.
3. `/app/assessments/new` — opinionated 3-step flow (Profile & scope → Owners & pillar leads → Confirm). Auto-creates 7 pillar workspaces with seeded questions, suggested evidence types, recommended stakeholder groups.
4. `/app/assessments/:id` — overview: overall readiness, confidence, 7 pillar score cards, top risks, top recommendations, missing-evidence flags, review status, activity feed (audit excerpt).
5. `/app/assessments/:id/pillars/:pillarId` — questionnaire, survey summary, evidence list + upload, AI analysis panel (with all six required fields visible), provisional score, confidence, risks, recommendations, missing-evidence prompts, review comments, override history, status controls.
6. `/survey/:token` — public tokenised survey: single-column, ~6–10 Likert + 1–2 free-text per pillar, autosave, no auth, mobile-friendly.
7. `/app/assessments/:id/review` — reviewer queue: approve, request changes, override (mandatory rationale dialog).
8. `/app/assessments/:id/report` — boardroom report: exec summary, overall score + readiness, confidence, domain scores table, strengths, risks, recommendations, missing-evidence caveats, human overrides list, methodology summary. Print-optimised.
9. `/app/admin` — org settings, users + role management, **AI configuration** (BYOK), audit log viewer.

## Workflows

Postgres enums + edge-function-guarded transitions matching your exact lists:

- Pillar: Not Started → In Progress → Awaiting Evidence → Awaiting Stakeholder Input → Ready for AI Analysis → AI Analysis Complete → Ready for Review → Changes Requested → Complete.
- Assessment: Draft → Active → In Review → Complete → Archived.

**Hard gate**: pillar cannot enter Complete without a reviewer approval row; assessment cannot enter Complete unless all 7 pillars are Complete.

## Permissions (RLS + UI)

| Action | OrgAdmin | ChangeOwner | PillarLead | Contributor | Reviewer | Observer |
|---|---|---|---|---|---|---|
| Configure AI (BYOK) | ✓ | | | | | |
| Create assessment | ✓ | ✓ | | | | |
| Assign roles | ✓ | ✓ | | | | |
| Edit questionnaire / upload evidence | | ✓ | ✓ (own) | ✓ (if invited) | | |
| Run AI analysis | | ✓ | ✓ (own) | | | |
| Approve / request changes / override | | ✓ | | | ✓ | |
| Export final report | ✓ | ✓ | | | ✓ | |
| Read assigned assessments | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

Multiple Change Owners per assessment and multiple Pillar Leads per pillar are first-class.

## Auditability (surfaced in UI, not just DB)

Trigger-based `audit_logs` capture: role assignments, evidence uploads, AI job lifecycle, review comments, score overrides (with rationale), final approvals, status transitions, AI config changes (provider/model swap, key rotation).

UI surfaces:
- **Activity feed** on assessment overview (last 20 events).
- **Override history** panel on every pillar.
- **Full audit log viewer** under `/app/admin` with filters by actor, assessment, event type, date range.
- AI analysis cards always display: provider, model, timestamp, who triggered it.

## Seed data (genuinely useful, not lorem)

- 7 pillars + default weights.
- 5–7 questions per pillar (one per subdimension), written for an enterprise audience.
- 16 evidence types from your list.
- All enums (statuses, recommendation categories, priorities, readiness bands).
- One demo organisation **"Northwind Industrials"** with a fully populated sample assessment **"ERP & Operating Model Modernisation"**: realistic responses, seeded evidence summaries (no real files needed — pre-written summaries as if AI-analysed), provisional scores across all 7 pillars, 3 reviewer comments, 1 override, 5 recommendations, 4 risks, and a fully readable executive summary. The sample is read-only-ish (clone-to-edit) so users land in a believable product on first login.

## Build order

1. Cloud + auth + profiles + orgs + memberships + RBAC helpers + RLS.
2. Schema migration (all tables, enums, triggers, seed data).
3. Storage bucket + evidence upload.
4. Assessment + pillar CRUD + workflow + manual scoring (fully usable without AI).
5. Questionnaire + tokenised survey flow.
6. Org AI settings page (BYOK) + `verify-ai-key` + provider abstraction.
7. AI edge functions + `ai_analysis_jobs` worker pattern; UI gating.
8. Review workflow + overrides + audit surfacing.
9. Print-optimised final report.
10. Demo seed polish + admin audit viewer.

## Out of scope

SharePoint / Jira / ServiceNow / M365 / Slack / Teams / Confluence / HR integrations, continuous monitoring, automated evidence discovery, advanced benchmarking, autonomous final AI scoring, complex workflow automation, native mobile.

## Confirmations

- **AI key storage**: Supabase Vault, encrypted at rest, never returned to client (only last-4 surfaced). OK to proceed?
- **Sample organisation name** "Northwind Industrials" / sample assessment "ERP & Operating Model Modernisation" — happy with these, or prefer your own naming?

Reply "go" (or with tweaks) and I'll build.
