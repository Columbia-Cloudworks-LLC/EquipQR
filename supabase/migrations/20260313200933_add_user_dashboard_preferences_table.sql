-- Creates per-user, per-organization dashboard widget preferences.
-- This supports cross-device dashboard layout persistence.

CREATE TABLE IF NOT EXISTS public.user_dashboard_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  layouts jsonb,
  active_widgets text[] NOT NULL DEFAULT '{}'::text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_dashboard_preferences_user_org_key UNIQUE (user_id, organization_id)
);

CREATE INDEX IF NOT EXISTS idx_user_dashboard_preferences_user_org
  ON public.user_dashboard_preferences (user_id, organization_id);

DROP TRIGGER IF EXISTS update_user_dashboard_preferences_updated_at ON public.user_dashboard_preferences;
CREATE TRIGGER update_user_dashboard_preferences_updated_at
  BEFORE UPDATE ON public.user_dashboard_preferences
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.user_dashboard_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS dashboard_preferences_select_own_org ON public.user_dashboard_preferences;
CREATE POLICY dashboard_preferences_select_own_org
  ON public.user_dashboard_preferences
  FOR SELECT
  TO "authenticated"
  USING (
    user_id = (SELECT auth.uid())
    AND public.is_org_member((SELECT auth.uid()), organization_id)
  );

DROP POLICY IF EXISTS dashboard_preferences_insert_own_org ON public.user_dashboard_preferences;
CREATE POLICY dashboard_preferences_insert_own_org
  ON public.user_dashboard_preferences
  FOR INSERT
  TO "authenticated"
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND public.is_org_member((SELECT auth.uid()), organization_id)
  );

DROP POLICY IF EXISTS dashboard_preferences_update_own_org ON public.user_dashboard_preferences;
CREATE POLICY dashboard_preferences_update_own_org
  ON public.user_dashboard_preferences
  FOR UPDATE
  TO "authenticated"
  USING (
    user_id = (SELECT auth.uid())
    AND public.is_org_member((SELECT auth.uid()), organization_id)
  )
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND public.is_org_member((SELECT auth.uid()), organization_id)
  );

DROP POLICY IF EXISTS dashboard_preferences_delete_own_org ON public.user_dashboard_preferences;
CREATE POLICY dashboard_preferences_delete_own_org
  ON public.user_dashboard_preferences
  FOR DELETE
  TO "authenticated"
  USING (
    user_id = (SELECT auth.uid())
    AND public.is_org_member((SELECT auth.uid()), organization_id)
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_dashboard_preferences TO authenticated;
GRANT ALL ON TABLE public.user_dashboard_preferences TO service_role;

