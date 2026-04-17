# Demo System v2 Runbook

Demo System v2 is a scenario-driven recording platform designed for customer-ready demonstrations with predictable outputs, diagnostics, and quality gates.

## Architecture

- Scenario registry: `scripts/demo-scenarios.v2.json`
- Scenario/schema engine: `scripts/lib/demoScenarioEngine.mjs`
- Macro expansion: `scripts/lib/demoStepMacros.mjs`
- Action primitives + execution: `scripts/lib/demoStepRunner.mjs`
- Orchestrator entrypoint: `scripts/demo-record-v2.mjs`
- Diagnostics + metadata sidecars: `scripts/lib/demoDiagnostics.mjs`
- Quality gates: `scripts/lib/demoQualityGate.mjs`
- Optional composition: `scripts/lib/demoComposer.mjs`

## Canonical Artifact Contract

- Final scenario videos are still written to `tmp/demos`.
- Final filenames stay canonical:
  - `YYYYMMDD-HHmmss-<flow>[-runNN].webm`
- Sidecars are deterministic:
  - metadata: same basename with `.metadata.json`
  - diagnostics: same basename with `.diagnostics.json`
  - per-scene metadata: same basename with `.scene-<sceneId>.metadata.json`

## Operator Commands (PowerShell)

```powershell
# List available v2 scenarios
npm run demo:v2:list

# Run one scenario locally
npm run demo:v2:run -- --scenario=executive-overview --base-url=http://localhost:8080

# Run one scenario in production mode (strict preflight + storage-state required)
$env:DEMO_BASE_URL="https://equipqr.app"
$env:DEMO_STORAGE_STATE="tmp/demos/auth.json"
npm run demo:v2:run:prod -- --scenario=executive-overview

# Run default core suite
npm run demo:v2:suite

# Reliability loop for one scenario
npm run demo:v2:reliability:scenario -- --scenario=work-order-lifecycle --runs=3

# Reliability loop for suite
npm run demo:v2:reliability:suite -- --suite=core --runs=2

# Dry-run planning mode (no browser actions)
npm run demo:v2:dry-run -- --suite=core

# Capture scene clips and compose intro/outro (when ffmpeg is present)
npm run demo:v2:compose:on -- --scenario=executive-overview

# Force composition off
npm run demo:v2:compose:off -- --scenario=executive-overview
```

## Scenario Authoring Guide

1. Open `scripts/demo-scenarios.v2.json`.
2. Add a new scenario object under `scenarios` with:
   - `id`, `title`, `description`, `flowToken`
   - `targetDurationMs.min/max`
   - `scenes[]` with each scene containing `id`, `title`, `route`, `intent`, and `steps`
3. Add required checkpoints per scene (`urlIncludes` or `textVisible`) for quality gates.
4. Reuse macros (`openNav`, `filterList`, `openDetails`, `returnDashboard`) wherever possible.
5. Validate with dry-run:
   - `npm run demo:v2:dry-run -- --scenario=<new-scenario-id>`
6. Run one local execution and verify output sidecars in `tmp/demos`.

## Action Primitive Reference

- `navigateWithWait`: route navigation with bounded post-nav stabilization.
- `clickRole`: role/name click strategy with explicit fallback logging.
- `clickText`: text-driven click with bounded retries/backoff.
- `fillRole`: label-first input fill with fallback selectors.
- `selectOption`: select value assignment for `<select>` controls.
- `openDrawer` / `openMenu` / `openDialog`: safe open actions.
- `safeClose`: escape-first close, then close-button fallback.
- `scrollSection`: smooth scrolling for recording readability.
- `focusElement`: explicit focus control before typing.
- `hoverReveal`: hover behavior for hidden/revealed controls.
- `waitForNetworkIdle`: bounded wait window.
- `pauseReadable`: bounded human-visible pauses.

## Reliability and Quality Gates

Quality gates fail a run when any of the following are true:

- total duration below scenario minimum (`MIN_DURATION_NOT_MET`)
- insufficient action activity (`LOW_ACTIVITY`)
- required checkpoints missing (`CHECKPOINTS_MISSING`)

Failure does not destroy artifacts. Videos and JSON sidecars are preserved for diagnosis.

## Production Auth and State Workflow

1. Install Chromium if needed:
   - `npx playwright install chromium`
2. Save storage once:
   - `npx playwright codegen https://equipqr.app --save-storage=tmp/demos/auth.json`
3. Set environment in PowerShell:
   - `$env:DEMO_BASE_URL="https://equipqr.app"`
   - `$env:DEMO_STORAGE_STATE="tmp/demos/auth.json"`
4. Run production scenario:
   - `npm run demo:v2:run:prod -- --scenario=executive-overview`

## Troubleshooting Playbook

- Missing browsers:
  - Run `npx playwright install chromium`
- Missing storage state for prod:
  - Set `$env:DEMO_STORAGE_STATE` to an existing file.
- Flaky selectors:
  - Inspect `.diagnostics.json` for `selectorFallbacks` and `retries`.
- Artifact lookup:
  - `Get-ChildItem tmp/demos/*.webm | Sort-Object LastWriteTime -Descending | Select-Object -First 10`
- Composition skipped:
  - Verify ffmpeg availability with `where ffmpeg`; if unavailable, runs still succeed without composed output.

## Add a New Demo in < 10 Minutes

1. Copy one scenario in `scripts/demo-scenarios.v2.json`.
2. Update IDs/titles/routes/intents.
3. Replace hand-authored steps with macros where possible.
4. Add at least one required checkpoint per scene.
5. `npm run demo:v2:dry-run -- --scenario=<id>`
6. `npm run demo:v2:run -- --scenario=<id>`
7. Confirm `tmp/demos` has `.webm`, `.metadata.json`, and `.diagnostics.json`.
