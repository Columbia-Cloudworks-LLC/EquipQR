#!/usr/bin/env tsx

/**
 * Upload Screenshot to Supabase Storage
 * 
 * Uploads a screenshot file to the Supabase Storage bucket for use in documentation.
 * 
 * Usage:
 *   npx tsx scripts/upload-screenshot.ts <file-path> <storage-path> [bucket-name]
 * 
 * Examples:
 *   npx tsx scripts/upload-screenshot.ts tmp/screenshot.png features/qr-code-integration/hero.png
 *   npx tsx scripts/upload-screenshot.ts tmp/step-1.png tutorials/image-upload/step-1.png landing-page-images
 * 
 * Environment Variables Required:
 *   - SUPABASE_URL or VITE_SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DEFAULT_BUCKET = 'landing-page-images';

// Parse command line arguments
const args = process.argv.slice(2);

if (args.length < 2) {
  console.error('❌ Missing required arguments');
  console.error('');
  console.error('Usage:');
  console.error('  npx tsx scripts/upload-screenshot.ts <file-path> <storage-path> [bucket-name]');
  console.error('');
  console.error('Examples:');
  console.error('  npx tsx scripts/upload-screenshot.ts tmp/screenshot.png features/qr-code-integration/hero.png');
  console.error('  npx tsx scripts/upload-screenshot.ts tmp/step-1.png tutorials/image-upload/step-1.png landing-page-images');
  console.error('');
  console.error('Arguments:');
  console.error('  file-path     Local file path to upload');
  console.error('  storage-path Path in Supabase Storage (e.g., features/qr-code/hero.png)');
  console.error('  bucket-name  Storage bucket name (default: landing-page-images)');
  process.exit(1);
}

const [filePath, storagePath, bucketName = DEFAULT_BUCKET] = args;

// When JSON output mode is enabled, suppress human-readable logs for early errors too
const isJsonModeEarly = process.env.OUTPUT_JSON === 'true';

// Validate environment variables
if (!SUPABASE_URL) {
  if (isJsonModeEarly) {
    console.log(JSON.stringify({ success: false, error: 'SUPABASE_URL or VITE_SUPABASE_URL environment variable is required' }));
  } else {
    console.error('❌ SUPABASE_URL or VITE_SUPABASE_URL environment variable is required');
    console.error('   Set it via: export SUPABASE_URL=https://<project-ref>.supabase.co');
    console.error('   Or for custom domains: export SUPABASE_URL=https://supabase.yourdomain.com');
  }
  process.exit(1);
}

if (!SUPABASE_URL.startsWith('https://')) {
  if (isJsonModeEarly) {
    console.log(JSON.stringify({ success: false, error: 'Invalid Supabase URL format. Must start with https://' }));
  } else {
    console.error('❌ Invalid Supabase URL format. Must start with https://');
    console.error(`   Received: ${SUPABASE_URL}`);
    console.error('   Examples:');
    console.error('     - https://<project-ref>.supabase.co');
    console.error('     - https://supabase.yourdomain.com');
  }
  process.exit(1);
}

// Validate URL is parseable
try {
  new URL(SUPABASE_URL);
} catch {
  if (isJsonModeEarly) {
    console.log(JSON.stringify({ success: false, error: 'Invalid Supabase URL. Not a valid URL format.' }));
  } else {
    console.error('❌ Invalid Supabase URL. Not a valid URL format.');
    console.error(`   Received: ${SUPABASE_URL}`);
  }
  process.exit(1);
}

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  console.error('   Set it via: export SUPABASE_SERVICE_ROLE_KEY=your_key');
  console.error('   Get it from: Supabase Dashboard → Settings → API → service_role secret');
  process.exit(1);
}

// Validate file exists
if (!fs.existsSync(filePath)) {
  console.error(`❌ File not found: ${filePath}`);
  process.exit(1);
}

// Validate file is an image
const ext = path.extname(filePath).toLowerCase();
const validExtensions = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.avif'];
if (!validExtensions.includes(ext)) {
  console.error(`❌ Invalid file type: ${ext}`);
  console.error(`   Supported formats: ${validExtensions.join(', ')}`);
  process.exit(1);
}

// Get file stats
const stats = fs.statSync(filePath);
const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);

// Use the already-defined JSON mode flag for runtime logs
const isJsonMode = isJsonModeEarly;
const log = (...args: unknown[]) => {
  if (!isJsonMode) console.log(...args);
};

log(`📤 Uploading screenshot...`);
log(`   File: ${filePath} (${fileSizeMB} MB)`);
log(`   Storage path: ${storagePath}`);
log(`   Bucket: ${bucketName}`);

// Create Supabase client with service role key
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

async function uploadScreenshot() {
  try {
    // Read file
    const fileBuffer = fs.readFileSync(filePath);
    const mimeType = getMimeType(ext);

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(storagePath, fileBuffer, {
        contentType: mimeType,
        upsert: true, // Overwrite if exists
      });

    if (uploadError) {
      if (isJsonMode) {
        console.log(JSON.stringify({
          success: false,
          error: uploadError.message,
          storagePath,
          bucket: bucketName,
        }));
      } else {
        console.error('❌ Upload failed:', uploadError.message);
        if (uploadError.message.includes('Bucket not found')) {
          console.error(`   Make sure the bucket "${bucketName}" exists in Supabase Storage`);
          console.error('   Create it via: Supabase Dashboard → Storage → New bucket');
        }
      }
      process.exit(1);
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucketName)
      .getPublicUrl(storagePath);

    // Output based on mode
    if (isJsonMode) {
      // JSON-only output for programmatic use
      console.log(JSON.stringify({
        success: true,
        publicUrl,
        storagePath,
        bucket: bucketName,
        fileSize: stats.size,
      }));
    } else {
      // Human-readable output
      console.log('');
      console.log('✅ Upload successful!');
      console.log('');
      console.log('📎 Public URL:');
      console.log(`   ${publicUrl}`);
      console.log('');
      console.log('📝 Markdown reference:');
      console.log(`   ![Screenshot](${publicUrl})`);
      console.log('');
    }
  } catch (error) {
    if (isJsonMode) {
      console.log(JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
        storagePath,
        bucket: bucketName,
      }));
    } else {
      console.error('❌ Unexpected error:', error);
    }
    process.exit(1);
  }
}

function getMimeType(ext: string): string {
  const mimeTypes: Record<string, string> = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
    '.avif': 'image/avif',
  };
  return mimeTypes[ext] || 'image/png';
}

// Run upload
uploadScreenshot().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
