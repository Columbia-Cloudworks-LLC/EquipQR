-- Migration: create_landing_page_videos_bucket
-- Applied to production on 2026-05-23 via Supabase MCP during demo-video asset upload.
-- Idempotent replay for preview/local environments that have not yet recorded this version.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'landing-page-videos',
  'landing-page-videos',
  true,
  10485760,
  ARRAY['video/mp4', 'video/webm', 'image/jpeg']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public             = EXCLUDED.public,
  file_size_limit    = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "landing_page_videos_select" ON storage.objects;
CREATE POLICY "landing_page_videos_select"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'landing-page-videos');
