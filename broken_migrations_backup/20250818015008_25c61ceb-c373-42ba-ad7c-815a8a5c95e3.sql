-- Secure billing and financial tables with comprehensive RLS policies

-- billing_events table - Add missing restrictive policies
CREATE POLICY "Prevent unauthorized billing_events updates" ON public.billing_events
FOR UPDATE
USING (false); -- No user updates allowed - system only

CREATE POLICY "Prevent unauthorized billing_events deletes" ON public.billing_events  
FOR DELETE
USING (false); -- No user deletes allowed - system only

-- billing_usage table - Add restrictive policies for financial data
CREATE POLICY "Prevent unauthorized billing_usage inserts" ON public.billing_usage
FOR INSERT  
WITH CHECK (false); -- System only inserts

CREATE POLICY "Prevent unauthorized billing_usage updates" ON public.billing_usage
FOR UPDATE
USING (false); -- System only updates

CREATE POLICY "Prevent unauthorized billing_usage deletes" ON public.billing_usage
FOR DELETE
USING (false); -- System only deletes

-- Strengthen existing billing_events INSERT policy to be more explicit
DROP POLICY IF EXISTS "System can insert billing events" ON public.billing_events;
CREATE POLICY "System only billing_events inserts" ON public.billing_events
FOR INSERT
WITH CHECK (auth.role() = 'service_role'); -- Only service role can insert

-- Add additional security for organization_slots - ensure only proper org members
DROP POLICY IF EXISTS "org_members_view_slots" ON public.organization_slots;
CREATE POLICY "Restrict slots viewing to active org members" ON public.organization_slots
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = organization_slots.organization_id
    AND om.user_id = auth.uid()
    AND om.status = 'active'
  )
);

-- Add additional security for slot_purchases - ensure only proper org members  
DROP POLICY IF EXISTS "org_members_view_purchases" ON public.slot_purchases;
CREATE POLICY "Restrict purchases viewing to active org members" ON public.slot_purchases
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = slot_purchases.organization_id
    AND om.user_id = auth.uid() 
    AND om.status = 'active'
  )
);

-- Add policy to prevent unauthorized access to user_license_subscriptions
CREATE POLICY "Restrict license subscription deletes" ON public.user_license_subscriptions
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = user_license_subscriptions.organization_id
    AND om.user_id = auth.uid()
    AND om.role IN ('owner', 'admin')
    AND om.status = 'active'
  )
);

-- Add comprehensive billing_exemptions security
CREATE POLICY "Prevent unauthorized exemption deletes" ON public.billing_exemptions
FOR DELETE  
USING (
  EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = billing_exemptions.organization_id
    AND om.user_id = auth.uid()
    AND om.role = 'owner' -- Only owners can delete exemptions
    AND om.status = 'active'
  )
);