# Upload Screenshot Script

Uploads screenshots to Supabase Storage for use in documentation.

## Prerequisites

1. **Environment Variables** (set in your shell or `.env`):
   ```bash
   # Standard Supabase domain
   export SUPABASE_URL=https://your-project-ref.supabase.co
   # Or custom Supabase domain
   export SUPABASE_URL=https://supabase.yourdomain.com
   
   export SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

   Or use `VITE_SUPABASE_URL` instead of `SUPABASE_URL`.

   ⚠️ **Security Warning**: `SUPABASE_SERVICE_ROLE_KEY` is a highly privileged secret that bypasses Row Level Security (RLS) and has full database access. **Never**:
   - Commit it to version control
   - Share it publicly or in client-side code
   - Use it in production client applications
   
   For local development, use a dedicated environment file (e.g., `.env.local`) that is excluded from git, or use a secret manager. This key should only be used in server-side scripts or secure backend environments.

2. **Supabase Storage Bucket**:
   - Ensure the `landing-page-images` bucket exists
   - Create it via: Supabase Dashboard → Storage → New bucket
   - Set it to **public**

## Usage

```bash
# Using tsx (recommended)
npx tsx scripts/upload-screenshot.ts <file-path> <storage-path> [bucket-name]

# Examples
npx tsx scripts/upload-screenshot.ts tmp/screenshot.png features/qr-code-integration/hero.png
npx tsx scripts/upload-screenshot.ts tmp/step-1.png tutorials/image-upload/step-1.png landing-page-images
```

## Arguments

- **file-path**: Local file path to the screenshot (PNG, JPG, WEBP, etc.)
- **storage-path**: Path in Supabase Storage (e.g., `features/qr-code/hero.png`)
- **bucket-name**: Storage bucket name (default: `landing-page-images`)

## Output

The script outputs:
- ✅ Success message
- 📎 Public URL to the uploaded image
- 📝 Markdown reference for use in documentation

### JSON Output Mode

For programmatic use, enable JSON-only output by setting the `OUTPUT_JSON=true` environment variable:

```bash
OUTPUT_JSON=true npx tsx scripts/upload-screenshot.ts tmp/screenshot.png features/qr-code/hero.png
```

When JSON mode is enabled, the script outputs a single JSON object with the following fields:

- `success`: `boolean` - Whether the upload succeeded
- `publicUrl`: `string` - Public URL to the uploaded image (only present on success)
- `storagePath`: `string` - Storage path used for the upload
- `bucket`: `string` - Bucket name used
- `fileSize`: `number` - File size in bytes (only present on success)
- `error`: `string` - Error message (only present on failure)

**Example JSON output (success):**
```json
{
  "success": true,
  "publicUrl": "https://ymxkzronkhwxzcdcbnwq.supabase.co/storage/v1/object/public/landing-page-images/features/qr-code/hero.png",
  "storagePath": "features/qr-code/hero.png",
  "bucket": "landing-page-images",
  "fileSize": 471859
}
```

**Example JSON output (error):**
```json
{
  "success": false,
  "error": "File not found: tmp/screenshot.png"
}
```

## Example Output

```
📤 Uploading screenshot...
   File: tmp/screenshot.png (0.45 MB)
   Storage path: features/qr-code-integration/hero.png
   Bucket: landing-page-images

✅ Upload successful!

📎 Public URL:
   https://ymxkzronkhwxzcdcbnwq.supabase.co/storage/v1/object/public/landing-page-images/features/qr-code-integration/hero.png

📝 Markdown reference:
   ![Screenshot](https://ymxkzronkhwxzcdcbnwq.supabase.co/storage/v1/object/public/landing-page-images/features/qr-code-integration/hero.png)
```

## Integration with Manual Screenshot Workflows

This script does not capture screenshots by itself. Use it after taking a screenshot with your preferred tool:

1. Capture a screenshot and save it to a temporary file (for example, `tmp/screenshot-{timestamp}.png`)
2. Run this script with that file path and your desired storage path
3. Use the returned public URL or Markdown reference in your documentation

## Troubleshooting

### "Bucket not found" error
- Create the bucket in Supabase Dashboard
- Ensure bucket name matches (default: `landing-page-images`)
- Verify bucket is set to **public**

### "Missing SUPABASE_SERVICE_ROLE_KEY"
- Get key from: Supabase Dashboard → Settings → API → service_role secret
- Set environment variable: `export SUPABASE_SERVICE_ROLE_KEY=your_key`

### "Invalid Supabase URL format"
- URL must start with `https://` and be a valid Supabase project URL
- Examples:
  - Standard: `https://ymxkzronkhwxzcdcbnwq.supabase.co`
  - Custom domain: `https://supabase.equipqr.app`

### File size limits
- Supabase Storage enforces a per-bucket `file_size_limit` (configured in your Supabase project)
- If uploads fail due to size, either reduce the image size or increase the bucket's `file_size_limit` in Supabase Dashboard
