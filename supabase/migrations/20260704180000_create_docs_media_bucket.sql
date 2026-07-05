-- Migration: create_docs_media_bucket
-- Public documentation screenshots and videos uploaded via service role only.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'docs-media',
  'docs-media',
  true,
  52428800,
  ARRAY[
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/gif',
    'image/avif',
    'video/mp4',
    'video/webm'
  ]::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public             = EXCLUDED.public,
  file_size_limit    = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "docs_media_select" ON storage.objects;
CREATE POLICY "docs_media_select"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'docs-media');
