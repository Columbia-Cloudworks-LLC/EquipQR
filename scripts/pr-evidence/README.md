# PR visual evidence pipeline

Agents **must** capture screenshots and a GIF from the local dev stack before opening or updating a product PR. Artifacts upload to preview Supabase Storage (`landing-page-images/pr-evidence/{branch}/`) so GitHub renders them inline in PR comments.

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
| `Invoke-PrEvidenceCapture.ps1` | Stack probe/start, Playwright run, PNG + GIF generation |
| `Publish-PrEvidence.ps1` | Upload to Supabase, emit markdown |
| `Invoke-PrEvidence.ps1` | End-to-end orchestrator (+ optional `gh pr comment`) |

## Prerequisites

- Local stack at `http://localhost:8080` (or pass `-BaseUrl`)
- Playwright Chromium: `npx playwright install chromium`
- `ffmpeg` and `ffprobe` on PATH (GIF conversion crops to viewport aspect ratio)
- `OP_SERVICE_ACCOUNT_TOKEN` (User scope) for preview Supabase upload reads
- `gh` authenticated when using `-Publish`

## Storage contract

- **Bucket:** `landing-page-images` (public)
- **Prefix:** `pr-evidence/{branch-slug}/`
- **Files:** `{flow}-{label}.png`, `{flow}-demo.gif`

URLs are stable enough for PR review; re-upload uses `upsert: true`.

## Workflow-only exception

Changes limited to `.cursor/**`, `AGENTS.md`, and `scripts/mcp.template.json` do not require PR visual evidence.

See `.cursor/rules/pr-visual-evidence.mdc` for the agent gate.
