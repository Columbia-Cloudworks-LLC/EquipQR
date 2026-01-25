# Upload Screenshot Script

Uploads screenshots to Supabase Storage for use in documentation.

## Prerequisites

1. **Environment Variables** (set in your shell or `.env`):
   ```bash
   export SUPABASE_URL=https://your-project-ref.supabase.co
   export SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

   Or use `VITE_SUPABASE_URL` instead of `SUPABASE_URL`.

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

The `screenshot-capture` subagent uses this script automatically:

1. Takes screenshot via Playwright MCP tools
2. Saves to temporary file (e.g., `tmp/screenshot-{timestamp}.png`)
3. Calls this script to upload
4. Uses returned public URL in documentation

## Troubleshooting

### "Bucket not found" error
- Create the bucket in Supabase Dashboard
- Ensure bucket name matches (default: `landing-page-images`)
- Verify bucket is set to **public**

### "Missing SUPABASE_SERVICE_ROLE_KEY"
- Get key from: Supabase Dashboard → Settings → API → service_role secret
- Set environment variable: `export SUPABASE_SERVICE_ROLE_KEY=your_key`

### "Invalid Supabase URL format"
- URL must start with `https://` and contain `.supabase.co`
- Example: `https://ymxkzronkhwxzcdcbnwq.supabase.co`

### File size limits
- Supabase Storage enforces a per-bucket `file_size_limit` (configured in your Supabase project)
- If uploads fail due to size, either reduce the image size or increase the bucket's `file_size_limit` in Supabase Dashboard
