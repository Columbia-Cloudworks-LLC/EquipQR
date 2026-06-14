# PR visual evidence pipeline

Agents **must** capture screenshots and an MP4 demo video from the local dev stack before opening or updating a product PR. Screenshots upload to preview Supabase Storage; the demo video uploads to **GitHub user-attachments** so PR bodies and comments render an inline player.

## Quick path

```powershell
# 1. Add or update e2e/pr-evidence/<feature>.spec.ts (see e2e/pr-evidence/README.md)

# 2. Capture + upload + write markdown
.\scripts\pr-evidence\Invoke-PrEvidence.ps1 `
  -Flow "my-feature" `
  -Spec "e2e/pr-evidence/my-feature.spec.ts"

# 3. Include tmp/pr-evidence/my-feature/evidence-markdown.md in the PR body, then post comment after create:
.\scripts\pr-evidence\Invoke-PrEvidence.ps1 `
  -Flow "my-feature" `
  -Spec "e2e/pr-evidence/my-feature.spec.ts" `
  -PrNumber 1234 `
  -Publish

# -Publish reuses an existing capture in tmp/pr-evidence/{flow}/ (no Playwright re-run).
# Pass -Recapture to force a fresh capture when publishing.
```

## Scripts

| Script | Role |
|--------|------|
| `Invoke-PrEvidenceCapture.ps1` | Stack probe/start, Playwright run, PNG + H.264 MP4 generation |
| `Publish-PrEvidence.ps1` | Upload screenshots to Supabase + demo MP4 to GitHub, emit markdown |
| `Invoke-PrEvidence.ps1` | End-to-end orchestrator (+ optional `gh pr comment`) |

## Prerequisites

- Local stack at `http://localhost:8080` (or pass `-BaseUrl`)
- Playwright Chromium: `npx playwright install chromium`
- `ffmpeg` and `ffprobe` on PATH (WebM → H.264 MP4 uses shared recording profile from `scripts/lib/recording-quality.mjs`)
- `OP_SERVICE_ACCOUNT_TOKEN` (User scope) for preview Supabase screenshot uploads
- **`GH_SESSION_TOKEN` (User scope)** for GitHub inline video upload — a GitHub `user_session` cookie, **not** a PAT. One-time setup:
  ```powershell
  gh extension install drogers0/gh-image
  gh image extract-token | Set-Content -Path "$env:USERPROFILE\.equipqr-gh-session-token" -NoNewline -Encoding ascii
  [Environment]::SetEnvironmentVariable('GH_SESSION_TOKEN', (Get-Content "$env:USERPROFILE\.equipqr-gh-session-token" -Raw).Trim(), 'User')
  ```
  Refresh when GitHub invalidates the session (`gh image check-token`).
- `gh` authenticated when using `-Publish`

## Storage contract

| Artifact | Host | Path / format |
|----------|------|----------------|
| Screenshots | Supabase `landing-page-images` (public) | `pr-evidence/{branch}/{flow}-{label}.png` |
| Demo video | GitHub user-attachments | `{flow}-demo.mp4` uploaded via `scripts/upload-github-asset.ts` |

Local capture artifacts under `tmp/pr-evidence/{flow}/`:

- `{flow}-{label}.png` (via spec helpers)
- `demo.mp4` (Playwright WebM → ffmpeg H.264)

Markdown embeds the demo as a **bare GitHub URL on its own line** (required for inline video playback). Screenshots use `![label](https://...supabase.co/...)`.

## Workflow-only exception

Changes confined to `.cursor/**`, `AGENTS.md`, or `scripts/mcp.template.json` do not require PR visual evidence.
