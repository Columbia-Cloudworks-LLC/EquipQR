-- Fix critical security vulnerability in subscribers table
-- The table appears to be publicly readable, we need to secure it properly

-- Ensure RLS is enabled
ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;

-- Drop the overly permissive system policy that was allowing public access
DROP POLICY IF EXISTS "system_manage_subscriptions" ON public.subscribers;

-- Create a more secure system policy that only allows service role operations
-- This policy will only apply to edge functions using the service role key
CREATE POLICY "edge_functions_manage_subscriptions" ON public.subscribers
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Ensure no anonymous access by creating explicit policies for authenticated users only
-- Users can only access their own subscription data when authenticated
CREATE POLICY "authenticated_users_own_data_only" ON public.subscribers
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "authenticated_users_update_own_data" ON public.subscribers
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Remove any existing overly permissive policies
DROP POLICY IF EXISTS "users_select_own_subscription" ON public.subscribers;
DROP POLICY IF EXISTS "users_update_own_subscription" ON public.subscribers;
DROP POLICY IF EXISTS "users_insert_own_subscription" ON public.subscribers;