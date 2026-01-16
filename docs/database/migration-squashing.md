# Migration Squashing Guide

This document describes the migration squashing process used to maintain a clean, fast-to-apply migration set.

## Why Squash Migrations?

Over time, development produces many small "fix" migrations that slow down:
- Local development setup (`supabase db reset`)
- CI pipelines
- New team member onboarding

By periodically squashing into a baseline, new environments apply a single SQL file instead of hundreds of incremental migrations.

## Current State

- **Baseline**: `supabase/migrations/20260114000000_baseline.sql` (13,000+ lines)
- **Archived**: `supabase/migrations_archive/` (143 historical migrations)
- **Active**: Only migrations after the baseline timestamp

## Validation Checklist

After squashing, verify the baseline is correct:

### 1. Fresh Local Reset

```bash
# Stop any running Supabase instance
npx supabase stop

# Reset and apply baseline + seeds
npx supabase db reset

# Start services
npx supabase start
```

### 2. Schema Verification

```bash
# Verify all tables exist
npx supabase db dump --schema public --data-only | head -50

# Or connect to local DB and run:
# SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
```

### 3. RLS Policy Check

Verify RLS is enabled and policies exist:

```sql
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

### 4. Core RPCs Exist

Verify critical functions are present:

```sql
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_type = 'FUNCTION'
  AND routine_name IN (
    'sync_stripe_subscription_slots',
    'can_user_manage_quickbooks',
    'accept_invitation_atomic',
    'is_org_member'
  );
```

### 5. Seed Data Applied

```sql
SELECT COUNT(*) FROM profiles;
SELECT COUNT(*) FROM organizations;
SELECT COUNT(*) FROM pm_templates;
```

### 6. App Smoke Test

1. Start the app: `npm run dev`
2. Log in with a seed user
3. Navigate to equipment list, work orders, and teams
4. Verify data loads and RLS allows appropriate access

## How to Regenerate the Baseline

When ready to squash again (e.g., quarterly):

```bash
# 1. Link to production project
npx supabase link --project-ref <your-project-ref>

# 2. Dump current schema
npx supabase db dump --schema public --file supabase/migrations/<timestamp>_baseline.sql

# 3. Archive old migrations
mkdir -p supabase/migrations_archive
mv supabase/migrations/2025*.sql supabase/migrations_archive/
# (Keep only the new baseline and any migrations after it)

# 4. Validate (see checklist above)
npx supabase db reset
```

## Production/Staging Considerations

**Critical**: Never re-apply the baseline to environments that have already run the historical migrations.

- **Production/Staging**: Their schema is already current via incremental migrations. The baseline is only for new installs.
- **Existing Dev DBs**: If you've been developing locally, you may see a "migration history mismatch". Options:
  1. Reset your local DB: `npx supabase db reset` (loses local data)
  2. Keep working with your existing DB (no action needed if schema is current)

## Squash Cadence

Recommended: Squash quarterly or after major feature releases that add many migrations.

## Files Reference

| Path | Purpose |
|------|---------|
| `supabase/migrations/` | Active migrations (baseline + new) |
| `supabase/migrations_archive/` | Historical migrations (kept in git) |
| `supabase/seeds/*.sql` | Seed data for local development |
