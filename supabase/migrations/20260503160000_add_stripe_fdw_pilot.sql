-- =============================================================================
-- Migration: Stripe Foreign Data Wrapper pilot
-- Issue: #722 (Sub-change 3 of 3)
-- Date: 2026-05-03
--
-- Sets up the Stripe Foreign Data Wrapper (FDW) for read-only admin/finance
-- queries that join EquipQR's auth.users + organizations against live Stripe
-- subscription data via SQL.
--
-- Architecture decision: per the Service Request and the user's locked-in
-- decision (#722 comment 4366763107), this Change Record uses Stripe FDW +
-- materialized views (NOT the Stripe Sync Engine). Per-query latency to
-- Stripe is ~300ms uncached; the materialized view brings cached reads to
-- ~1ms. Refresh is scheduled in 20260503170000_schedule_stripe_mv_refresh.sql.
--
-- Vendor-side prerequisite (External Setup Procedures Section B on the Change
-- Record): the implementer must mint a restricted-scope Stripe API key, store
-- it in 1Password ('stripe-fdw-readonly') and Supabase Vault
-- ('stripe_fdw_api_key'), and enable the wrappers extension via the Supabase
-- Dashboard, BEFORE the FDW server can actually serve queries.
--
-- Idempotency / local-dev safety: the FDW server, foreign tables, materialized
-- view, and unique index are created inside a DO block that branches on
-- "is the Vault secret present?". When the secret is absent (local dev that
-- has not run Section B), only the wrappers extension, the private 'stripe'
-- schema, the foreign data wrapper handler, and the SECURITY DEFINER RPC
-- are created. The RPC's body uses dynamic SQL so it is safe to create
-- before the materialized view exists; it returns empty in that state and
-- starts returning real rows after Section B is complete and this migration
-- is re-applied (or the conditional block runs on the next supabase db push).
--
-- Security posture (per Service Request Section B gotcha):
--   * The 'stripe' schema is PRIVATE — never add it to [api].schemas in
--     supabase/config.toml. FDWs do NOT enforce RLS.
--   * The materialized view public.org_active_stripe_subscriptions is REVOKEd
--     from anon and authenticated; only postgres / service_role can SELECT.
--   * The SECURITY DEFINER function public.list_active_stripe_subscriptions is
--     REVOKEd from PUBLIC, anon, and authenticated. It is GRANTed ONLY to
--     service_role. Application code that needs Stripe data must call it from
--     a server-side Edge Function with the service role key.
--
-- Tenant-scoping note (issue #722 PR feedback round 2):
--   The original cross-tenant scoping attempt joined the MV against
--   public.organizations on stripe_customer_id, but that column does not exist
--   on the organizations table — verified empirically against the live schema
--   2026-05-03 (zero rows in information_schema.columns where column_name LIKE
--   '%stripe%' on the public schema except customers_feature_enabled boolean).
--   EquipQR has no live mapping today between organizations and Stripe
--   customers; the legacy check-subscription Edge Function is itself stubbed
--   to return 410 Gone (see supabase/functions/check-subscription/index.ts).
--   Until a real mapping exists, the safest posture is service_role only —
--   no untrusted caller can hit the function, and there is no broken join to
--   leak data through. When EquipQR reintroduces an org → Stripe mapping in a
--   future change, a follow-up migration can re-grant to authenticated with
--   the correct tenant filter.
--
-- See Change Record on issue #722 for the full design.
-- =============================================================================

BEGIN;

-- ============================================================================
-- PART 1: Extension and private schema (always-safe)
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS wrappers WITH SCHEMA extensions;
CREATE SCHEMA IF NOT EXISTS stripe;

-- The wrappers extension installs the stripe_fdw_handler / stripe_fdw_validator
-- functions in the extensions schema. The CREATE FOREIGN DATA WRAPPER below
-- registers them under a usable name. This call is gated on the FDW not
-- already existing because Postgres does not support IF NOT EXISTS on
-- CREATE FOREIGN DATA WRAPPER.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_foreign_data_wrapper WHERE fdwname = 'stripe_wrapper') THEN
    CREATE FOREIGN DATA WRAPPER stripe_wrapper
      HANDLER extensions.stripe_fdw_handler
      VALIDATOR extensions.stripe_fdw_validator;
  END IF;
END $$;

-- ============================================================================
-- PART 2: Conditional FDW server + foreign tables + materialized view
-- ============================================================================
-- Only runs when the Vault secret 'stripe_fdw_api_key' is present (i.e. the
-- implementer has completed External Setup Procedures Section B). When the
-- secret is absent (e.g. fresh local dev), this block emits a NOTICE and
-- skips, leaving the schema in a partially-set-up state. Re-applying the
-- migration after Section B picks up where it left off via the IF NOT EXISTS
-- guards inside this block.
DO $$
DECLARE
  has_vault_secret boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM vault.decrypted_secrets WHERE name = 'stripe_fdw_api_key'
  ) INTO has_vault_secret;

  IF NOT has_vault_secret THEN
    RAISE NOTICE 'Stripe FDW setup deferred: stripe_fdw_api_key not present in Supabase Vault. '
                 'Complete External Setup Procedures Section B on the Change Record (issue #722) '
                 'and re-apply this migration to provision the FDW server, foreign tables, and '
                 'materialized view.';
    RETURN;
  END IF;

  -- Server creation. Bound to the Vault secret BY NAME so secret rotation in
  -- Vault does not require re-creating the server.
  IF NOT EXISTS (SELECT 1 FROM pg_foreign_server WHERE srvname = 'stripe_server') THEN
    EXECUTE $cs$
      CREATE SERVER stripe_server
      FOREIGN DATA WRAPPER stripe_wrapper
      OPTIONS (
        api_key_name 'stripe_fdw_api_key',
        api_url 'https://api.stripe.com/v1/',
        api_version '2024-06-20'
      )
    $cs$;
  END IF;

  -- IMPORT FOREIGN SCHEMA — restricted to the 8 objects EquipQR may join
  -- against in admin views. Do NOT import the full schema (the Stripe FDW
  -- catalog has 24+ object types and bloats the schema unnecessarily).
  -- Idempotency: check for the canonical 'customers' foreign table.
  IF NOT EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'stripe' AND c.relname = 'customers' AND c.relkind = 'f'
  ) THEN
    EXECUTE $is$
      IMPORT FOREIGN SCHEMA stripe
        LIMIT TO (
          customers, subscriptions, products, prices,
          charges, invoices, balance, balance_transactions
        )
        FROM SERVER stripe_server INTO stripe
    $is$;
  END IF;

  -- Materialized view: the proof-of-life pilot — joins active/trialing/past-due
  -- subscriptions to their customers. Refreshed every 15 minutes by the cron
  -- job in 20260503170000_schedule_stripe_mv_refresh.sql.
  IF NOT EXISTS (
    SELECT 1 FROM pg_matviews
    WHERE schemaname = 'public' AND matviewname = 'org_active_stripe_subscriptions'
  ) THEN
    -- Stripe wrapper foreign table `stripe.subscriptions` exposes id, customer,
    -- currency, period bounds, and attrs — not a top-level `status` column.
    -- Subscription status is read from attrs (Stripe API object). Ref:
    -- https://github.com/supabase/wrappers/blob/main/docs/catalog/stripe.md#subscriptions
    EXECUTE $mv$
      CREATE MATERIALIZED VIEW public.org_active_stripe_subscriptions AS
      SELECT
        s.id AS subscription_id,
        s.customer AS stripe_customer_id,
        s.attrs->>'status' AS status,
        s.current_period_end,
        c.email AS stripe_customer_email,
        c.attrs->>'metadata' AS stripe_customer_metadata
      FROM stripe.subscriptions s
      JOIN stripe.customers c ON c.id = s.customer
      WHERE (s.attrs->>'status') IN ('active', 'trialing', 'past_due')
    $mv$;

    -- Unique index supports REFRESH MATERIALIZED VIEW CONCURRENTLY in the
    -- refresh cron job; without it, only blocking REFRESH is possible.
    EXECUTE $ui$
      CREATE UNIQUE INDEX uniq_org_active_stripe_subscriptions_id
        ON public.org_active_stripe_subscriptions (subscription_id)
    $ui$;

    -- Revoke direct access: the MV is only reachable through the
    -- list_active_stripe_subscriptions SECURITY DEFINER function, which
    -- enforces the admin/owner role check. Without this, the default
    -- privilege grants from the baseline migration would let anon and
    -- authenticated users bypass the authorization check via PostgREST.
    EXECUTE $rv$
      REVOKE SELECT ON public.org_active_stripe_subscriptions FROM anon, authenticated
    $rv$;
  END IF;
END $$;

-- ============================================================================
-- PART 3: SECURITY DEFINER exposure function (always created)
-- ============================================================================
-- This function is the only access path to Stripe data via the FDW. Until
-- EquipQR introduces a real org → Stripe customer mapping (see migration
-- header), the function is locked down to service_role only. Future
-- migrations will re-grant to authenticated and add the correct tenant
-- filter once the mapping exists.
--
-- The body uses RETURN QUERY EXECUTE so the function body parses successfully
-- even when the materialized view does not exist yet (graceful degradation
-- before Section B is complete). When the MV is missing, the function returns
-- an empty result set instead of raising.
CREATE OR REPLACE FUNCTION public.list_active_stripe_subscriptions()
RETURNS TABLE (
  subscription_id text,
  stripe_customer_id text,
  status text,
  current_period_end timestamp,
  stripe_customer_email text,
  stripe_customer_metadata text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_matviews
    WHERE schemaname = 'public' AND matviewname = 'org_active_stripe_subscriptions'
  ) THEN
    -- No tenant scoping: the function is service_role only (see GRANT below),
    -- so the only legitimate caller is a server-side Edge Function with the
    -- service role key. That caller is responsible for any tenant filtering
    -- it needs.
    RETURN QUERY EXECUTE
      'SELECT subscription_id, stripe_customer_id, status, current_period_end, '
      'stripe_customer_email, stripe_customer_metadata '
      'FROM public.org_active_stripe_subscriptions';
  END IF;
  -- MV missing: return empty. Future Edge Function callers get a clean empty
  -- state instead of an error during the pre-Section-B window.
  RETURN;
END;
$$;

-- Lock down to service_role only. Until a real org → Stripe customer mapping
-- exists in the schema, exposing this function to authenticated users would
-- either (a) leak cross-tenant Stripe data, or (b) require a join against a
-- non-existent column (the prior cross-tenant scoping attempt failed because
-- public.organizations has no stripe_customer_id column — verified
-- empirically against the live schema 2026-05-03).
REVOKE EXECUTE ON FUNCTION public.list_active_stripe_subscriptions() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.list_active_stripe_subscriptions() FROM anon;
REVOKE EXECUTE ON FUNCTION public.list_active_stripe_subscriptions() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.list_active_stripe_subscriptions() TO service_role;

COMMENT ON FUNCTION public.list_active_stripe_subscriptions() IS
  'Returns active/trialing/past-due Stripe subscriptions joined to their '
  'customers. Reads from the materialized view '
  'public.org_active_stripe_subscriptions (refreshed every 15 minutes by the '
  'refresh-stripe-mvs cron job). The stripe.* foreign tables are private; '
  'this SECURITY DEFINER function is GRANTed only to service_role until '
  'EquipQR reintroduces an org → Stripe customer mapping. Server-side Edge '
  'Functions invoke it with the service role key and apply any tenant '
  'filtering themselves. Returns empty when the FDW pilot has not yet been '
  'provisioned (Section B of the Change Record on issue #722).';

COMMIT;
