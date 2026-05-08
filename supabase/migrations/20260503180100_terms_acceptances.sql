-- Evidence table for signup Terms + Privacy clickwrap acceptances (H3).

CREATE TABLE IF NOT EXISTS public.terms_acceptances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  accepted_at timestamptz NOT NULL,
  ip_address text NOT NULL,
  user_agent text NOT NULL,
  terms_version_hash text NOT NULL,
  privacy_version_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS terms_acceptances_user_accepted_idx
  ON public.terms_acceptances (user_id, accepted_at DESC);

CREATE INDEX IF NOT EXISTS terms_acceptances_versions_idx
  ON public.terms_acceptances (terms_version_hash, privacy_version_hash);

ALTER TABLE public.terms_acceptances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "terms_acceptances_select_own" ON public.terms_acceptances;
CREATE POLICY "terms_acceptances_select_own"
  ON public.terms_acceptances
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

COMMENT ON TABLE public.terms_acceptances IS
  'Signup/legal evidence: IP, User-Agent, policy version hashes. Inserts only via record-terms-acceptance Edge Function (service role).';
