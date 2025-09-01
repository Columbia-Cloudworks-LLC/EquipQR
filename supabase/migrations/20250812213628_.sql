-- Add privacy control for email addresses in profiles
-- This allows users to hide their email from organization members while keeping it visible to admins

-- Add email_private column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN email_private boolean DEFAULT false;

-- Update the organization members view policy to respect email privacy
-- Create a view that conditionally shows email based on privacy settings
CREATE OR REPLACE VIEW public.member_profiles_view AS
SELECT 
  p.id,
  p.name,
  CASE 
    WHEN p.email_private = true AND p.id != auth.uid() THEN 
      CASE 
        WHEN EXISTS (
          SELECT 1 FROM public.organization_members om
          WHERE om.user_id = auth.uid() 
            AND om.role IN ('owner', 'admin')
            AND om.organization_id IN (
              SELECT om2.organization_id FROM public.organization_members om2 
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
FROM public.profiles p
WHERE 
  -- Same RLS logic as the profiles table
  p.id = auth.uid() OR p.id IN (
    SELECT om.user_id 
    FROM public.organization_members om
    WHERE om.organization_id IN (
      SELECT om2.organization_id 
      FROM public.organization_members om2 
      WHERE om2.user_id = auth.uid() 
        AND om2.status = 'active'
    )
    AND om.status = 'active'
  );

-- Enable RLS on the view (inherited from base table)
-- Add helpful comment
COMMENT ON VIEW public.member_profiles_view IS 'Profiles view with email privacy controls - respects user email_private preference while allowing admin override';
COMMENT ON COLUMN public.profiles.email_private IS 'When true, email is hidden from organization members (except admins and owner)';