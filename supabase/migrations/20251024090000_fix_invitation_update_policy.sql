-- Fix organization_invitations update policy to allow inviter and org admins to manage invitations
-- Generated: 2025-10-24

BEGIN;

DROP POLICY IF EXISTS "organization_invitations_update" ON "public"."organization_invitations";

CREATE POLICY "organization_invitations_update" ON "public"."organization_invitations"
  FOR UPDATE USING (
    -- Invited user can update their own invitation (e.g., accept/decline)
    ("email" = (select "auth"."email"()))
    OR
    -- The user who created the invitation can manage it
    ("invited_by" = (select "auth"."uid"()))
    OR
    -- Org admins can manage invitations in their organization
    "public"."is_org_admin"((select "auth"."uid"()), "organization_id")
  )
  WITH CHECK (
    ("email" = (select "auth"."email"()))
    OR ("invited_by" = (select "auth"."uid"()))
    OR "public"."is_org_admin"((select "auth"."uid"()), "organization_id")
  );

COMMIT;


