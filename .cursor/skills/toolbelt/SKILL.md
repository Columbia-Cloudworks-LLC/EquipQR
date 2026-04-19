---
name: toolbelt
description: Canonical reference for all MCP servers, CLI tools, and platform integrations available in this workspace. Use when any skill or workflow needs to call Datadog, Supabase, Vercel, Figma, GitHub, Context7, or the browser MCP, or when starting a local dev server. Read this before using any integration tool.
---

# EquipQR Toolbelt

Single source of truth for every integration available to the agent in this workspace. Other skills should reference this skill instead of documenting tool usage themselves.

## 0. Secrets Architecture (read this first)

**1Password is the single source of truth for every secret an agent needs.** A read-only Service Account `op-svc-equipqr-agents` has access to the `EquipQR Agents` 1Password vault (UUID `tgo2m6qbct5otqeqirjocn3joa`). All scripts reference the vault by UUID — faster and avoids space-in-name parsing issues. The service account token (`OP_SERVICE_ACCOUNT_TOKEN`) lives in:

- Cursor Cloud Agent secrets (for Linux Cloud Agents)
- GitHub Actions repo secret (for CI)

Local Windows uses your interactive `op signin` instead.

**MCP server distribution model:**

- **Plugin-managed (7 MCPs)** — installed via Cursor's plugin system; folders live under `C:\Users\viral\.cursor\projects\c-Users-viral-EquipQR\mcps\`. Auto-loaded by Cursor; do NOT add to `~/.cursor/mcp.json`. These are: `plugin-supabase-supabase`, `plugin-vercel-vercel`, `plugin-figma-figma`, `plugin-context7-plugin-context7`, `plugin-better-stack-betterstack`, `cursor-ide-browser`, `cursor-app-control`.
- **User-level (4 MCPs)** — defined in `~/.cursor/mcp.json`, rendered by `scripts/render-mcp-config.ps1` from `scripts/mcp.template.json` via `op inject`. These are: `todiagram` (existing), `playwright-recording` (existing), `github` (new, HTTP), `gcloud` (new, stdio). **Datadog MCP is intentionally disabled for cost reduction** — to re-enable, see the `_comment_datadog` block in `scripts/mcp.template.json` and the commented test in `scripts/op-mcp-doctor.ps1`.

**Auth-model split per MCP:**

| MCP | Auth model | Notes |
|---|---|---|
| Supabase | OAuth (your Cursor identity) | Read-only enforced via URL flag `?read_only=true&project_ref=ymxkzronkhwxzcdcbnwq` |
| Vercel | OAuth (your Cursor identity) | No read-only mode; rely on `secret-guardian.py` hook |
| Figma | OAuth | Single-tier |
| Better Stack | OAuth | Single-tier |
| Context7 | None | Public |
| Browser | None | Local |
| GitHub | PAT (Bearer) | Two tiers: `github-prod` (readonly) + `github-write`. Read-only enforced via `X-MCP-Readonly: true` header |
| ~~Datadog~~ | DISABLED (cost reduction) | Re-enable instructions in `scripts/mcp.template.json` |
| Google Cloud | Service account JSON via `GOOGLE_APPLICATION_CREDENTIALS` | Two tiers: `gcp-viewer` + `gcp-editor`. Read-only enforced via IAM viewer roles |
| ToDiagram | API key (env var) | Single-tier |

**Verification:** `.\scripts\op-mcp-doctor.ps1` pings each MCP and reports green/red.

**Rotation:** see `.cursor/skills/secrets-rotation/SKILL.md`.

## Quick Reference

| Integration | Tool | Primary Use |
|---|---|---|
| Supabase | MCP `plugin-supabase-supabase` | Backend: migrations, edge functions, SQL, tables, branches |
| Vercel | MCP `plugin-vercel-vercel` | Frontend hosting: deployments, build logs, runtime logs |
| GitHub | MCP `github` (user-level, HTTP) + CLI `gh` | Repos, issues, PRs, actions, code scanning |
| Google Cloud | MCP `gcloud` (user-level, stdio) + CLI `gcloud` | GCP projects, IAM, Cloud Run, Logging, Monitoring, BigQuery |
| Figma | MCP `plugin-figma-figma` | Design: read designs, write to canvas, Code Connect |
| Context7 | MCP `plugin-context7-plugin-context7` | Documentation: up-to-date library/framework docs |
| Better Stack | MCP `plugin-better-stack-betterstack` | Uptime monitoring, telemetry sources, error tracking |
| Browser | MCP `cursor-ide-browser` | Testing: navigate, snapshot, interact with live pages |
| ~~Datadog~~ | DISABLED (cost reduction) | Was MCP `datadog`. Re-enable via `scripts/mcp.template.json` |
| Google Workspace | CLI `gws` | Docs, Sheets, Gmail, Calendar, Drive, Slides, Tasks, Meet |

---

## 1. Datadog

**Server:** `plugin-datadog-datadog`

Every tool requires a `telemetry` object with an `intent` string describing why the tool is being called. Never include PII or secrets in the intent.

### Key Tools

| Tool | When to Use |
|---|---|
| `search_datadog_logs` | Raw log search (requires `query`) |
| `analyze_datadog_logs` | SQL aggregation on logs (requires `sql_query`) |
| `search_datadog_services` | Discover services, teams, links |
| `search_datadog_spans` | Raw APM trace spans |
| `aggregate_spans` | Aggregate APM data (counts, latency percentiles) |
| `search_datadog_monitors` | Monitor status and alerts |
| `search_datadog_dashboards` | Find dashboards by name |
| `get_datadog_metric` | Timeseries metric queries |
| `search_datadog_rum_events` | Real User Monitoring raw events |
| `search_datadog_incidents` | Incident search by severity/state |
| `get_widget` | Render dashboard widget data |

### Conventions

- Use `search_*` for raw events; use `aggregate_*` or `analyze_*` for counts and aggregations.
- `check_datadog_mcp_setup` diagnoses permission issues.

---

## 2. Supabase

**Server:** `plugin-supabase-supabase`

### Project Constants

| Key | Value |
|---|---|
| Production project ID | `ymxkzronkhwxzcdcbnwq` |
| Organization ID | `wjoecvchliqslvoukmpg` |

### Key Tools

| Tool | When to Use |
|---|---|
| `list_migrations` | Audit applied migrations |
| `apply_migration` | Apply DDL migration (requires `name` + `query`) |
| `execute_sql` | Run read queries or DML (not DDL) |
| `list_tables` | Inspect schema (`schemas`, `verbose` params) |
| `list_edge_functions` | Inventory deployed edge functions |
| `get_edge_function` | Read edge function source |
| `deploy_edge_function` | Push new edge function version |
| `get_logs` | Tail logs by service (api, postgres, edge-function, auth, storage, realtime) |
| `get_advisors` | Security and performance advisories |
| `generate_typescript_types` | Regenerate DB types |
| `list_branches` | Dev branch status |
| `search_docs` | Search Supabase documentation |

### Conventions

- Always use `project_id: "ymxkzronkhwxzcdcbnwq"` for production queries.
- Use `apply_migration` for DDL; `execute_sql` for SELECT/DML.
- Edge function deployment requires `files` array with `name` + `content` per file.

---

## 3. Vercel

**Server:** `plugin-vercel-vercel`

### Project Constants

| Key | Value |
|---|---|
| Team ID | `team_78VeGDURoofThjZNJOKEBpP5` |
| EquipQR project ID | `prj_P9hRun4B2OdGy8ACCnb0f7jNG6UA` |

### Key Tools

| Tool | When to Use |
|---|---|
| `list_deployments` | Recent deployments with status and commit info |
| `get_deployment` | Single deployment detail by ID or URL |
| `get_deployment_build_logs` | Build output for a specific deployment |
| `get_runtime_logs` | Runtime logs (filter by env, level, status) |
| `get_project` | Project configuration |
| `deploy_to_vercel` | Trigger a deployment |
| `list_toolbar_threads` | Vercel toolbar comment threads |
| `web_fetch_vercel_url` | Fetch protected deployment URLs |
| `search_vercel_documentation` | Search Vercel docs |

### Conventions

- Always pass `teamId: "team_78VeGDURoofThjZNJOKEBpP5"`.
- Most tools also require `projectId` — use the constant above for EquipQR.

---

## 4. Figma

**Server:** `plugin-figma-figma`

### Project Constants

| Key | Value |
|---|---|
| Plan key | `team::1523012625938464812` |

### Key Tools

| Tool | When to Use |
|---|---|
| `get_design_context` | Primary design-to-code tool (returns code + screenshot) |
| `get_screenshot` | Visual snapshot of a Figma node |
| `get_metadata` | XML structure overview of a node |
| `use_figma` | Run Plugin API JavaScript for create/edit/inspect |
| `search_design_system` | Search design libraries for components, variables, styles |
| `get_variable_defs` | Design token definitions |
| `generate_figma_design` | Import HTML/web page into Figma |
| `generate_diagram` | Create FigJam diagrams from Mermaid |
| `whoami` | Debug auth and permissions |

### URL Parsing

Extract `fileKey` and `nodeId` from Figma URLs:
- `figma.com/design/:fileKey/:fileName?node-id=:nodeId` — convert `-` to `:` in nodeId
- `figma.com/design/:fileKey/branch/:branchKey/:fileName` — use branchKey as fileKey

### Conventions

- Always read the `figma-use` skill before calling `use_figma`.
- `get_design_context` is the default starting tool for design-to-code work.
- For FigJam, use `get_figjam` instead of `get_design_context`.

---

## 5. Context7

**Server:** `plugin-context7-plugin-context7`

### Tools

| Tool | When to Use |
|---|---|
| `resolve-library-id` | Convert a library name to a Context7 ID (required first step) |
| `query-docs` | Fetch docs/examples for a resolved library ID |

### Conventions

- Always call `resolve-library-id` before `query-docs` unless the user provides a `/org/project` ID directly.
- Do not call `query-docs` more than 3 times per question.
- Use for any library/framework documentation lookup — React, Supabase client, Tailwind, shadcn, TanStack Query, Zod, etc.

---

## 6. Browser

**Server:** `cursor-ide-browser`

### Workflow

1. `browser_navigate` to a URL (reuses existing tab by default)
2. `browser_snapshot` to get the page accessibility tree and element refs
3. Interact using `browser_click`, `browser_fill`, `browser_type`, `browser_select_option`, etc.
4. `browser_take_screenshot` for visual verification (save to `tmp/screenshots/`)
5. `browser_lock` / unlock to prevent user interference during automation

### Key Tools

| Tool | When to Use |
|---|---|
| `browser_navigate` | Go to a URL |
| `browser_snapshot` | Get page structure and refs for interaction |
| `browser_take_screenshot` | Visual screenshot (see Screenshot Workflow below) |
| `browser_click` | Click elements by ref |
| `browser_fill` | Replace input field content |
| `browser_type` | Append text to input |
| `browser_console_messages` | Read browser console |
| `browser_network_requests` | Inspect network activity |
| `browser_search` | Ctrl+F text search on page |
| `browser_scroll` | Scroll page or element |
| `browser_profile_start` / `_stop` | CPU profiling |

### Screenshot Workflow

All browser screenshots must be saved to `tmp/screenshots/` (gitignored via `tmp/*`). The MCP tool saves to a system temp directory by default, so a copy step is required.

**Step 1 — Capture:**

Call `browser_take_screenshot` via the `cursor-ide-browser` MCP server:

```json
{
  "filename": "<descriptive-name>.png",
  "fullPage": false
}
```

| Parameter | Required | Notes |
|---|---|---|
| `filename` | Recommended | Defaults to `page-{timestamp}.png` if omitted |
| `fullPage` | No | `true` captures the full scrollable page; `false` (default) captures the viewport only |
| `element` | No | Description of a specific element to capture |
| `ref` | No | CSS selector for a specific element |
| `viewId` | No | Target browser tab ID; omit to use the last interacted tab |

**Step 2 — Copy to workspace:**

The tool returns the saved path (typically under `AppData\Local\Temp\cursor\screenshots\`). Copy the file into the workspace temp directory:

```powershell
Copy-Item "<returned-temp-path>" "tmp/screenshots/<descriptive-name>.png"
```

**Filename conventions:**

| Context | Pattern | Example |
|---|---|---|
| General capture | `<page>-<YYYY-MM-DD>.png` | `dashboard-2026-04-05.png` |
| Evidence run | `<control-id>-<page>.png` | `txr-ac-1-rbac-settings.png` |
| Visual regression | `<feature>-<state>.png` | `fleet-map-loaded.png` |
| Timestamped series | `<page>-<YYYY-MM-DD>-<HH-MM>.png` | `dashboard-2026-04-05-14-30.png` |

### Embedding Screenshots in Google Docs

To embed a browser screenshot directly into a Google Doc (e.g., for audit evidence packages):

**Step 1 — Capture:** Use `browser_take_screenshot` as above. Note the returned file path.

**Step 2 — Upload to Drive:**

```powershell
gws drive +upload "<screenshot-path>" --name "<descriptive-name>.png" --format json
```

Save the returned `id` (the Drive file ID).

**Step 3 — Share as link-accessible:** The Google Docs API fetches images by URL, so the file must be readable.

```powershell
gws drive permissions create --params '{"fileId": "<FILE_ID>"}' --json '{"type": "anyone", "role": "reader"}' --format json
```

**Step 4 — Get the document insertion index:** Find the end of the document body (or a specific position).

```powershell
# Parse endIndex from the last body content element
gws docs documents get --params '{"documentId": "<DOC_ID>"}' --format json
```

**Step 5 — Insert the image:** Use `insertInlineImage` in a `batchUpdate` call.

```powershell
$batchJson = @"
{
  "requests": [
    {
      "insertInlineImage": {
        "uri": "https://lh3.googleusercontent.com/d/<FILE_ID>",
        "location": {
          "index": <INSERT_INDEX>
        },
        "objectSize": {
          "width": {
            "magnitude": 468,
            "unit": "PT"
          }
        }
      }
    }
  ]
}
"@
gws docs documents batchUpdate --params '{"documentId": "<DOC_ID>"}' --json $batchJson --format json
```

| Parameter | Notes |
|---|---|
| `uri` | Use `https://lh3.googleusercontent.com/d/<FILE_ID>` for Drive-hosted images |
| `location.index` | Insert position; use `endIndex - 1` to append at end |
| `objectSize.width` | Set width only; height auto-scales to preserve aspect ratio. 468 PT ≈ 6.5 inches (full page width) |

**Tip:** Append a text caption via `gws docs +write` before inserting the image so the caption appears above the screenshot.

### Conventions

- Always `browser_snapshot` before interacting — refs are tied to the latest snapshot.
- Take a fresh snapshot after any action that changes the page.
- For coordinate clicks (`browser_mouse_click_xy`), take a fresh screenshot immediately before.
- Use `browser_lock` only after a tab exists. Correct order: navigate → lock → interact → unlock.
- Never save screenshots to the workspace root or any tracked directory — always use `tmp/screenshots/`.

---

## 7. GitHub

**CLI:** `gh` (GitHub CLI, authenticated as `viralarchitect`)

### Project Constants

| Key | Value |
|---|---|
| Repository | `Columbia-Cloudworks-LLC/EquipQR` |
| Org project (EquipQR board) | `#5` (ID: `PVT_kwDOCKvMq84BOBTY`) |
| Org project (Legislative Red Team) | `#6` |

### Common Commands

```powershell
# Issues
gh issue list --repo Columbia-Cloudworks-LLC/EquipQR --limit 10 --json number,title,state
gh issue view 123 --repo Columbia-Cloudworks-LLC/EquipQR

# Pull requests
gh pr list --repo Columbia-Cloudworks-LLC/EquipQR --json number,title,state
gh pr view 123 --repo Columbia-Cloudworks-LLC/EquipQR

# Org project board
gh project list --owner Columbia-Cloudworks-LLC --format json
gh project item-list 5 --owner Columbia-Cloudworks-LLC --format json

# PR review comments
gh api repos/Columbia-Cloudworks-LLC/EquipQR/pulls/123/comments
```

### Conventions

- Use `--json` for structured output; avoid `--jq` with complex expressions in PowerShell (escaping issues).
- Viewing the org project needs `read:project` scope; mutating items needs `project` scope.
- Do not use `-i` (interactive) flags.

---

## 8. Google Workspace

**CLI:** `gws` v0.22.5 (on PATH at `C:\WINDOWS\gws.exe`)

### Account & Auth

| Key | Value |
|---|---|
| Authenticated account | `nicholas.king@columbiacloudworks.com` |
| GCP project | `equipqr-prod` |
| Credentials | `C:\Users\viral\.config\gws\credentials.enc` (AES-256-GCM, OS keyring) |
| Client config | `C:\Users\viral\.config\gws\client_secret.json` (Desktop OAuth client) |

Check auth: `gws auth status`

### Key Services

| Service | CLI prefix | Common operations |
|---|---|---|
| Drive | `gws drive` | `files list`, `files get`, `files create`, `+upload` |
| Docs | `gws docs` | `documents create`, `documents get`, `documents batchUpdate`, `+write` |
| Sheets | `gws sheets` | `spreadsheets create`, `spreadsheets get`, `+read`, `+append` |
| Gmail | `gws gmail` | `+send`, `+read`, `+reply`, `+forward`, `+triage` |
| Calendar | `gws calendar` | `events list`, `events insert`, `+agenda`, `+insert` |
| Slides | `gws slides` | `presentations create`, `presentations get`, `presentations batchUpdate` |
| Tasks | `gws tasks` | `tasklists list`, `tasks list`, `tasks insert` |
| Meet | `gws meet` | `conferenceRecords list`, `spaces create` |
| Chat | `gws chat` | `spaces list`, `spaces messages create`, `+send` |
| Forms | `gws forms` | `forms get`, `forms create` |
| Keep | `gws keep` | `notes list`, `notes get`, `notes create` |
| People | `gws people` | `people connections list`, `people get` |

### Helper Commands (+ prefix)

Helper commands are high-level shortcuts that wrap API calls:

```powershell
gws docs +write --document DOC_ID --text "content"
gws sheets +read --spreadsheet SHEET_ID --range "Sheet1!A1:D10"
gws sheets +append --spreadsheet SHEET_ID --range "Sheet1" --values '[["a","b"]]'
gws gmail +send --to user@example.com --subject "Subject" --body "Body"
gws gmail +send --to user@example.com --subject "Report" --body "<h1>HTML</h1>" --html
gws drive +upload --file report.pdf --folder FOLDER_ID
gws calendar +agenda
gws calendar +insert --summary "Meeting" --start "2026-04-07T10:00:00" --duration 60
```

### Discovery & Schema Inspection

```powershell
gws docs --help
gws schema docs.documents.batchUpdate
gws schema drive.files.create
```

Always run `gws schema <service>.<resource>.<method>` before calling an unfamiliar API method to discover required parameters.

### Document Branding — Columbia Cloudworks LLC

When creating documents, reports, emails, or any external-facing content via `gws`, the output represents **Columbia Cloudworks LLC**. Apply consistent branding:

- Company name: **Columbia Cloudworks LLC**
- Product name: **EquipQR** (when product-specific)
- Tone: professional, confident, technically credible
- Include company name in document titles and headers where appropriate
- For formal deliverables (audit evidence, customer reports, executive packets), use structured section headers and clear provenance attribution

### Conventions

- Write commands (`+write`, `+send`, `+upload`, `batchUpdate`, `create`, `delete`) require user confirmation before execution.
- Use `--dry-run` to preview destructive or send operations.
- Use `--format table` for human-readable output; `--format json` (default) for programmatic use.
- On PowerShell, wrap `--params` and `--json` values in single quotes to preserve inner double quotes.
- For Sheets ranges containing `!`, use double quotes: `--range "Sheet1!A1:D10"`.
- Read the `gws-shared` skill for global flags, auth, and security rules.
- Individual service skills (`gws-docs`, `gws-sheets-read`, `gws-gmail-send`, etc.) contain detailed flag references and examples.

---

## 9. Document Automation (Word Toolkit)

**Location:** `C:\Users\viral\Documents\ColumbiaCloudworks\doc-automation\`

This is the primary tool for generating branded Columbia Cloudworks product documents: audit packets, compliance reports, executive summaries, and customer deliverables. It produces DOCX + PDF with logos, branded headers/footers, styled tables, and embedded screenshots. Do **not** use `gws docs` for product deliverable generation.

### Toolkit Structure

| Path | Purpose |
|---|---|
| `branding/brand-constants.json` | Colors, fonts, sizes, logo references |
| `branding/legal-copy.json` | Footer text, cover page copy, confidentiality levels |
| `branding/logo-*.png` | Company logos (1x1, 4x3, 16x9, 9x16) |
| `templates/audit/audit-packet-template.dotx` | Branded Word template with cover page, header logo, styles |
| `schemas/audit-packet-schema.json` | JSON Schema for manifest input |
| `scripts/New-BrandedDocument.ps1` | Main CLI: manifest → DOCX + PDF |
| `scripts/New-AuditTemplate.ps1` | Regenerates the template from brand assets |
| `examples/equipqr-audit-example.json` | Working EquipQR example manifest |

### Usage

Always run from the project root directory so output lands in the project's `tmp/documents/` and image paths resolve against `tmp/screenshots/`.

```powershell
# Generate branded document from manifest
powershell -ExecutionPolicy Bypass -File "C:\Users\viral\Documents\ColumbiaCloudworks\doc-automation\scripts\New-BrandedDocument.ps1" -ManifestPath "path\to\manifest.json"

# Preview without generating
powershell -ExecutionPolicy Bypass -File "C:\Users\viral\Documents\ColumbiaCloudworks\doc-automation\scripts\New-BrandedDocument.ps1" -ManifestPath "path\to\manifest.json" -DryRun

# Custom output location
powershell -ExecutionPolicy Bypass -File "C:\Users\viral\Documents\ColumbiaCloudworks\doc-automation\scripts\New-BrandedDocument.ps1" -ManifestPath "manifest.json" -OutputDir "C:\custom\path"
```

### Manifest Format

```json
{
  "title": "Document Title",
  "customer": "Customer Name",
  "date": "2026-04-06",
  "confidentiality": "Confidential",
  "sections": [
    {
      "tag": "ExecSummary",
      "title": "Executive Summary",
      "content": "Plain text content..."
    },
    {
      "tag": "ControlResults",
      "title": "Control Results Summary",
      "table": {
        "headers": ["Control", "Status", "Notes"],
        "rows": [["AC-1", "Verified", "RBAC enforced"]]
      }
    },
    {
      "tag": "VisualAppendix",
      "title": "Visual Appendix",
      "images": [
        { "path": "tmp/screenshots/screenshot.png", "caption": "Figure 1" }
      ]
    }
  ]
}
```

Standard section tags: `ExecSummary`, `ScopeMethod`, `ControlResults`, `DetailedFindings`, `VisualAppendix`.

For audit evidence packets, `images[]` supports richer exhibit metadata:

- `title` (heading above screenshot)
- `details` (readable explanation below screenshot)
- `answers` (control IDs answered by this exhibit; string or array)
- `url`
- `capturedUtc`
- `source`
- `finding`
- `notes`

### Conventions

- Output defaults to `$PWD/tmp/documents/` (gitignored via `tmp/*`).
- Image paths in manifests resolve relative to CWD (the project root).
- Screenshots from `tmp/screenshots/` are embedded directly into the document body.
- Status keywords in table cells (`Verified`, `Failed`, `Not Verified`, `Blocked`) are automatically color-coded.
- Both `.docx` and `.pdf` are produced by default; use `-NoPdf` to skip PDF.
- Re-running the same command overwrites cleanly (idempotent).

### Audit exhibit rendering defaults

The Word generator uses audit-safe exhibit rendering:

- each screenshot starts on a new page
- exhibit title appears at the top of that page
- screenshot appears next
- readable metadata block appears below image

Use structured `images[]` fields instead of overloading `caption` when possible.

### When to Use Word Toolkit vs Google Workspace

| Scenario | Tool |
|---|---|
| Audit packet, compliance report, executive summary | **Word Toolkit** |
| Customer-facing branded deliverable | **Word Toolkit** |
| Internal email or calendar event | Google Workspace (`gws`) |
| Spreadsheet data or append-only logs | Google Workspace (`gws sheets`) |
| Quick plaintext note shared via Drive | Google Workspace (`gws docs`) |

---

## 10. Local Development

### Starting the Dev Server

**Never start the dev server directly.** The user must run:

```powershell
.\dev-start.bat          # standard start
.\dev-start.bat -Force   # force restart
```

This script injects secrets from 1Password into `.env` files. The agent cannot access 1Password, so starting the server without the user present will hang waiting for authentication.

If the app is partially running, the user should run `.\dev-stop.bat` first.

### When a Skill Needs the Dev Server

1. Check if the dev server is already running by reading terminal files.
2. If not running, **stop and ask the user** to run `dev-start.bat`.
3. Do not attempt `npm run dev` or `npx vite` directly.

---

## Integration Selection Guide

| I need to... | Use |
|---|---|
| Check production logs or errors | Datadog `search_datadog_logs` |
| See what's deployed | Vercel `list_deployments` |
| Check build failures | Vercel `get_deployment_build_logs` |
| Run a database query | Supabase `execute_sql` |
| Check migration state | Supabase `list_migrations` |
| Inspect edge function code | Supabase `get_edge_function` |
| Look up library API docs | Context7 `resolve-library-id` → `query-docs` |
| Test the live app visually | Browser `browser_navigate` → `browser_snapshot` |
| Take a browser screenshot | Browser `browser_take_screenshot` → copy to `tmp/screenshots/` |
| Read a Figma design | Figma `get_design_context` |
| Write to Figma canvas | Figma `use_figma` (read `figma-use` skill first) |
| Check open issues/bugs | GitHub `gh issue list` |
| See project board status | GitHub `gh project item-list 5` |
| Monitor frontend performance | Datadog `search_datadog_rum_events` or `aggregate_rum_events` |
| Check runtime errors | Vercel `get_runtime_logs` |
| Get security/perf advisories | Supabase `get_advisors` |
| Create a branded deliverable (audit, report) | Word Toolkit `New-BrandedDocument.ps1` (see section 9) |
| Create a Google Doc (internal notes) | `gws docs documents create` → `gws docs +write` |
| Read or write a spreadsheet | `gws sheets +read` / `gws sheets +append` |
| Send an email | `gws gmail +send` |
| Check calendar or create event | `gws calendar +agenda` / `gws calendar +insert` |
| Upload a file to Drive | `gws drive +upload` |
| Create a presentation | `gws slides presentations create` |
