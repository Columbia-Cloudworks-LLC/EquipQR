-- =============================================================================
-- Tighten SELECT policies on public storage buckets to prevent unscoped listing.
-- Clears the Supabase advisor `public_bucket_allows_listing` (0025) finding for
-- organization-logos and landing-page-images.
--
-- Background: The previous broad SELECT policies allowed any authenticated user
-- (and anonymous users for landing-page-images) to list all objects in these
-- public buckets via the Storage API.  Direct object GET requests via the public
-- CDN URL (/storage/v1/object/public/…) bypass RLS entirely, so these policy
-- changes do NOT affect image rendering on invite pages, marketing pages, or
-- anywhere else in the application that constructs URLs directly.
--
-- The four originally-flagged buckets are now handled as follows:
--   equipment-note-images  → private (20260503180000)         ✓
--   team-images            → private (20260503180000)         ✓
--   work-order-images      → private (20260503180000)         ✓
--   organization-logos     → public, listing restricted here  ← this migration
--
-- landing-page-images is not in the original four flagged buckets but shares
-- the same broad-listing exposure pattern and is addressed here too.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1) organization-logos  (path convention: {orgId}/logo.{ext})
--
-- Old policy: any authenticated user could list all logos across all orgs.
-- New policy: org members only; orgId is encoded in path segment [1].
--
-- The UUID regex guard prevents Postgres cast exceptions when the path segment
-- is malformed (matching the pattern established in 20260506120000 and
-- 20260506123000 for private buckets).
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "org_logos_select" ON storage.objects;
CREATE POLICY "org_logos_select"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'organization-logos'
    AND (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    AND public.is_org_member(
      (SELECT auth.uid()),
      ((storage.foldername(name))[1])::uuid
    )
  );


-- -----------------------------------------------------------------------------
-- 2) landing-page-images  (marketing images, public bucket)
--
-- Old policy: TO anon, authenticated — anonymous users could enumerate all
-- marketing images via the Storage API.
-- New policy: TO authenticated only — anonymous visitors still reach images
-- via the public CDN URL; this change only prevents unauthenticated listing
-- through the Storage API.
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "landing_page_images_select" ON storage.objects;
CREATE POLICY "landing_page_images_select"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'landing-page-images');


-- =============================================================================
-- Revert instructions (run in order to restore previous behaviour):
--
--   DROP POLICY IF EXISTS "org_logos_select" ON storage.objects;
--   CREATE POLICY "org_logos_select"
--     ON storage.objects FOR SELECT
--     TO authenticated
--     USING (bucket_id = 'organization-logos');
--
--   DROP POLICY IF EXISTS "landing_page_images_select" ON storage.objects;
--   CREATE POLICY "landing_page_images_select"
--     ON storage.objects FOR SELECT
--     TO anon, authenticated
--     USING (bucket_id = 'landing-page-images');
-- =============================================================================
