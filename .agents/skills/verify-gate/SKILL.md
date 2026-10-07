---
name: verify-gate
description: Run deterministic verification commands across TypeScript, linting, Vitest tests, and Supabase Edge Functions before committing or opening PRs.
---

# Verify Gate

Use this skill to deterministically verify code quality and prevent regressions in EquipQR.

## Verification Commands

Always run these commands in the canonical Ubuntu WSL2 environment (`/home/viralarchitect/projects/EquipQR`):

### 1. TypeScript & Lint
```bash
# Frontend TypeScript check
npx tsc --noEmit

# ESLint check
npm run lint

# Check markdown links in docs and AGENTS.md
npm run verify:docs-index
```

### 2. Frontend Unit & Component Tests
```bash
# Run Vitest test suite
npm test

# Run a specific test file
npm test -- src/path/to/file.test.ts
```

### 3. Supabase Edge Functions (Deno)
```bash
# Type-check edge function entrypoints
deno check --config supabase/functions/deno.json supabase/functions/*/index.ts

# Run Edge Function tests
deno test --config supabase/functions/deno.json --allow-env --allow-net --allow-read supabase/functions/
```

### 4. Schema & Migrations Reference
```bash
# Verify schema reference dump matches latest migration
npm run verify:schema-reference
```

## Quality Rules
1. **Zero `as unknown as`:** Do not bypass TypeScript types. Derive domain models from `Tables<'table_name'>` in `src/integrations/supabase/types.ts`.
2. **Deterministic Checks:** Every change must exit code 0 on `tsc --noEmit` and `npm run lint`.
