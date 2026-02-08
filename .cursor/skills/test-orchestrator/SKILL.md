---
name: test-orchestrator
description: Runs unit tests, integration tests, and debugs failing specs in the EquipQR Vitest suite. Finds related test files for modified source code, parses failures into structured JSON, and drives autonomous fix-retry loops. Use when the user says "run tests", "run unit tests", "run integration tests", "debug spec", "fix failing test", "test this change", or "run related tests".
---

# Test Orchestrator

Orchestrates Vitest test runs for EquipQR. Three capabilities:

1. **Run Unit Tests** — run tests related to changed files
2. **Run Integration Tests** — run journey / integration suites
3. **Debug Spec** — diagnose and fix a failing test autonomously

## Project Test Stack

| Item | Value |
|------|-------|
| Runner | Vitest 3.2.4 via `node scripts/test-runner.mjs` |
| Environment | jsdom, pool: forks |
| Include pattern | `src/**/*.{test,spec}.{ts,tsx}` |
| Path alias | `@/` → `./src/` |
| Setup file | `src/test/setup.ts` |
| Utilities | `src/test/utils/`, `src/test/fixtures/`, `src/test/mocks/` |

> **Windows note**: Always use `node scripts/test-runner.mjs` (not bare `vitest run`) to prevent the process from hanging.

---

## Capability 1: Run Unit Tests

Run tests related to a set of modified source files.

### Quick path (few files)

```powershell
node scripts/test-runner.mjs src/features/equipment/hooks/__tests__/useEquipment.test.ts
```

### Automated discovery

Use the helper script to map changed files to their test files:

```powershell
npx tsx .cursor/skills/test-orchestrator/scripts/run-related.ts <file1> <file2> ...
```

The script:
1. Accepts source file paths as CLI arguments
2. Resolves each to its `*.test.ts(x)` or `*.spec.ts(x)` counterpart
3. Runs only the matched tests via `node scripts/test-runner.mjs`
4. Exits with the vitest exit code

### File-to-test mapping conventions

| Source location | Test location |
|----------------|---------------|
| `src/path/to/file.ts` | `src/path/to/__tests__/file.test.ts` |
| `src/path/to/Component.tsx` | `src/path/to/__tests__/Component.test.tsx` |
| `src/path/to/file.ts` | `src/path/to/file.test.ts` (co-located) |
| `src/path/to/file.ts` | `src/path/to/file.spec.tsx` (co-located) |

If no test file is found for a source file, log a warning and skip it.

### When to use

- After editing source files — run only related tests
- Before committing — verify nothing broke
- When the user says "run tests" or "test this change"

---

## Capability 2: Run Integration Tests

### Journey tests (primary)

```powershell
node scripts/test-runner.mjs src/tests/journeys
```

Journey tests live in `src/tests/journeys/` and exercise full user workflows using persona-based rendering (`src/test/journey/render-journey.tsx`).

### Integration tests

```powershell
node scripts/test-runner.mjs src/tests/integration
```

### Database tests (pgTAP)

```powershell
npm run test:db
```

### Full suite with coverage

```powershell
npm run test:coverage
```

### When to use

- After cross-cutting changes (auth, routing, providers)
- Before creating a PR
- When the user says "run integration tests" or "run journeys"

---

## Capability 3: Debug Spec

Diagnose and fix a failing test through an autonomous retry loop.

### Workflow

```
Task Progress:
- [ ] Step 1: Run the failing test(s)
- [ ] Step 2: Parse failures into JSON
- [ ] Step 3: Read source + test code
- [ ] Step 4: Fix the root cause
- [ ] Step 5: Re-run and verify
- [ ] Step 6: Repeat steps 2-5 until green (max 3 retries)
```

### Step 1: Run the failing test

```powershell
node scripts/test-runner.mjs path/to/failing.test.tsx 2>&1 | Out-File -Encoding utf8 tmp/test-output.txt
```

### Step 2: Parse failures

```powershell
python .cursor/skills/test-orchestrator/scripts/parse-failure.py tmp/test-output.txt
```

Output is a JSON array of failure objects:

```json
[
  {
    "file": "src/features/equipment/hooks/__tests__/useEquipment.test.ts",
    "test": "useEquipment > should return equipment list",
    "error": "expected 3 but received 0",
    "expected": "3",
    "actual": "0",
    "source_line": "expect(result.current.data).toHaveLength(3)",
    "stack_file": "src/features/equipment/hooks/__tests__/useEquipment.test.ts",
    "stack_line": 42
  }
]
```

### Step 3: Read source + test code

Read both the test file and the source file under test. Focus on:
- The failing assertion and what it expects
- Mock setup — are mocks returning correct data?
- Async timing — is `waitFor` / `act` used correctly?
- Import paths — does `@/` alias resolve correctly?

### Step 4: Fix the root cause

Common failure patterns:

| Pattern | Likely cause | Fix |
|---------|-------------|-----|
| `expected X received undefined` | Mock not returning data | Fix mock setup or add missing mock |
| `not wrapped in act(...)` | State update outside act | Wrap in `act()` or use `waitFor()` |
| `Unable to find role` | Component not rendering | Check providers in test, verify render call |
| `Timeout` | Async operation never resolves | Check mock promises, add `vi.useFakeTimers()` |
| `Cannot find module` | Import alias issue | Verify `@/` paths resolve via vitest config |

### Step 5-6: Re-run and verify

Re-run the test. If it still fails, parse again and fix (max 3 retries). If it passes, mark complete.

### When to use

- When a test fails after code changes
- When the user says "debug spec", "fix failing test", or "why is this test failing"
- After the Run Unit Tests capability reports failures

---

## Utility Scripts

### scripts/run-related.ts

Finds test files for modified source files and runs them.

```powershell
npx tsx .cursor/skills/test-orchestrator/scripts/run-related.ts src/hooks/useAuth.ts src/utils/date.ts
```

Execute this script; do not read it as reference.

### scripts/parse-failure.py

Parses Vitest failure output into structured JSON.

```powershell
python .cursor/skills/test-orchestrator/scripts/parse-failure.py tmp/test-output.txt
# or pipe:
type tmp\test-output.txt | python .cursor/skills/test-orchestrator/scripts/parse-failure.py
```

Execute this script; do not read it as reference.
