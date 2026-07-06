-- Issue #1132: Dedicated team views.
-- Teams represent different business shapes — an internal expert group, an
-- entire department, or an external customer whose equipment the org
-- services. The fundamental team data is unchanged; `preferred_view` stores
-- the team-level default view that TeamDetails opens with so everyone in the
-- organization sees the team framed the same way. Team managers set it from
-- the view switcher; RLS reuses the existing teams UPDATE policy.

ALTER TABLE "public"."teams"
  ADD COLUMN IF NOT EXISTS "preferred_view" "text" NOT NULL DEFAULT 'internal';

ALTER TABLE "public"."teams"
  DROP CONSTRAINT IF EXISTS "teams_preferred_view_check";

ALTER TABLE "public"."teams"
  ADD CONSTRAINT "teams_preferred_view_check"
  CHECK ("preferred_view" IN ('internal', 'department', 'customer'));

COMMENT ON COLUMN "public"."teams"."preferred_view" IS 'Team-level default view for the team details page: internal (expert group), department, or customer (external serviced account). Issue #1132.';
