# Archived Migrations

This folder contains 143 historical migrations that have been squashed into the baseline migration (`supabase/migrations/20260114000000_baseline.sql`).

## Why Archived?

These migrations were archived on 2026-01-14 to:
- Speed up `supabase db reset` and CI pipelines (new environments now apply a single baseline instead of 143 incremental migrations)
- Reduce noise from "fix-on-fix" migrations (e.g., the 20251030 PM/RLS debug storm)

## When to Use These Files

- **Forensics**: If you need to understand the evolution of a specific table, function, or policy
- **Debugging**: If you encounter schema differences between environments and need to trace the root cause
- **History**: These files remain in git history even if removed from this folder

## Important Notes

1. **Do NOT re-apply these migrations** to any environment that has already run them (production, staging, existing dev DBs)
2. **New environments** should only run the baseline + any migrations after 20260114000000
3. If Supabase CLI reports a "migration history mismatch" on an existing environment, you may need to:
   - Keep the remote history as-is (don't try to re-sync)
   - OR use `supabase db push` with care
