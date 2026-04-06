---
name: toolbelt
description: Canonical reference for all MCP servers, CLI tools, and platform integrations available in this workspace. Use when any skill or workflow needs to call Datadog, Supabase, Vercel, Figma, GitHub, Context7, or the browser MCP, or when starting a local dev server. Read this before using any integration tool.
---

# EquipQR Toolbelt

Single source of truth for every integration available to the agent in this workspace. Other skills should reference this skill instead of documenting tool usage themselves.

## Quick Reference

| Integration | MCP Server | Primary Use |
|---|---|---|
| Datadog | `plugin-datadog-datadog` | Observability: logs, metrics, APM, RUM, monitors, incidents |
| Supabase | `plugin-supabase-supabase` | Backend: migrations, edge functions, SQL, tables, branches |
| Vercel | `plugin-vercel-vercel` | Frontend hosting: deployments, build logs, runtime logs |
| Figma | `plugin-figma-figma` | Design: read designs, write to canvas, Code Connect |
| Context7 | `plugin-context7-plugin-context7` | Documentation: up-to-date library/framework docs |
| Browser | `cursor-ide-browser` | Testing: navigate, snapshot, interact with live pages |
| GitHub | `gh` CLI | Work tracking: issues, PRs, org project board |

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
4. `browser_take_screenshot` for visual verification
5. `browser_lock` / unlock to prevent user interference during automation

### Key Tools

| Tool | When to Use |
|---|---|
| `browser_navigate` | Go to a URL |
| `browser_snapshot` | Get page structure and refs for interaction |
| `browser_take_screenshot` | Visual screenshot |
| `browser_click` | Click elements by ref |
| `browser_fill` | Replace input field content |
| `browser_type` | Append text to input |
| `browser_console_messages` | Read browser console |
| `browser_network_requests` | Inspect network activity |
| `browser_search` | Ctrl+F text search on page |
| `browser_scroll` | Scroll page or element |
| `browser_profile_start` / `_stop` | CPU profiling |

### Conventions

- Always `browser_snapshot` before interacting — refs are tied to the latest snapshot.
- Take a fresh snapshot after any action that changes the page.
- For coordinate clicks (`browser_mouse_click_xy`), take a fresh screenshot immediately before.
- Use `browser_lock` only after a tab exists. Correct order: navigate → lock → interact → unlock.

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

## 8. Local Development

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
| Read a Figma design | Figma `get_design_context` |
| Write to Figma canvas | Figma `use_figma` (read `figma-use` skill first) |
| Check open issues/bugs | GitHub `gh issue list` |
| See project board status | GitHub `gh project item-list 5` |
| Monitor frontend performance | Datadog `search_datadog_rum_events` or `aggregate_rum_events` |
| Check runtime errors | Vercel `get_runtime_logs` |
| Get security/perf advisories | Supabase `get_advisors` |
