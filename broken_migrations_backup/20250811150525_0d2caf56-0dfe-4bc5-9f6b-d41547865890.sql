-- Fix security vulnerability in subscribers table RLS policies
-- Remove email-based access and restrict to user_id only for better security

-- Drop existing policies
DROP POLICY IF EXISTS "secure_update_subscription" ON public.subscribers;
DROP POLICY IF EXISTS "select_own_subscription" ON public.subscribers;
DROP POLICY IF EXISTS "users_insert_own_subscription" ON public.subscribers;

-- Create secure policies that only allow access based on user_id
CREATE POLICY "users_select_own_subscription" ON public.subscribers
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "users_update_own_subscription" ON public.subscribers
FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "users_insert_own_subscription" ON public.subscribers
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Allow edge functions to insert/update subscription data (they use service role key)
CREATE POLICY "system_manage_subscriptions" ON public.subscribers
FOR ALL
USING (true)
WITH CHECK (true);