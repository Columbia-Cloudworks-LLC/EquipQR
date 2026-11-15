# PR visual evidence pipeline

Agents **must** capture screenshots and a demo video from the local dev stack before opening or updating a product PR. Publishing needs only `git`/`gh` auth: no Supabase credentials and no browser session cookie.

## Quick path

See the current [Bash workflow commands](https://github.com/Columbia-Cloudworks-LLC/EquipQR/blob/preview/docs/ops/linux-workflows.md) for this operation.

## Scripts

| Script | Role |
|--------|------|
| `bash dev/linux/pr-evidence.sh capture` | Stack probe/start, Playwright run, PNG + H.264 MP4 generation, visual-review checklist |
| `bash dev/linux/pr-evidence.sh review` | Record agent PNG review approval (`visual-review.json`) |
| `bash dev/linux/pr-evidence.sh publish --pr N` | Render `demo.gif`, push files to the orphan `pr-evidence` branch, create or update the PR comment; gated on visual review |
| `bash dev/ci/prune-pr-evidence.sh` | Run weekly by `.github/workflows/prune-pr-evidence.yml`: removes folders of PRs closed > 14 days, squashes the branch |
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
- `gh` authenticated with push access to the repo (`gh auth status`)

PR evidence needs no Supabase key or browser session cookie. Docs media (`dev/docs-media/workflow.sh publish`) still needs the Supabase variables; see `dev/README-upload-screenshot.md`.

## Storage contract

| Artifact | Host | Path |
|----------|------|------|
| Screenshots | `pr-evidence` branch (orphan, public) | `pr-<number>/<flow>/<label>.png` |
| Inline demo | `pr-evidence` branch | `pr-<number>/<flow>/demo.gif` (from `demo.mp4`, ≤5 MB) |
| Full demo | `pr-evidence` branch | `pr-<number>/<flow>/demo.mp4` (linked, not inline) |

Comment URLs are `https://raw.githubusercontent.com/<repo>/pr-evidence/pr-<number>/<flow>/<file>?v=<commit>`. The `?v=` suffix changes on each publish so GitHub's image proxy doesn't serve a stale copy. Each flow gets one comment, found by its `<!-- pr-visual-evidence:<flow> -->` marker and edited in place on re-publish.

Local capture artifacts under `tmp/pr-evidence/{flow}/`:

- `screenshots/{label}.png` (via spec helpers)
- `demo.mp4` (Playwright WebM → ffmpeg H.264)
- `publish/` (staged files) and `evidence-markdown.md` (the posted comment body)

Never merge the `pr-evidence` branch. It carries its own `vercel.json` so Vercel skips it.

## Workflow-only exception

Changes confined to `.agents/**`, `AGENTS.md`, or `dev/mcp.template.json` do not require PR visual evidence.
