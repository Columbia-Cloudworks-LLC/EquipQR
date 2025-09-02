-- Step 1: Make email nullable in profiles table
ALTER TABLE public.profiles ALTER COLUMN email DROP NOT NULL;

-- Step 2: Clear existing email data (except for current user's own email)
-- We keep only the email for auth.uid() user to maintain their own profile access
UPDATE public.profiles 
SET email = NULL 
WHERE id != auth.uid();

-- Step 3: Update the RLS policy to handle nullable emails properly
-- Replace the existing policy for profile access to handle nullable emails
DROP POLICY IF EXISTS "org_members_view_member_profiles" ON public.profiles;

-- Create new policy that doesn't depend on email for other users
CREATE POLICY "org_members_view_member_profiles" 
ON public.profiles 
FOR SELECT 
USING (
  id IN (
    SELECT om.user_id
    FROM organization_members om
    WHERE om.organization_id IN (
      SELECT om2.organization_id
      FROM organization_members om2
      WHERE om2.user_id = auth.uid() 
        AND om2.status = 'active'
    ) 
    AND om.status = 'active'
  )
);

-- Step 4: Update the get_organization_member_profile function to not return emails for other users
CREATE OR REPLACE FUNCTION public.get_organization_member_profile(member_user_id uuid)
RETURNS TABLE(id uuid, name text, email text, email_private boolean, created_at timestamp with time zone, updated_at timestamp with time zone)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT 
    p.id,
    p.name,
    CASE 
      WHEN p.id = auth.uid() THEN p.email  -- User can see their own email
      ELSE NULL  -- Other users' emails are not returned
    END as email,
    p.email_private,
    p.created_at,
    p.updated_at
  FROM profiles p
  WHERE p.id = member_user_id
    AND (
      p.id = auth.uid() OR p.id IN (
        SELECT om.user_id 
        FROM organization_members om
        WHERE om.organization_id IN (
          SELECT om2.organization_id 
          FROM organization_members om2 
          WHERE om2.user_id = auth.uid() 
            AND om2.status = 'active'
        )
        AND om.status = 'active'
      )
    );
$function$;