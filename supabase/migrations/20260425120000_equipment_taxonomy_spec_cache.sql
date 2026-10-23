-- Equipment taxonomy & spec inference fleet cache (#1510)
-- Stores organization-confirmed equipment specifications by normalized make + model
-- so subsequent units of the same make/model reuse shop-verified specs ("fleet-as-cache").

CREATE TABLE IF NOT EXISTS public.organization_equipment_spec_cache (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  manufacturer_norm text NOT NULL,
  model_norm text NOT NULL,
  manufacturer text NOT NULL,
  model text NOT NULL,
  category text,
  subtype text,
  specs jsonb DEFAULT '{}'::jsonb NOT NULL,
  source text DEFAULT 'shop'::text NOT NULL CHECK (source IN ('taxonomy', 'vpic', 'epa', 'shop')),
  confidence numeric(4,2) DEFAULT 1.00 NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  confirmed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  confirmed_at timestamp with time zone DEFAULT now() NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT organization_equipment_spec_cache_org_make_model_key UNIQUE (organization_id, manufacturer_norm, model_norm)
);

ALTER TABLE public.organization_equipment_spec_cache OWNER TO postgres;

COMMENT ON TABLE public.organization_equipment_spec_cache IS 'Org-scoped cache of accepted equipment taxonomy and specification inferences keyed by normalized manufacturer and model (#1510).';

CREATE INDEX IF NOT EXISTS idx_org_equipment_spec_cache_org_id
  ON public.organization_equipment_spec_cache USING btree (organization_id);

ALTER TABLE public.organization_equipment_spec_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY organization_equipment_spec_cache_select
  ON public.organization_equipment_spec_cache
  FOR SELECT
  USING (public.is_org_member((SELECT auth.uid() AS uid), organization_id));

CREATE POLICY organization_equipment_spec_cache_insert
  ON public.organization_equipment_spec_cache
  FOR INSERT
  WITH CHECK (
    public.is_org_member((SELECT auth.uid() AS uid), organization_id)
    AND (confirmed_by IS NULL OR confirmed_by = (SELECT auth.uid() AS uid))
  );

CREATE POLICY organization_equipment_spec_cache_update
  ON public.organization_equipment_spec_cache
  FOR UPDATE
  USING (public.is_org_member((SELECT auth.uid() AS uid), organization_id))
  WITH CHECK (public.is_org_member((SELECT auth.uid() AS uid), organization_id));

CREATE POLICY organization_equipment_spec_cache_delete
  ON public.organization_equipment_spec_cache
  FOR DELETE
  USING (public.is_org_operational_admin((SELECT auth.uid() AS uid), organization_id));

GRANT ALL ON TABLE public.organization_equipment_spec_cache TO anon;
GRANT ALL ON TABLE public.organization_equipment_spec_cache TO authenticated;
GRANT ALL ON TABLE public.organization_equipment_spec_cache TO service_role;
