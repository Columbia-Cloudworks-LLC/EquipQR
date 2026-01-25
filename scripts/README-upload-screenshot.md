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

## Integration with Screenshot Capture Subagent

The `screenshot-capture` subagent **does not** upload screenshots automatically. Instead, use this script as part of a manual workflow:

1. The subagent takes a screenshot via Playwright MCP tools
2. It saves the image to a temporary file (e.g., `tmp/screenshot-{timestamp}.png`)
3. You manually run this script with that file path and desired storage path
4. You then use the returned public URL or Markdown reference in your documentation

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
