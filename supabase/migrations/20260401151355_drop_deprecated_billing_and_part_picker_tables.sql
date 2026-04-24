BEGIN;

ALTER TABLE IF EXISTS public.organization_invitations
  DROP CONSTRAINT IF EXISTS organization_invitations_slot_purchase_id_fkey;

ALTER TABLE IF EXISTS public.organization_members
  DROP CONSTRAINT IF EXISTS organization_members_slot_purchase_id_fkey;

DROP TABLE IF EXISTS public.billing_events CASCADE;
DROP TABLE IF EXISTS public.billing_usage CASCADE;
DROP TABLE IF EXISTS public.billing_exemptions CASCADE;
DROP TABLE IF EXISTS public.organization_subscriptions CASCADE;
DROP TABLE IF EXISTS public.organization_slots CASCADE;
DROP TABLE IF EXISTS public.slot_purchases CASCADE;
DROP TABLE IF EXISTS public.subscribers CASCADE;
DROP TABLE IF EXISTS public.user_license_subscriptions CASCADE;
DROP TABLE IF EXISTS public.stripe_event_logs CASCADE;

DROP POLICY IF EXISTS distributor_listing_read_auth ON public.distributor_listing;
DROP POLICY IF EXISTS distributor_read_auth ON public.distributor;
DROP POLICY IF EXISTS part_identifier_read_auth ON public.part_identifier;
DROP POLICY IF EXISTS part_read_auth ON public.part;

DROP TABLE IF EXISTS public.distributor_listing CASCADE;
DROP TABLE IF EXISTS public.distributor CASCADE;
DROP TABLE IF EXISTS public.part_identifier CASCADE;
DROP TABLE IF EXISTS public.part CASCADE;

DROP FUNCTION IF EXISTS public.sync_stripe_subscription_slots CASCADE;
DROP FUNCTION IF EXISTS public.billing_is_disabled CASCADE;

COMMIT;
