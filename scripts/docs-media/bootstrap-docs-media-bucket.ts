#!/usr/bin/env tsx

/**
 * Idempotently create the production docs-media bucket via service role.
 * Policies remain aligned through supabase/migrations/20260704180000_create_docs_media_bucket.sql.
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function main() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error(
      JSON.stringify({
        success: false,
        error: 'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required',
      }),
    );
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: existingBuckets, error: listError } = await supabase.storage.listBuckets();
  if (listError) {
    console.error(JSON.stringify({ success: false, error: listError.message }));
    process.exit(1);
  }

  const alreadyExists = existingBuckets.some((bucket) => bucket.id === 'docs-media');
  if (alreadyExists) {
    console.log(JSON.stringify({ success: true, created: false, bucket: 'docs-media' }));
    return;
  }

  const { error: createError } = await supabase.storage.createBucket('docs-media', {
    public: true,
    fileSizeLimit: 52_428_800,
    allowedMimeTypes: [
      'image/png',
      'image/jpeg',
      'image/webp',
      'image/gif',
      'image/avif',
      'video/mp4',
      'video/webm',
    ],
  });

  if (createError) {
    const duplicate =
      createError.message.toLowerCase().includes('already exists') ||
      createError.message.toLowerCase().includes('duplicate');
    if (duplicate) {
      console.log(JSON.stringify({ success: true, created: false, bucket: 'docs-media' }));
      return;
    }

    console.error(JSON.stringify({ success: false, error: createError.message }));
    process.exit(1);
  }

  console.log(JSON.stringify({ success: true, created: true, bucket: 'docs-media' }));
}

main().catch((error) => {
  console.error(
    JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }),
  );
  process.exit(1);
});
