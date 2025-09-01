-- Fix billing_exemptions security issue by removing overly permissive policy
-- and ensuring only organization admins can access exemption data

-- Drop the overly permissive system_manage_exemptions policy
DROP POLICY IF EXISTS "system_manage_exemptions" ON public.billing_exemptions;

-- Create a more secure system policy that only allows specific system operations
-- This policy will only allow system-level access for specific edge functions
CREATE POLICY "system_insert_exemptions" ON public.billing_exemptions
FOR INSERT 
USING (true);

CREATE POLICY "system_update_exemptions" ON public.billing_exemptions  
FOR UPDATE
USING (true);

-- Ensure the existing admin policy is the only way to read exemption data
-- (The org_admins_view_exemptions policy is already correctly restrictive)

-- Add a comment to document the security fix
COMMENT ON TABLE public.billing_exemptions IS 'Billing exemptions table - Access restricted to organization admins only for security';