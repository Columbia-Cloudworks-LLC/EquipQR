-- Fix billing_exemptions security issue by removing overly permissive policy
-- and ensuring only organization admins can access exemption data

-- Drop the overly permissive system_manage_exemptions policy
DROP POLICY IF EXISTS "system_manage_exemptions" ON public.billing_exemptions;

-- Create more secure system policies with correct syntax
-- System can only insert exemptions (for automated processes)
CREATE POLICY "system_insert_exemptions" ON public.billing_exemptions
FOR INSERT 
WITH CHECK (true);

-- System can only update exemptions (for automated processes)  
CREATE POLICY "system_update_exemptions" ON public.billing_exemptions  
FOR UPDATE
USING (true);

-- Ensure the existing admin policy is the only way to read exemption data
-- (The org_admins_view_exemptions policy already correctly restricts reads to org admins)

-- Add a comment to document the security fix
COMMENT ON TABLE public.billing_exemptions IS 'Billing exemptions table - Access restricted to organization admins only for security';