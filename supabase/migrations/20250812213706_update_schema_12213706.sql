-- Fix the view security issue by removing the problematic SECURITY DEFINER view
-- Instead, we'll modify the application queries to handle email privacy directly

-- Remove the view that caused security warnings
DROP VIEW IF EXISTS public.member_profiles_view;

-- Add a secure function to get profiles with privacy respected
CREATE OR REPLACE FUNCTION public.get_organization_member_profile(member_user_id uuid)
RETURNS TABLE(
  id uuid,
  name text,
  email text,
  email_private boolean,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.id,
    p.name,
    CASE 
      WHEN p.email_private = true AND p.id != auth.uid() THEN 
        CASE 
          WHEN EXISTS (
            SELECT 1 FROM organization_members om
            WHERE om.user_id = auth.uid() 
              AND om.role IN ('owner', 'admin')
              AND om.organization_id IN (
                SELECT om2.organization_id FROM organization_members om2 
                WHERE om2.user_id = p.id AND om2.status = 'active'
              )
              AND om.status = 'active'
          ) THEN p.email  -- Admins can still see private emails
          ELSE NULL       -- Regular members cannot see private emails
        END
      ELSE p.email      -- Public emails or own email always visible
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
$$;

-- Add comment for the new security feature
COMMENT ON FUNCTION public.get_organization_member_profile IS 'Securely retrieves member profile respecting email privacy settings';
COMMENT ON COLUMN public.profiles.email_private IS 'When true, email is hidden from organization members (except admins). Default: false (email visible to org members)';