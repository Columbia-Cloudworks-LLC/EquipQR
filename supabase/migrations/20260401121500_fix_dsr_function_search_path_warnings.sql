-- Migration: Fix function_search_path_mutable warnings
-- Purpose: Address Supabase database linter security warnings for two functions
--   that were created without SET search_path = ''
--
-- Functions fixed:
--   1. anonymize_audit_changes(jsonb, text) — from 20260329000003
--   2. prevent_dsr_event_mutation()          — from 20260329000004

CREATE OR REPLACE FUNCTION public.anonymize_audit_changes(
  p_changes jsonb,
  p_email text
)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $$
BEGIN
  RETURN regexp_replace(
    p_changes::text,
    regexp_replace(p_email, '([.\+\*\?\[\]\(\)\{\}\|\\^$])', '\\\1', 'g'),
    '[redacted]',
    'gi'
  )::jsonb;
END;
$$;

CREATE OR REPLACE FUNCTION public.prevent_dsr_event_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  RAISE EXCEPTION 'DSR event records are immutable and cannot be updated or deleted';
END;
$$;
