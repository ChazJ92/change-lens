ALTER TABLE public.organisations
  ADD COLUMN sector TEXT,
  ADD COLUMN employee_count INTEGER,
  ADD COLUMN change_population INTEGER,
  ADD COLUMN countries_operated INTEGER,
  ADD COLUMN summary TEXT,
  ADD CONSTRAINT organisations_employee_count_positive CHECK (employee_count IS NULL OR employee_count > 0),
  ADD CONSTRAINT organisations_change_population_positive CHECK (change_population IS NULL OR change_population > 0),
  ADD CONSTRAINT organisations_countries_operated_positive CHECK (countries_operated IS NULL OR countries_operated > 0);

CREATE OR REPLACE FUNCTION public.create_organisation(
  _name TEXT,
  _sector TEXT DEFAULT NULL,
  _employee_count INTEGER DEFAULT NULL,
  _change_population INTEGER DEFAULT NULL,
  _countries_operated INTEGER DEFAULT NULL,
  _summary TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF _name IS NULL OR btrim(_name) = '' THEN
    RAISE EXCEPTION 'Organisation name is required';
  END IF;

  INSERT INTO public.organisations (
    name,
    sector,
    employee_count,
    change_population,
    countries_operated,
    summary
  ) VALUES (
    btrim(_name),
    NULLIF(btrim(COALESCE(_sector, '')), ''),
    _employee_count,
    _change_population,
    _countries_operated,
    NULLIF(btrim(COALESCE(_summary, '')), '')
  )
  RETURNING id INTO v_org_id;

  INSERT INTO public.memberships (organisation_id, user_id, role)
  VALUES (v_org_id, v_user_id, 'admin')
  ON CONFLICT (organisation_id, user_id) DO UPDATE SET role = EXCLUDED.role;

  INSERT INTO public.user_roles (user_id, organisation_id, role)
  VALUES (v_user_id, v_org_id, 'org_admin')
  ON CONFLICT (user_id, organisation_id, role) DO NOTHING;

  INSERT INTO public.organisation_ai_settings (organisation_id, updated_by)
  VALUES (v_org_id, v_user_id)
  ON CONFLICT (organisation_id) DO NOTHING;

  INSERT INTO public.audit_logs (organisation_id, actor_id, event_type, detail)
  VALUES (
    v_org_id,
    v_user_id,
    'organisation_created',
    jsonb_build_object('name', btrim(_name))
  );

  RETURN v_org_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_organisation(TEXT, TEXT, INTEGER, INTEGER, INTEGER, TEXT) TO authenticated;
