-- Pre-allocated generic QR tag pool and atomic claiming ("Tag First, Fill Later", issue #1644).
--
-- Pre-printed QR tags use the standard `/qr/equipment/<tag_id>?org=<organization_id>` URL shape
-- so existing QR scanners and redirect flows require zero URL changes.
-- - When a tag is `unassigned`, scanning opens the "Claim / Adopt Equipment" screen.
-- - When a tag is `claimed`, scanning resolves `claimed_equipment_id` and opens the equipment view.

CREATE TABLE IF NOT EXISTS public.equipment_qr_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  short_code text NOT NULL,
  label_batch_name text,
  status text NOT NULL DEFAULT 'unassigned',
  claimed_equipment_id uuid REFERENCES public.equipment(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  claimed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  claimed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT equipment_qr_tags_status_check CHECK (status IN ('unassigned', 'claimed')),
  CONSTRAINT equipment_qr_tags_org_short_code_key UNIQUE (organization_id, short_code)
);

CREATE INDEX IF NOT EXISTS idx_equipment_qr_tags_org_status
  ON public.equipment_qr_tags (organization_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_equipment_qr_tags_claimed_equipment
  ON public.equipment_qr_tags (claimed_equipment_id);

CREATE INDEX IF NOT EXISTS idx_equipment_qr_tags_created_by
  ON public.equipment_qr_tags (created_by);

CREATE INDEX IF NOT EXISTS idx_equipment_qr_tags_claimed_by
  ON public.equipment_qr_tags (claimed_by);

ALTER TABLE public.equipment_qr_tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "equipment_qr_tags_select_org_member" ON public.equipment_qr_tags;
CREATE POLICY "equipment_qr_tags_select_org_member"
  ON public.equipment_qr_tags
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.organization_id = equipment_qr_tags.organization_id
        AND om.user_id = (SELECT auth.uid())
        AND om.status = 'active'
    )
  );

DROP POLICY IF EXISTS "equipment_qr_tags_insert_org_admin" ON public.equipment_qr_tags;
CREATE POLICY "equipment_qr_tags_insert_org_admin"
  ON public.equipment_qr_tags
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_org_admin((SELECT auth.uid()), organization_id)
  );

DROP POLICY IF EXISTS "equipment_qr_tags_update_org_member" ON public.equipment_qr_tags;
CREATE POLICY "equipment_qr_tags_update_org_member"
  ON public.equipment_qr_tags
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.organization_id = equipment_qr_tags.organization_id
        AND om.user_id = (SELECT auth.uid())
        AND om.status = 'active'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.organization_id = equipment_qr_tags.organization_id
        AND om.user_id = (SELECT auth.uid())
        AND om.status = 'active'
    )
  );

DROP POLICY IF EXISTS "equipment_qr_tags_delete_org_admin" ON public.equipment_qr_tags;
CREATE POLICY "equipment_qr_tags_delete_org_admin"
  ON public.equipment_qr_tags
  FOR DELETE
  TO authenticated
  USING (
    public.is_org_admin((SELECT auth.uid()), organization_id)
  );

CREATE OR REPLACE FUNCTION public.claim_equipment_qr_tag(
  p_tag_id uuid,
  p_equipment_id uuid
)
RETURNS public.equipment_qr_tags
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := (SELECT auth.uid());
  v_tag public.equipment_qr_tags;
  v_equipment_org_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to claim a QR tag'
      USING ERRCODE = '42501';
  END IF;

  SELECT *
  INTO v_tag
  FROM public.equipment_qr_tags
  WHERE id = p_tag_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'QR tag not found or access denied'
      USING ERRCODE = 'P0002';
  END IF;

  SELECT e.organization_id
  INTO v_equipment_org_id
  FROM public.equipment e
  WHERE e.id = p_equipment_id;

  IF v_equipment_org_id IS NULL OR v_equipment_org_id <> v_tag.organization_id THEN
    RAISE EXCEPTION 'Target equipment does not belong to the same organization as this QR tag'
      USING ERRCODE = '42501';
  END IF;

  IF v_tag.status = 'claimed' AND v_tag.claimed_equipment_id IS DISTINCT FROM p_equipment_id THEN
    RAISE EXCEPTION 'This QR tag has already been claimed for another piece of equipment'
      USING ERRCODE = '23505';
  END IF;

  UPDATE public.equipment_qr_tags
  SET status = 'claimed',
      claimed_equipment_id = p_equipment_id,
      claimed_by = v_user_id,
      claimed_at = COALESCE(claimed_at, now()),
      updated_at = now()
  WHERE id = p_tag_id
  RETURNING * INTO v_tag;

  RETURN v_tag;
END;
$$;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.equipment_qr_tags TO authenticated;
GRANT ALL ON TABLE public.equipment_qr_tags TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_equipment_qr_tag(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_equipment_qr_tag(uuid, uuid) TO service_role;
