-- Migration: drop_temp_landing_page_videos_insert
-- Applied to production on 2026-05-23 after seeding demo-video assets.
-- Removes the temporary service-role INSERT policy used during the one-time upload.

DROP POLICY IF EXISTS "temp_landing_page_videos_insert" ON storage.objects;
