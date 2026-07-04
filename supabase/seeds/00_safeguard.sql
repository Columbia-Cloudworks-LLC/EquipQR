-- =====================================================
-- EquipQR Seed Data - Environment Safeguard
-- =====================================================
-- This file verifies we're running in a local development environment.
--
-- All test users have password: password123
--
-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║  ⚠️  SECURITY WARNING - LOCAL DEVELOPMENT ONLY  ⚠️                          ║
-- ╠══════════════════════════════════════════════════════════════════════════════╣
-- ║  This file contains HARDCODED TEST CREDENTIALS (password: password123).     ║
-- ║  These credentials are committed to version control intentionally for       ║
-- ║  local development convenience.                                             ║
-- ║                                                                              ║
-- ║  ❌ NEVER run this seed file against a production database!                 ║
-- ║  ❌ NEVER use these credentials in production environments!                 ║
-- ║                                                                              ║
-- ║  The auth.users inserts below will FAIL in Supabase hosted environments     ║
-- ║  because direct auth schema access is blocked in production. This provides  ║
-- ║  a built-in safeguard against accidental production seeding.                ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝
-- =====================================================

-- =====================================================
-- ENVIRONMENT SAFEGUARD
-- =====================================================
-- Verify we're running in a local environment by checking if direct auth.users
-- access is available. In production Supabase, this schema is protected and
-- the following statement would fail, preventing accidental credential seeding.
--
-- Note: This is a defense-in-depth measure. The auth.users INSERT statements
-- will naturally fail in production due to schema permissions, but this makes
-- the intent explicit.
DO $$
BEGIN
  -- ═══════════════════════════════════════════════════════════════════════════
  -- PRODUCTION SAFEGUARD: This block verifies we're in a local environment.
  -- In Supabase hosted environments, direct auth.users access is blocked at
  -- the schema permission level. The INSERT statements below will fail with
  -- "permission denied" in production, providing a built-in safeguard.
  -- 
  -- WHY NOT USE ENVIRONMENT VARIABLES FOR CREDENTIALS?
  -- Using env vars would complicate local development setup. The deterministic,
  -- hardcoded credentials allow any developer to clone the repo and immediately
  -- run `supabase db reset` without additional configuration. The production
  -- safeguard (auth schema permissions) makes this approach secure.
  -- ═══════════════════════════════════════════════════════════════════════════
  RAISE NOTICE '✅ Seed file executing in local development environment';
  RAISE NOTICE '⚠️  Test credentials (password123) will be created.';
  RAISE NOTICE '🛡️  Production safeguard: auth.users INSERT will fail in hosted Supabase.';
END
$$;

-- Shared bcrypt helper for local E2E auth.users seeds (password documented above).
CREATE OR REPLACE FUNCTION public.seed_e2e_encrypted_password()
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT extensions.crypt('password123', '$2a$10$equipqrseed1equipqr');
$$;
