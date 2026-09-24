# PR visual evidence pipeline

Agents **must** capture screenshots and an MP4 demo video from the local dev stack before opening or updating a product PR. Screenshots upload to preview Supabase Storage; the demo video uploads to **GitHub user-attachments** so PR bodies and comments render an inline player.

## Quick path

See the current [Bash workflow commands](https://github.com/Columbia-Cloudworks-LLC/EquipQR/blob/preview/docs/ops/linux-workflows.md) for this operation.

## Scripts

| Script | Role |
|--------|------|
| `bash dev/linux/pr-evidence.sh capture` | Stack probe/start, Playwright run, PNG + H.264 MP4 generation, visual-review checklist |
| `bash dev/linux/pr-evidence.sh review` | Record agent PNG review approval (`visual-review.json`) |
| `bash dev/linux/pr-evidence.sh upload` | Upload screenshots to Supabase + demo MP4 to GitHub, emit markdown |
| `bash dev/linux/pr-evidence.sh` | End-to-end orchestrator (+ optional `gh pr comment`); gates publish on visual review |
| `bash dev/docs-media/workflow.sh publish` | Upload capture artifacts to public `docs-media` for equipqr.info articles |

## Documentation media bucket

For equipqr.info (not PR comments), publish capture manifests to **`docs-media`**:

```bash
bash dev/docs-media/workflow.sh publish \
  -ManifestPath tmp\pr-evidence\location-maps-desktop\manifest.json \
  -Collection location-maps \
  -Variant desktop \
  -MarkdownOut tmp\docs-media\location-maps\desktop.md
```

Bootstrap optional verification after migration (uses `SUPABASE_URL` / `VITE_SUPABASE_URL` from the shell, or pass `-SupabaseUrl`; `bash dev/docs-media/workflow.sh publish` loads upload env automatically):

```bash
bash dev/docs-media/workflow.sh verify
```

## Prerequisites

- Local stack at `http://localhost:8080` (or pass `-BaseUrl`)
- Playwright Chromium: `npx playwright install chromium`
- `ffmpeg` and `ffprobe` on PATH (WebM → H.264 MP4 uses shared recording profile from `dev/lib/recording-quality.mjs`)
- `OP_SERVICE_ACCOUNT_TOKEN` (User scope) for preview Supabase screenshot uploads — `bash dev/linux/pr-evidence.sh` and `bash dev/docs-media/workflow.sh publish` call `Set-PrEvidenceUploadEnvironment`, which materializes `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` from 1Password for the session (see `dev/README-upload-screenshot.md` for manual setup)
- **`GH_SESSION_TOKEN` (User scope)** for GitHub inline video upload — a GitHub `user_session` cookie, **not** a PAT. One-time setup:
  See the current [Bash workflow commands](https://github.com/Columbia-Cloudworks-LLC/EquipQR/blob/preview/docs/ops/linux-workflows.md) for this operation.
  Refresh when GitHub invalidates the session (`gh image check-token`).
- `gh` authenticated when using `-Publish`

## Storage contract

| Artifact | Host | Path / format |
|----------|------|----------------|
| Screenshots | Supabase `landing-page-images` (public) | `pr-evidence/{branch}/{flow}-{label}.png` |
| Demo video | GitHub user-attachments | `{flow}-demo.mp4` uploaded via `dev/upload-github-asset.ts` |

Local capture artifacts under `tmp/pr-evidence/{flow}/`:

- `{flow}-{label}.png` (via spec helpers)
- `demo.mp4` (Playwright WebM → ffmpeg H.264)

Markdown embeds the demo as a **bare GitHub URL on its own line** (required for inline video playback). Screenshots use `![label](https://...supabase.co/...)`.

## Workflow-only exception

Changes confined to `.cursor/**`, `AGENTS.md`, or `dev/mcp.template.json` do not require PR visual evidence.
