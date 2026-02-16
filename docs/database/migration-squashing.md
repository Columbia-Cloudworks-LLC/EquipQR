# Migration Squashing Guide

This document describes the migration squashing approach and its limitations.

## Why Squash Migrations?

Over time, development produces many small "fix" migrations that slow down:
- Local development setup (`supabase db reset`)
- CI pipelines
- New team member onboarding

A baseline migration can help new environments apply a single SQL file instead of hundreds of incremental migrations.

## Current State

- **Baseline**: `supabase/migrations/20260114000000_baseline.sql` (13,000+ lines)
- **All Historical Migrations**: Kept in `supabase/migrations/` alongside the baseline
- **Active**: All migrations remain in the migrations folder

## Important: Why We Don't Archive Migrations

**Do NOT move migrations to an archive folder.** Supabase CLI compares local migrations against the `supabase_migrations` table in remote databases. If historical migrations exist in the remote but not locally, you'll get:

```
Remote migration versions not found in local migrations directory.
```

The baseline migration is useful for:
- **Fresh local resets**: `supabase db reset` applies migrations in order; the baseline provides the starting schema
- **New environments**: A completely new database can use just the baseline

But for **existing production/staging databases**, all historical migrations must remain in the migrations folder.

## Validation Checklist

After any schema changes, verify with:

### 1. Fresh Local Reset

```bash
# Stop any running Supabase instance
npx supabase stop

# Reset and apply all migrations + seeds
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

When ready to create a new baseline (e.g., quarterly):

```bash
# 1. Link to production project
npx supabase link --project-ref <your-project-ref>

# 2. Dump current schema
npx supabase db dump --schema public --file supabase/migrations/<timestamp>_baseline.sql

# 3. Keep ALL migrations in the migrations folder
# Do NOT archive or delete old migrations!

# 4. Validate
npx supabase db reset
```

## Production/Staging Considerations

**Critical**: The baseline is supplementary, not a replacement for historical migrations.

- **Production/Staging**: Their schema is already current via incremental migrations. They ignore the baseline because those version numbers are already recorded.
- **Fresh Databases**: Will apply the baseline first, then any migrations with timestamps after the baseline.
- **Existing Dev DBs**: Keep working normally; migrations are applied incrementally.

## Files Reference

| Path | Purpose |
|------|---------|
| `supabase/migrations/` | All migrations (baseline + historical + new) |
| `supabase/seeds/*.sql` | Seed data for local development |
