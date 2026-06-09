
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ENUMS
CREATE TYPE public.app_role AS ENUM ('org_admin');
CREATE TYPE public.org_role AS ENUM ('admin', 'member');
CREATE TYPE public.assessment_role AS ENUM ('change_owner', 'reviewer', 'observer');
CREATE TYPE public.pillar_role AS ENUM ('pillar_lead', 'contributor');
CREATE TYPE public.assessment_status AS ENUM ('draft', 'active', 'in_review', 'complete', 'archived');
CREATE TYPE public.pillar_status AS ENUM ('not_started','in_progress','awaiting_evidence','awaiting_stakeholder_input','ready_for_ai_analysis','ai_analysis_complete','ready_for_review','changes_requested','complete');
CREATE TYPE public.ai_job_status AS ENUM ('pending','running','complete','failed');
CREATE TYPE public.ai_provider AS ENUM ('openai','anthropic','gemini');
CREATE TYPE public.recommendation_category AS ENUM ('quick_win','foundational_improvement','strategic_intervention','risk_mitigation','dependency_resolution','capability_uplift','governance_improvement','adoption_intervention');
CREATE TYPE public.priority_level AS ENUM ('low','medium','high','critical');
CREATE TYPE public.recommendation_status AS ENUM ('suggested','accepted','in_progress','complete','dismissed');
CREATE TYPE public.evidence_type AS ENUM ('strategy_document','business_case','governance_paper','risk_register','process_map','policy_or_standard','operating_model_document','org_chart','capability_assessment','training_plan','technology_inventory','architecture_diagram','data_reporting_document','kpi_performance_report','meeting_note','other');
CREATE TYPE public.evidence_processing_status AS ENUM ('uploaded','processing','complete','failed');

-- CORE TABLES
CREATE TABLE public.organisations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organisations TO authenticated;
GRANT ALL ON public.organisations TO service_role;
ALTER TABLE public.organisations ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.org_role NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organisation_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.memberships TO authenticated;
GRANT ALL ON public.memberships TO service_role;
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE(user_id, organisation_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_org_access(_user_id UUID, _org_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.memberships WHERE user_id = _user_id AND organisation_id = _org_id)
$$;

CREATE OR REPLACE FUNCTION public.is_org_admin(_user_id UUID, _org_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND organisation_id = _org_id AND role = 'org_admin')
$$;

CREATE TABLE public.pillars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  default_weight NUMERIC(5,2) NOT NULL,
  display_order INT NOT NULL,
  subdimensions JSONB NOT NULL DEFAULT '[]'::jsonb
);
GRANT SELECT ON public.pillars TO authenticated, anon;
GRANT ALL ON public.pillars TO service_role;
ALTER TABLE public.pillars ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Pillars are public read" ON public.pillars FOR SELECT TO authenticated, anon USING (true);

CREATE TABLE public.assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  transformation_profile TEXT,
  scope_level TEXT,
  complexity_level TEXT,
  target_completion_date DATE,
  business_area TEXT,
  status public.assessment_status NOT NULL DEFAULT 'draft',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assessments TO authenticated;
GRANT ALL ON public.assessments TO service_role;
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.assessment_org(_assessment_id UUID)
RETURNS UUID LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT organisation_id FROM public.assessments WHERE id = _assessment_id
$$;

CREATE TABLE public.assessment_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.assessment_role NOT NULL,
  UNIQUE(assessment_id, user_id, role)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assessment_roles TO authenticated;
GRANT ALL ON public.assessment_roles TO service_role;
ALTER TABLE public.assessment_roles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.pillar_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  pillar_id UUID NOT NULL REFERENCES public.pillars(id),
  status public.pillar_status NOT NULL DEFAULT 'not_started',
  provisional_score NUMERIC(3,1),
  final_score NUMERIC(3,1),
  confidence TEXT,
  weight_override NUMERIC(5,2),
  ai_rationale TEXT,
  ai_evidence_considered TEXT[],
  ai_missing_evidence TEXT[],
  ai_suggested_next_action TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(assessment_id, pillar_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pillar_assessments TO authenticated;
GRANT ALL ON public.pillar_assessments TO service_role;
ALTER TABLE public.pillar_assessments ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.pillar_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pillar_assessment_id UUID NOT NULL REFERENCES public.pillar_assessments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.pillar_role NOT NULL,
  UNIQUE(pillar_assessment_id, user_id, role)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pillar_assignments TO authenticated;
GRANT ALL ON public.pillar_assignments TO service_role;
ALTER TABLE public.pillar_assignments ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pillar_id UUID NOT NULL REFERENCES public.pillars(id) ON DELETE CASCADE,
  subdimension TEXT NOT NULL,
  prompt TEXT NOT NULL,
  display_order INT NOT NULL DEFAULT 0
);
GRANT SELECT ON public.questions TO authenticated, anon;
GRANT ALL ON public.questions TO service_role;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Questions are public read" ON public.questions FOR SELECT TO authenticated, anon USING (true);

CREATE TABLE public.responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pillar_assessment_id UUID NOT NULL REFERENCES public.pillar_assessments(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.questions(id),
  respondent_id UUID REFERENCES auth.users(id),
  score INT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.responses TO authenticated;
GRANT ALL ON public.responses TO service_role;
ALTER TABLE public.responses ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  pillar_id UUID REFERENCES public.pillars(id),
  title TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.surveys TO authenticated;
GRANT SELECT ON public.surveys TO anon;
GRANT ALL ON public.surveys TO service_role;
ALTER TABLE public.surveys ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.survey_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  stakeholder_group TEXT,
  token TEXT NOT NULL UNIQUE DEFAULT encode(extensions.gen_random_bytes(24), 'hex'),
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.survey_recipients TO authenticated;
GRANT SELECT, UPDATE ON public.survey_recipients TO anon;
GRANT ALL ON public.survey_recipients TO service_role;
ALTER TABLE public.survey_recipients ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.survey_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID NOT NULL REFERENCES public.survey_recipients(id) ON DELETE CASCADE,
  question_id UUID REFERENCES public.questions(id),
  score INT,
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.survey_responses TO authenticated, anon;
GRANT ALL ON public.survey_responses TO service_role;
ALTER TABLE public.survey_responses ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.evidence_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  pillar_assessment_id UUID REFERENCES public.pillar_assessments(id) ON DELETE SET NULL,
  uploaded_by UUID REFERENCES auth.users(id),
  file_name TEXT NOT NULL,
  file_type TEXT,
  storage_path TEXT,
  evidence_type public.evidence_type NOT NULL DEFAULT 'other',
  description TEXT,
  ai_summary TEXT,
  relevance_score NUMERIC(3,1),
  processing_status public.evidence_processing_status NOT NULL DEFAULT 'uploaded',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.evidence_items TO authenticated;
GRANT ALL ON public.evidence_items TO service_role;
ALTER TABLE public.evidence_items ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.ai_analysis_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  assessment_id UUID REFERENCES public.assessments(id) ON DELETE CASCADE,
  pillar_assessment_id UUID REFERENCES public.pillar_assessments(id) ON DELETE CASCADE,
  job_type TEXT NOT NULL,
  status public.ai_job_status NOT NULL DEFAULT 'pending',
  provider public.ai_provider,
  model TEXT,
  triggered_by UUID REFERENCES auth.users(id),
  input JSONB,
  output JSONB,
  error TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.ai_analysis_jobs TO authenticated;
GRANT ALL ON public.ai_analysis_jobs TO service_role;
ALTER TABLE public.ai_analysis_jobs ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  pillar_id UUID REFERENCES public.pillars(id),
  title TEXT NOT NULL,
  description TEXT,
  category public.recommendation_category NOT NULL DEFAULT 'foundational_improvement',
  priority public.priority_level NOT NULL DEFAULT 'medium',
  rationale TEXT,
  suggested_owner TEXT,
  status public.recommendation_status NOT NULL DEFAULT 'suggested',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recommendations TO authenticated;
GRANT ALL ON public.recommendations TO service_role;
ALTER TABLE public.recommendations ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.risks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  pillar_id UUID REFERENCES public.pillars(id),
  title TEXT NOT NULL,
  description TEXT,
  severity public.priority_level NOT NULL DEFAULT 'medium',
  likelihood public.priority_level NOT NULL DEFAULT 'medium',
  mitigation TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.risks TO authenticated;
GRANT ALL ON public.risks TO service_role;
ALTER TABLE public.risks ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.review_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pillar_assessment_id UUID NOT NULL REFERENCES public.pillar_assessments(id) ON DELETE CASCADE,
  author_id UUID REFERENCES auth.users(id),
  comment TEXT NOT NULL,
  decision TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.review_comments TO authenticated;
GRANT ALL ON public.review_comments TO service_role;
ALTER TABLE public.review_comments ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.score_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pillar_assessment_id UUID NOT NULL REFERENCES public.pillar_assessments(id) ON DELETE CASCADE,
  author_id UUID REFERENCES auth.users(id),
  previous_score NUMERIC(3,1),
  new_score NUMERIC(3,1) NOT NULL,
  rationale TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.score_overrides TO authenticated;
GRANT ALL ON public.score_overrides TO service_role;
ALTER TABLE public.score_overrides ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID REFERENCES public.organisations(id) ON DELETE CASCADE,
  assessment_id UUID REFERENCES public.assessments(id) ON DELETE SET NULL,
  actor_id UUID REFERENCES auth.users(id),
  actor_email TEXT,
  event_type TEXT NOT NULL,
  detail JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.organisation_ai_settings (
  organisation_id UUID PRIMARY KEY REFERENCES public.organisations(id) ON DELETE CASCADE,
  provider public.ai_provider NOT NULL DEFAULT 'openai',
  model TEXT NOT NULL DEFAULT 'gpt-4o-mini',
  api_key_last4 TEXT,
  is_active BOOLEAN NOT NULL DEFAULT false,
  last_verified_at TIMESTAMPTZ,
  last_verified_status TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);
GRANT SELECT, INSERT, UPDATE ON public.organisation_ai_settings TO authenticated;
GRANT ALL ON public.organisation_ai_settings TO service_role;
ALTER TABLE public.organisation_ai_settings ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.organisation_ai_keys (
  organisation_id UUID PRIMARY KEY REFERENCES public.organisations(id) ON DELETE CASCADE,
  encrypted_key TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.organisation_ai_keys TO service_role;
ALTER TABLE public.organisation_ai_keys ENABLE ROW LEVEL SECURITY;

-- POLICIES
CREATE POLICY "Members read own orgs" ON public.organisations FOR SELECT TO authenticated USING (public.has_org_access(auth.uid(), id));
CREATE POLICY "Auth users create orgs" ON public.organisations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Org admins update org" ON public.organisations FOR UPDATE TO authenticated USING (public.is_org_admin(auth.uid(), id));

CREATE POLICY "Profiles read self" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "Profiles read same org" ON public.profiles FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.memberships m1 JOIN public.memberships m2 ON m1.organisation_id = m2.organisation_id WHERE m1.user_id = auth.uid() AND m2.user_id = profiles.id));
CREATE POLICY "Profiles insert self" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "Profiles update self" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());

CREATE POLICY "Memberships read own org" ON public.memberships FOR SELECT TO authenticated USING (public.has_org_access(auth.uid(), organisation_id));
CREATE POLICY "Memberships insert self or by admin" ON public.memberships FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() OR public.is_org_admin(auth.uid(), organisation_id));
CREATE POLICY "Memberships update by admin" ON public.memberships FOR UPDATE TO authenticated USING (public.is_org_admin(auth.uid(), organisation_id));
CREATE POLICY "Memberships delete by admin" ON public.memberships FOR DELETE TO authenticated USING (public.is_org_admin(auth.uid(), organisation_id));

CREATE POLICY "Roles read same org" ON public.user_roles FOR SELECT TO authenticated USING (public.has_org_access(auth.uid(), organisation_id));

CREATE POLICY "Assessments read" ON public.assessments FOR SELECT TO authenticated USING (public.has_org_access(auth.uid(), organisation_id));
CREATE POLICY "Assessments insert" ON public.assessments FOR INSERT TO authenticated WITH CHECK (public.has_org_access(auth.uid(), organisation_id));
CREATE POLICY "Assessments update" ON public.assessments FOR UPDATE TO authenticated USING (public.has_org_access(auth.uid(), organisation_id));
CREATE POLICY "Assessments delete by admin" ON public.assessments FOR DELETE TO authenticated USING (public.is_org_admin(auth.uid(), organisation_id));

CREATE POLICY "AR read" ON public.assessment_roles FOR SELECT TO authenticated USING (public.has_org_access(auth.uid(), public.assessment_org(assessment_id)));
CREATE POLICY "AR write" ON public.assessment_roles FOR ALL TO authenticated USING (public.has_org_access(auth.uid(), public.assessment_org(assessment_id))) WITH CHECK (public.has_org_access(auth.uid(), public.assessment_org(assessment_id)));

CREATE POLICY "PA read" ON public.pillar_assessments FOR SELECT TO authenticated USING (public.has_org_access(auth.uid(), public.assessment_org(assessment_id)));
CREATE POLICY "PA write" ON public.pillar_assessments FOR ALL TO authenticated USING (public.has_org_access(auth.uid(), public.assessment_org(assessment_id))) WITH CHECK (public.has_org_access(auth.uid(), public.assessment_org(assessment_id)));

CREATE POLICY "PAssign read" ON public.pillar_assignments FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.pillar_assessments pa WHERE pa.id = pillar_assessment_id AND public.has_org_access(auth.uid(), public.assessment_org(pa.assessment_id))));
CREATE POLICY "PAssign write" ON public.pillar_assignments FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.pillar_assessments pa WHERE pa.id = pillar_assessment_id AND public.has_org_access(auth.uid(), public.assessment_org(pa.assessment_id)))) WITH CHECK (EXISTS (SELECT 1 FROM public.pillar_assessments pa WHERE pa.id = pillar_assessment_id AND public.has_org_access(auth.uid(), public.assessment_org(pa.assessment_id))));

CREATE POLICY "Responses read" ON public.responses FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.pillar_assessments pa WHERE pa.id = pillar_assessment_id AND public.has_org_access(auth.uid(), public.assessment_org(pa.assessment_id))));
CREATE POLICY "Responses write" ON public.responses FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.pillar_assessments pa WHERE pa.id = pillar_assessment_id AND public.has_org_access(auth.uid(), public.assessment_org(pa.assessment_id)))) WITH CHECK (EXISTS (SELECT 1 FROM public.pillar_assessments pa WHERE pa.id = pillar_assessment_id AND public.has_org_access(auth.uid(), public.assessment_org(pa.assessment_id))));

CREATE POLICY "Surveys read org" ON public.surveys FOR SELECT TO authenticated USING (public.has_org_access(auth.uid(), public.assessment_org(assessment_id)));
CREATE POLICY "Surveys public read" ON public.surveys FOR SELECT TO anon USING (true);
CREATE POLICY "Surveys write" ON public.surveys FOR ALL TO authenticated USING (public.has_org_access(auth.uid(), public.assessment_org(assessment_id))) WITH CHECK (public.has_org_access(auth.uid(), public.assessment_org(assessment_id)));

CREATE POLICY "SR read org" ON public.survey_recipients FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.surveys s WHERE s.id = survey_id AND public.has_org_access(auth.uid(), public.assessment_org(s.assessment_id))));
CREATE POLICY "SR write org" ON public.survey_recipients FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.surveys s WHERE s.id = survey_id AND public.has_org_access(auth.uid(), public.assessment_org(s.assessment_id)))) WITH CHECK (EXISTS (SELECT 1 FROM public.surveys s WHERE s.id = survey_id AND public.has_org_access(auth.uid(), public.assessment_org(s.assessment_id))));
CREATE POLICY "SR anon read" ON public.survey_recipients FOR SELECT TO anon USING (true);
CREATE POLICY "SR anon update" ON public.survey_recipients FOR UPDATE TO anon USING (submitted_at IS NULL);

CREATE POLICY "SResp read org" ON public.survey_responses FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.survey_recipients sr JOIN public.surveys s ON s.id = sr.survey_id WHERE sr.id = recipient_id AND public.has_org_access(auth.uid(), public.assessment_org(s.assessment_id))));
CREATE POLICY "SResp anon insert" ON public.survey_responses FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Evidence read" ON public.evidence_items FOR SELECT TO authenticated USING (public.has_org_access(auth.uid(), organisation_id));
CREATE POLICY "Evidence write" ON public.evidence_items FOR ALL TO authenticated USING (public.has_org_access(auth.uid(), organisation_id)) WITH CHECK (public.has_org_access(auth.uid(), organisation_id));

CREATE POLICY "AI jobs read" ON public.ai_analysis_jobs FOR SELECT TO authenticated USING (public.has_org_access(auth.uid(), organisation_id));
CREATE POLICY "AI jobs insert" ON public.ai_analysis_jobs FOR INSERT TO authenticated WITH CHECK (public.has_org_access(auth.uid(), organisation_id));

CREATE POLICY "Recs read" ON public.recommendations FOR SELECT TO authenticated USING (public.has_org_access(auth.uid(), organisation_id));
CREATE POLICY "Recs write" ON public.recommendations FOR ALL TO authenticated USING (public.has_org_access(auth.uid(), organisation_id)) WITH CHECK (public.has_org_access(auth.uid(), organisation_id));

CREATE POLICY "Risks read" ON public.risks FOR SELECT TO authenticated USING (public.has_org_access(auth.uid(), organisation_id));
CREATE POLICY "Risks write" ON public.risks FOR ALL TO authenticated USING (public.has_org_access(auth.uid(), organisation_id)) WITH CHECK (public.has_org_access(auth.uid(), organisation_id));

CREATE POLICY "RC read" ON public.review_comments FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.pillar_assessments pa WHERE pa.id = pillar_assessment_id AND public.has_org_access(auth.uid(), public.assessment_org(pa.assessment_id))));
CREATE POLICY "RC write" ON public.review_comments FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.pillar_assessments pa WHERE pa.id = pillar_assessment_id AND public.has_org_access(auth.uid(), public.assessment_org(pa.assessment_id)))) WITH CHECK (EXISTS (SELECT 1 FROM public.pillar_assessments pa WHERE pa.id = pillar_assessment_id AND public.has_org_access(auth.uid(), public.assessment_org(pa.assessment_id))));

CREATE POLICY "SO read" ON public.score_overrides FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.pillar_assessments pa WHERE pa.id = pillar_assessment_id AND public.has_org_access(auth.uid(), public.assessment_org(pa.assessment_id))));
CREATE POLICY "SO insert" ON public.score_overrides FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.pillar_assessments pa WHERE pa.id = pillar_assessment_id AND public.has_org_access(auth.uid(), public.assessment_org(pa.assessment_id))));

CREATE POLICY "Audit read" ON public.audit_logs FOR SELECT TO authenticated USING (organisation_id IS NULL OR public.has_org_access(auth.uid(), organisation_id));
CREATE POLICY "Audit insert" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (organisation_id IS NULL OR public.has_org_access(auth.uid(), organisation_id));

CREATE POLICY "AI settings read" ON public.organisation_ai_settings FOR SELECT TO authenticated USING (public.has_org_access(auth.uid(), organisation_id));
CREATE POLICY "AI settings write by admin" ON public.organisation_ai_settings FOR ALL TO authenticated USING (public.is_org_admin(auth.uid(), organisation_id)) WITH CHECK (public.is_org_admin(auth.uid(), organisation_id));

-- Readiness band
CREATE OR REPLACE FUNCTION public.readiness_band(score NUMERIC) RETURNS TEXT
LANGUAGE SQL IMMUTABLE AS $$
  SELECT CASE
    WHEN score IS NULL THEN 'Unscored'
    WHEN score <= 20 THEN 'Fragile'
    WHEN score <= 40 THEN 'Emerging'
    WHEN score <= 60 THEN 'Developing'
    WHEN score <= 80 THEN 'Established'
    ELSE 'Adaptive'
  END
$$;

-- Profile auto-create trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_org_id UUID;
  v_demo_org_id UUID;
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)));

  INSERT INTO public.organisations (name, is_demo)
  VALUES (COALESCE(NEW.raw_user_meta_data->>'organisation_name', split_part(NEW.email,'@',1) || '''s Workspace'), false)
  RETURNING id INTO v_org_id;

  INSERT INTO public.memberships (organisation_id, user_id, role) VALUES (v_org_id, NEW.id, 'admin');
  INSERT INTO public.user_roles (user_id, organisation_id, role) VALUES (NEW.id, v_org_id, 'org_admin');
  INSERT INTO public.organisation_ai_settings (organisation_id, updated_by) VALUES (v_org_id, NEW.id);

  SELECT id INTO v_demo_org_id FROM public.organisations WHERE is_demo = true LIMIT 1;
  IF v_demo_org_id IS NOT NULL THEN
    INSERT INTO public.memberships (organisation_id, user_id, role) VALUES (v_demo_org_id, NEW.id, 'member') ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- SEED: PILLARS
INSERT INTO public.pillars (code, name, description, default_weight, display_order, subdimensions) VALUES
('strategy_leadership','Strategy & Leadership','Clarity of strategic intent, executive sponsorship, decision rights, alignment of transformation to enterprise strategy.',20.00,1,
  '["Strategic clarity","Executive sponsorship","Decision rights","Alignment to enterprise priorities","Investment commitment"]'::jsonb),
('data_quality_insight','Data Quality & Insight','Trustworthy data, single source of truth, analytics maturity, ability to evidence the case for change.',7.00,2,
  '["Data trust & quality","Single source of truth","Analytics & insight","Data governance","Evidence-based decision making"]'::jsonb),
('process_maturity','Process Maturity','Standardisation, documentation, performance management, process ownership and continuous improvement.',12.00,3,
  '["Process documentation","Standardisation","Performance management","Process ownership","Continuous improvement"]'::jsonb),
('technology_tooling','Technology & Tooling','Fitness, scalability and supportability of the technology landscape underpinning the transformation.',15.00,4,
  '["Architecture fitness","Scalability","Supportability","Integration","Technical debt"]'::jsonb),
('people_capability','People & Capability','Skills, capacity, learning culture and capability to absorb and operate the change.',18.00,5,
  '["Skills & capability","Capacity","Learning culture","Talent strategy","Knowledge management"]'::jsonb),
('governance_risk','Governance & Risk','Governance forums, risk management, compliance, control environment and assurance.',10.00,6,
  '["Governance design","Risk management","Compliance posture","Control environment","Assurance & audit"]'::jsonb),
('organisational_adaptability','Organisational Adaptability','Change appetite, behavioural readiness, communications and the ability to sustain the change.',18.00,7,
  '["Change appetite","Behavioural readiness","Communications","Adoption & sustainment","Resilience"]'::jsonb);

-- SEED: QUESTIONS
DO $seed$
DECLARE
  p RECORD;
  prompts TEXT[];
  i INT;
  sds TEXT[];
BEGIN
  FOR p IN SELECT * FROM public.pillars LOOP
    SELECT ARRAY(SELECT jsonb_array_elements_text(p.subdimensions)) INTO sds;
    prompts := CASE p.code
      WHEN 'strategy_leadership' THEN ARRAY[
        'The strategic intent for this transformation is clearly articulated and consistently understood by leadership.',
        'A named executive sponsor is actively engaged, accountable and visible across the programme.',
        'Decision rights and escalation paths are defined and respected.',
        'This transformation is demonstrably aligned to the top enterprise priorities.',
        'Multi-year investment is committed and protected from short-term pressures.']
      WHEN 'data_quality_insight' THEN ARRAY[
        'The data needed to run and measure this transformation is trusted by the business.',
        'A single source of truth exists for the core entities affected by the change.',
        'We can generate the analytics and insight required to steer this programme.',
        'Data ownership, quality standards and remediation processes are in place.',
        'Material decisions on this transformation are made on the basis of evidence, not opinion.']
      WHEN 'process_maturity' THEN ARRAY[
        'The end-to-end processes in scope are documented to a usable level of detail.',
        'Processes are standardised across business areas where appropriate.',
        'Process performance is measured and reviewed on a regular cadence.',
        'Process owners are named, empowered and held to account.',
        'There is a working mechanism for continuous improvement of these processes.']
      WHEN 'technology_tooling' THEN ARRAY[
        'The current architecture can support the target operating model without material rework.',
        'Underlying platforms can scale to expected demand without significant risk.',
        'Run, support and lifecycle management of the technology stack is well established.',
        'Integration between core systems is reliable, observable and maintainable.',
        'Known technical debt has been quantified and is being actively managed down.']
      WHEN 'people_capability' THEN ARRAY[
        'The skills required to deliver and operate the change are available or have a credible build path.',
        'There is sufficient capacity in the organisation to absorb the change without breaking BAU.',
        'A learning culture exists; people actively develop new capability.',
        'A talent strategy supports recruitment, retention and succession in critical roles.',
        'Knowledge is captured and shared rather than locked in individuals.']
      WHEN 'governance_risk' THEN ARRAY[
        'Governance forums are designed appropriately, attended and produce decisions.',
        'Risks are systematically identified, owned, quantified and tracked.',
        'Regulatory and compliance obligations are well understood and being met.',
        'The control environment is proportionate, documented and operating effectively.',
        'Independent assurance and audit can be conducted without obstruction.']
      WHEN 'organisational_adaptability' THEN ARRAY[
        'The organisation has an appetite for change of this magnitude.',
        'Behaviours, leadership style and ways of working are ready to support the change.',
        'Communications to affected stakeholders are clear, timely and trusted.',
        'A credible plan exists to drive and sustain adoption beyond go-live.',
        'The organisation has demonstrated resilience through previous comparable changes.']
    END;
    FOR i IN 1..array_length(prompts,1) LOOP
      INSERT INTO public.questions (pillar_id, subdimension, prompt, display_order)
      VALUES (p.id, sds[i], prompts[i], i);
    END LOOP;
  END LOOP;
END $seed$;

-- SEED: DEMO ORG
DO $demo$
DECLARE
  v_org UUID;
  v_assessment UUID;
  pd RECORD;
BEGIN
  INSERT INTO public.organisations (name, is_demo) VALUES ('Northwind Industrials (Demo)', true) RETURNING id INTO v_org;
  INSERT INTO public.organisation_ai_settings (organisation_id) VALUES (v_org);

  INSERT INTO public.assessments (organisation_id, name, description, transformation_profile, scope_level, complexity_level, target_completion_date, business_area, status)
  VALUES (v_org, 'ERP & Operating Model Modernisation',
    'Replace the legacy ERP across Manufacturing, Supply Chain and Finance whilst standing up a new global process operating model. The assessment covers readiness across all seven CORE7 pillars at the enterprise level.',
    'Enterprise platform replacement','Enterprise','High',(CURRENT_DATE + INTERVAL '14 months')::date,'Manufacturing, Supply Chain, Finance','in_review')
  RETURNING id INTO v_assessment;

  FOR pd IN
    SELECT p.id, p.code,
      CASE p.code WHEN 'strategy_leadership' THEN 3.8 WHEN 'data_quality_insight' THEN 2.6 WHEN 'process_maturity' THEN 3.2 WHEN 'technology_tooling' THEN 2.9 WHEN 'people_capability' THEN 3.4 WHEN 'governance_risk' THEN 4.0 WHEN 'organisational_adaptability' THEN 2.8 END AS score,
      CASE p.code WHEN 'strategy_leadership' THEN 'High' WHEN 'data_quality_insight' THEN 'Moderate' WHEN 'process_maturity' THEN 'High' WHEN 'technology_tooling' THEN 'Moderate' WHEN 'people_capability' THEN 'Moderate' WHEN 'governance_risk' THEN 'Very High' WHEN 'organisational_adaptability' THEN 'Low' END AS conf,
      CASE p.code
        WHEN 'strategy_leadership' THEN 'Strategic intent is consistently articulated by the CEO and CFO and is reflected in the FY plan. Sponsorship is strong but decision rights between the central PMO and divisional MDs remain ambiguous in two business units, slowing key sequencing decisions.'
        WHEN 'data_quality_insight' THEN 'Material data quality issues persist in the item master, customer master and BOM data. There is no agreed single source of truth for the product hierarchy. Analytics is largely Excel-driven outside Finance.'
        WHEN 'process_maturity' THEN 'Core order-to-cash and procure-to-pay are documented to L3 and broadly standardised. Plan-to-produce documentation is patchy across the three manufacturing sites. Continuous improvement cadence exists in Finance but is informal elsewhere.'
        WHEN 'technology_tooling' THEN 'The legacy ERP is past vendor end-of-mainstream support. Integration is point-to-point. Target architecture has been agreed at a principles level but the integration layer and reference data strategy remain open.'
        WHEN 'people_capability' THEN 'Functional capability is generally strong; programme delivery capacity is the constraint. Solution architect, data lead and OCM lead are single points of failure. Training and re-skilling pathways are not yet defined.'
        WHEN 'governance_risk' THEN 'Programme governance is well-designed and disciplined; risks are actively managed with named owners and a credible mitigation log. Independent assurance reviews have been commissioned on schedule.'
        WHEN 'organisational_adaptability' THEN 'Two of three regions have absorbed major change in the last 24 months and show fatigue. Comms cadence is good but messaging on the operating model implications is inconsistent. Sustainment plan is embryonic.'
      END AS rationale,
      CASE p.code
        WHEN 'strategy_leadership' THEN ARRAY['Group strategy refresh (FY)','CEO town hall recording','Sponsor briefing pack','PMO operating model v1.2']
        WHEN 'data_quality_insight' THEN ARRAY['Data quality scorecard Q2','Master data heat-map','BOM remediation backlog']
        WHEN 'process_maturity' THEN ARRAY['L3 process maps O2C and P2P','Plan-to-produce process inventory','Operational KPI pack May']
        WHEN 'technology_tooling' THEN ARRAY['Current state architecture diagram','Vendor support end-of-life letter','Target architecture principles v0.6']
        WHEN 'people_capability' THEN ARRAY['Programme RACI','Critical role single-point-of-failure register','Capacity heatmap']
        WHEN 'governance_risk' THEN ARRAY['Programme charter v3','Risk register (live)','Independent assurance Q1 report','Compliance impact assessment']
        WHEN 'organisational_adaptability' THEN ARRAY['Change saturation index','Stakeholder analysis','Comms calendar','Adoption hypothesis paper']
      END AS evidence_considered,
      CASE p.code
        WHEN 'strategy_leadership' THEN ARRAY['Documented decision-rights matrix between PMO and divisions']
        WHEN 'data_quality_insight' THEN ARRAY['Approved single-source-of-truth definition for product hierarchy','Data ownership RACI']
        WHEN 'process_maturity' THEN ARRAY['L3 maps for plan-to-produce at all three sites']
        WHEN 'technology_tooling' THEN ARRAY['Confirmed integration platform decision','Reference data strategy']
        WHEN 'people_capability' THEN ARRAY['Capability uplift plan','Succession cover for solution architect and data lead']
        WHEN 'governance_risk' THEN ARRAY[]::TEXT[]
        WHEN 'organisational_adaptability' THEN ARRAY['Sustainment plan','Region-level change capacity assessment']
      END AS missing_evidence,
      CASE p.code
        WHEN 'strategy_leadership' THEN 'Hold a working session in the next 2 weeks to formalise PMO/division decision rights and publish to the programme.'
        WHEN 'data_quality_insight' THEN 'Stand up a master data remediation squad with named owners for item, customer and BOM.'
        WHEN 'process_maturity' THEN 'Commission L3 process mapping for plan-to-produce at the two sites currently outside scope.'
        WHEN 'technology_tooling' THEN 'Close the integration platform decision and publish target reference data strategy by end of quarter.'
        WHEN 'people_capability' THEN 'Identify and contract succession cover for the three single-point-of-failure roles within 30 days.'
        WHEN 'governance_risk' THEN 'Maintain current cadence; share governance practice as a template for other programmes.'
        WHEN 'organisational_adaptability' THEN 'Run a change saturation review with regional MDs and re-baseline the comms plan with sustainment owners.'
      END AS next_action
    FROM public.pillars p
  LOOP
    INSERT INTO public.pillar_assessments (assessment_id, pillar_id, status, provisional_score, final_score, confidence, ai_rationale, ai_evidence_considered, ai_missing_evidence, ai_suggested_next_action, reviewed_at)
    VALUES (v_assessment, pd.id,
      CASE WHEN pd.code IN ('governance_risk','strategy_leadership') THEN 'complete'::public.pillar_status ELSE 'ready_for_review'::public.pillar_status END,
      pd.score, pd.score, pd.conf, pd.rationale, pd.evidence_considered, pd.missing_evidence, pd.next_action,
      CASE WHEN pd.code IN ('governance_risk','strategy_leadership') THEN now() - INTERVAL '3 days' ELSE NULL END);
  END LOOP;

  INSERT INTO public.risks (organisation_id, assessment_id, pillar_id, title, description, severity, likelihood, mitigation)
  SELECT v_org, v_assessment, p.id, r.title, r.description, r.severity::public.priority_level, r.likelihood::public.priority_level, r.mitigation
  FROM public.pillars p JOIN (VALUES
    ('data_quality_insight','Master data quality blocks cutover','Item, customer and BOM data remediation is materially behind plan and threatens cutover readiness.','critical','high','Dedicated remediation squad; weekly steerco visibility; cutover criteria gated on DQ thresholds.'),
    ('technology_tooling','Integration platform decision unresolved','Without an agreed integration approach, design work cannot converge and timeline slips by 4–6 weeks.','high','high','Architecture decision record by end of month; named accountable owner; vendor shortlist locked.'),
    ('organisational_adaptability','Change fatigue in two regions','Two regions have absorbed major change within 24 months and are at risk of poor adoption.','high','medium','Regional change capacity review; sequencing adjustment; localised adoption coaches.'),
    ('people_capability','Single points of failure in critical roles','Solution architect, data lead and OCM lead have no documented cover.','high','medium','Contract succession cover; document role plays; cross-train.')
  ) r(pcode, title, description, severity, likelihood, mitigation) ON p.code = r.pcode;

  INSERT INTO public.recommendations (organisation_id, assessment_id, pillar_id, title, description, category, priority, rationale, suggested_owner, status)
  SELECT v_org, v_assessment, p.id, r.title, r.description, r.category::public.recommendation_category, r.priority::public.priority_level, r.rationale, r.owner_, r.status_::public.recommendation_status
  FROM public.pillars p JOIN (VALUES
    ('data_quality_insight','Establish master data remediation squad','Cross-functional squad with named accountability and weekly steerco reporting.','foundational_improvement','critical','MDM data quality is the single biggest readiness gap and a cutover blocker.','Chief Data Officer','suggested'),
    ('technology_tooling','Close the integration platform decision','Convene the architecture board and issue an ADR within 14 days.','dependency_resolution','high','Open decision is propagating delay across the design workstream.','Chief Architect','in_progress'),
    ('organisational_adaptability','Re-baseline regional sequencing','Adjust go-live order to reflect change capacity in the two saturated regions.','adoption_intervention','high','Reduces adoption risk and protects benefits realisation.','Programme Director','suggested'),
    ('strategy_leadership','Publish PMO/division decision-rights matrix','Working session followed by publication and socialisation.','governance_improvement','medium','Removes recurring escalation friction on sequencing and scope.','Programme Director','accepted'),
    ('people_capability','Contract succession cover for critical roles','Engage interim cover for solution architect, data lead and OCM lead.','capability_uplift','high','Removes named single points of failure on the critical path.','Head of Resourcing','suggested')
  ) r(pcode, title, description, category, priority, rationale, owner_, status_) ON p.code = r.pcode;

  INSERT INTO public.review_comments (pillar_assessment_id, comment, decision)
  SELECT pa.id, c.comment, c.decision
  FROM public.pillar_assessments pa JOIN public.pillars p ON p.id = pa.pillar_id
  JOIN (VALUES
    ('data_quality_insight','Agree with the rationale. Add explicit reference to the BOM remediation backlog as the most concerning area.','request_changes'),
    ('governance_risk','Strong evidence base. Recommend we use this as the benchmark for governance maturity across other programmes.','approve'),
    ('technology_tooling','Confidence rating should be downgraded if the integration platform decision is not closed in the next 14 days.','request_changes')
  ) c(pcode, comment, decision) ON p.code = c.pcode
  WHERE pa.assessment_id = v_assessment;

  -- Audit trail entries
  INSERT INTO public.audit_logs (organisation_id, assessment_id, actor_email, event_type, detail) VALUES
    (v_org, v_assessment, 'system@core7','assessment.created','{"name":"ERP & Operating Model Modernisation"}'::jsonb),
    (v_org, v_assessment, 'system@core7','pillar.ai_analysis_complete','{"pillar":"Strategy & Leadership"}'::jsonb),
    (v_org, v_assessment, 'system@core7','pillar.ai_analysis_complete','{"pillar":"Governance & Risk"}'::jsonb),
    (v_org, v_assessment, 'reviewer@northwind','review.approved','{"pillar":"Governance & Risk"}'::jsonb),
    (v_org, v_assessment, 'reviewer@northwind','review.requested_changes','{"pillar":"Data Quality & Insight"}'::jsonb);

END $demo$;

-- Storage bucket for evidence
INSERT INTO storage.buckets (id, name, public) VALUES ('evidence','evidence', false) ON CONFLICT DO NOTHING;

CREATE POLICY "Evidence bucket org read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'evidence' AND EXISTS (
    SELECT 1 FROM public.evidence_items e WHERE e.storage_path = name AND public.has_org_access(auth.uid(), e.organisation_id)
  ));
CREATE POLICY "Evidence bucket org write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'evidence');
CREATE POLICY "Evidence bucket org delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'evidence' AND EXISTS (
    SELECT 1 FROM public.evidence_items e WHERE e.storage_path = name AND public.has_org_access(auth.uid(), e.organisation_id)
  ));
