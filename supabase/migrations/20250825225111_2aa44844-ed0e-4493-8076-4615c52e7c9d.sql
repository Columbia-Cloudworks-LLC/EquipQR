
-- 1) Geocoded locations cache table (idempotent)
CREATE TABLE IF NOT EXISTS public.geocoded_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  input_text text NOT NULL,
  normalized_text text NOT NULL,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  formatted_address text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Unique across org + normalized input to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS geocoded_locations_org_norm_unique
  ON public.geocoded_locations (organization_id, normalized_text);

-- Keep updated_at fresh on updates
CREATE OR REPLACE FUNCTION public.set_geocoded_locations_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_geocoded_locations_updated_at ON public.geocoded_locations;
CREATE TRIGGER trg_set_geocoded_locations_updated_at
BEFORE UPDATE ON public.geocoded_locations
FOR EACH ROW
EXECUTE FUNCTION public.set_geocoded_locations_updated_at();

-- Enable RLS
ALTER TABLE public.geocoded_locations ENABLE ROW LEVEL SECURITY;

-- Allow org members to read cache rows for their org
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'geocoded_locations' AND policyname = 'geocoded_locations_select_org_members'
  ) THEN
    CREATE POLICY geocoded_locations_select_org_members
      ON public.geocoded_locations
      FOR SELECT
      USING (check_org_access_secure(auth.uid(), organization_id));
  END IF;
END$$;

-- Restrict writes to service role only (edge function with service key)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'geocoded_locations' AND policyname = 'geocoded_locations_service_insert'
  ) THEN
    CREATE POLICY geocoded_locations_service_insert
      ON public.geocoded_locations
      FOR INSERT
      WITH CHECK (auth.role() = 'service_role');
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'geocoded_locations' AND policyname = 'geocoded_locations_service_update'
  ) THEN
    CREATE POLICY geocoded_locations_service_update
      ON public.geocoded_locations
      FOR UPDATE
      USING (auth.role() = 'service_role');
  END IF;
END$$;

-- 2) Ensure unique org+feature_type for organization_subscriptions (idempotent)
CREATE UNIQUE INDEX IF NOT EXISTS organization_subscriptions_org_feature_unique
  ON public.organization_subscriptions (organization_id, feature_type);
