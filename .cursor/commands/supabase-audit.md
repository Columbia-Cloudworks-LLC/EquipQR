---
description: "Idempotent verification, log analysis, and self-healing for Supabase state."
triggers: ["/supabase-audit"]
---

# Supabase Audit & Self-Healing Protocol

**Goal:** Ensure Supabase Migrations, Edge Functions, and RLS policies are valid, synchronized, and error-free.
**Philosophy:** Idempotent execution. If a check fails, attempt a fix, and strictly re-verify.

## Phase 1: Context & Remote Diagnostics (MCP)

1. **Fetch Preview Logs:**
    * **Tool Usage:** Use available **Supabase MCP tools** (e.g., `get_project_logs`, `get_deployment_status`) to retrieve the latest build/runtime logs from the `preview` environment.
    * **Analysis:** Parse logs for specific error patterns:
        * `P0001` (Raise Exception)
        * `42P07` (Duplicate Table/Relation)
        * `42501` (RLS Permission Denied)
    * **Constraint:** If logs indicate a specific migration failed, prioritize analyzing that file in Phase 2.

## Phase 2: Migration Integrity (Static Analysis)

1. **Sequence Check:** Scan `supabase/migrations/` for timestamp gaps or ordering conflicts.
2. **Naming Convention:** Verify all files match `YYYYMMDDHHMMSS_description.sql`.
3. **Idempotency Check:** Ensure new migrations contain `IF NOT EXISTS` clauses or proper `DO $$` blocks to prevent errors on re-runs.
    * *Auto-Fix:* Wrap naked `CREATE` statements in safe blocks if missing.

## Phase 3: The Fix Loop (Local Verification)

**Instructions:** Execute the following cycle. If a step fails, apply a fix and **RESTART** the specific verification step.

### Step A: Database & RLS

1. **Action:** Run `supabase test db` (if available) or simulate a schema reset locally.
2. **Verification:**
    * Check that all tables have RLS enabled: `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`.
    * Verify no `service_role` key is used in client-side code (scan `src/`).
3. **Fix Strategy:**
    * *Missing RLS:* Generate an `ALTER TABLE` migration.
    * *Permission Denied:* Review Policies vs. the failing query from Phase 1.

### Step B: Edge Functions

1. **Action:** Run Deno checks.
    * `deno lint supabase/functions`
    * `deno check supabase/functions/**/index.ts`
2. **Verification:** Ensure `import_map.json` resolves correctly and no type errors exist.
3. **Fix Strategy:** Update `import_map.json` or fix TypeScript errors in the function files.

## Phase 4: TypeScript Synchronization

1. **Action:** Generate types to ensure frontend matches backend.
    * `npx supabase gen types typescript --local > src/integrations/supabase/types.ts`
2. **Verification:** Run project type check (`npm run typecheck` or `tsc --noEmit`).
3. **Fix Strategy:** If generated types cause frontend errors, the database schema likely drifted. Fix the schema (migration), NOT the generated types.

## Phase 5: Final Report

Output a summary of the audit:

* **[ ] Migrations:** Verified sequential & idempotent.
* **[ ] RLS:** All tables secured.
* **[ ] Functions:** Deno lint/check passed.
* **[ ] Sync:** Types generated and consistent.
* **[ ] Remote:** Addressed errors found in Preview logs.
