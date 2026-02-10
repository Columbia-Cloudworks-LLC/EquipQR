-- =============================================================================
-- Create storage buckets that were missing from migrations
--
-- Root cause: The image upload feature (20260210180000) and its follow-up
-- migrations only created RLS policies on storage.objects. The actual storage
-- buckets were created manually via the Supabase Dashboard on preview/staging
-- but never on production. This migration ensures all required buckets exist.
--
-- Buckets created:
--   1. organization-logos  (5 MB, public, image/*)
--   2. user-avatars        (5 MB, public, image/* — user-folder scoped via RLS)
--   3. team-images         (5 MB, public, image/*)
--   4. inventory-item-images (10 MB, public, image/*)
--
-- Uses ON CONFLICT DO NOTHING so it is safe to run on environments where
-- buckets already exist (e.g., preview/staging).
-- =============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('organization-logos',    'organization-logos',    true, 5242880,  ARRAY['image/jpeg','image/png','image/gif','image/webp']),
  ('user-avatars',          'user-avatars',          true, 5242880,  ARRAY['image/jpeg','image/png','image/gif','image/webp']),
  ('team-images',           'team-images',           true, 5242880,  ARRAY['image/jpeg','image/png','image/gif','image/webp']),
  ('inventory-item-images', 'inventory-item-images', true, 10485760, ARRAY['image/jpeg','image/png','image/gif','image/webp'])
ON CONFLICT (id) DO NOTHING;
