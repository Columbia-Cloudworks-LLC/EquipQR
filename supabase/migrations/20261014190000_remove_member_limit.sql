-- Remove the legacy per-organization member limit (issue #1648 review).
--
-- organizations.max_members was an old billing limit enforced only by the
-- trigger_validate_member_limit trigger. Billing no longer limits seats, and
-- the trigger could abort Done-For-You claims (and any role change in a full
-- organization). The column stays for now as informational data; nothing
-- enforces it.

DROP TRIGGER IF EXISTS trigger_validate_member_limit ON public.organization_members;
DROP FUNCTION IF EXISTS public.validate_member_limit();

COMMENT ON COLUMN public.organizations.max_members IS
  'Legacy, not enforced. Organizations have no member limit.';
