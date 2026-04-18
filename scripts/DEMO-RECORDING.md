# Demo recording (video)

This repository supports **one canonical video artifact per run** for product demonstrations, with a phased rollout.

## Demo System v2 (recommended for operations)

For scenario-driven multi-scene recording, quality gates, diagnostics sidecars, and optional composition, use:

- `scripts/DEMO-SYSTEM-V2.md`
- `npm run demo:v2:list`

## Canonical artifact contract

- **Directory:** `tmp/demos`
- **Filename:** `YYYYMMDD-HHmmss-<flow>[-runNN].webm`
- **Flow examples:** `demo-smoke`, `demo-prod`, `scenario-<slug>`
- **Reliability loops:** include `-runNN`
- **Intermediate files:** Playwright may still emit internal files under `test-results`, but operators should only use finalized files in `tmp/demos`.

## Phase boundaries

| Phase | Mechanism | When to use |
| --- | --- | --- |
| **Phase 1** | `scripts/demo-gif.mjs` + `playwright-cli` | Quick smoke video, same stack as existing GIF demos; supports `--smoke` and `--video-only`. |
| **Phase 2** | `@playwright/test` in `e2e/` | Long-term, CI-friendly runs; supports `storageState` for production auth. |

**Acceptance criteria (smoke):** one canonical `.webm` under `tmp/demos/` per successful run; file size non-trivial (> 256 bytes); flow ends on `/dashboard` (or equivalent) when auth succeeds.

## Prerequisites

- **`playwright-cli`** on `PATH` (same as `npm run demo:gif`).
- **Phase 1 GIF path only:** `ffmpeg` on `PATH`.
- **Localhost smoke:** app reachable at `--base-url` (default `http://localhost:8080`) with **dev quick login** on `/auth`.
- **Production (or any non-localhost) smoke (Phase 1):** the browser session must already be able to reach `/dashboard` (e.g. persistent profile is **not** used by `playwright-cli` the same way as Playwright Test). For real production auth, prefer **Phase 2** with a saved storage file.

## Phase 1 commands

```powershell
# From repo root — single smoke video (canonical timestamped name under tmp/demos)
npm run demo:video-smoke

# Custom base URL and output file (must end with .webm; use tmp/demos/... or basename)
npm run demo:video-smoke -- -- --base-url=http://localhost:8080 --out=tmp/demos/my-smoke.webm

# Reliability gate: 5 consecutive successful runs (override with DEMO_RELIABILITY_RUNS)
npm run demo:video-smoke:reliability
```

Notes:

- Pass extra args to the smoke script **after** `--` when using `npm run` (npm consumes the first `--`).

## Phase 2 commands (`@playwright/test`)

```powershell
# Install browsers once (dev machine)
npx playwright install chromium

# Localhost: uses dev quick login in the spec
$env:DEMO_BASE_URL="http://localhost:8080"
npm run demo:record

# Production strict sequence:
# 1) verify browser/install + storage-state preflight
npm run demo:record:preflight:prod

# 2) save storage once, then reuse
npx playwright codegen https://equipqr.app --save-storage=tmp/demos/auth.json

# 3) run recording (finalizes canonical artifact into tmp/demos)
$env:DEMO_BASE_URL="https://equipqr.app"
$env:DEMO_STORAGE_STATE="tmp/demos/auth.json"
npm run demo:record:prod

# 4) reliability gate (default 3 runs)
$env:DEMO_PROD_RELIABILITY_RUNS="3"
npm run demo:record:prod:reliability
```

Validate outputs from `tmp/demos`:

```powershell
# newest artifacts first
Get-ChildItem tmp/demos/*.webm | Sort-Object LastWriteTime -Descending | Select-Object -First 5
```

## Legacy GIF demos (unchanged)

```powershell
npm run demo:gif -- "Scenario Name"
```

Add `--video-only` to skip GIF generation and keep only the `.webm` for a named scenario.

## Artifact lookup examples

```powershell
# latest production recording
Get-ChildItem tmp/demos/*demo-prod*.webm | Sort-Object LastWriteTime -Descending | Select-Object -First 1

# latest smoke recording
Get-ChildItem tmp/demos/*demo-smoke*.webm | Sort-Object LastWriteTime -Descending | Select-Object -First 1
```

## Troubleshooting

| Symptom | Mitigation |
| --- | --- |
| `playwright-cli` not found | Install or add to `PATH`; verify with `where playwright-cli` (Windows). |
| `npx playwright codegen` says Chromium executable missing | Run `npx playwright install chromium`, then rerun `npm run demo:record:preflight:prod`. |
| Production preflight fails on `DEMO_STORAGE_STATE` | Set `$env:DEMO_STORAGE_STATE="tmp/demos/auth.json"` and regenerate via codegen if needed. |
| Smoke fails on production at `/dashboard` | Use Phase 2 with `DEMO_STORAGE_STATE`, or run smoke against localhost. |
| Persona / Quick Login not found | Ensure dev server uses auth page with test personas; increase timeouts in `demo-gif.mjs` if needed. |
| Empty or tiny `.webm` | Ensure `video-stop` runs (script `finally` block); delete partial file and retry. |

## Backout

Revert `package.json` demo scripts and restore prior `scripts/demo-gif.mjs` behavior from git history if recording changes destabilize local demos.
