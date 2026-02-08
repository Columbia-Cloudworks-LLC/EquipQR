---
name: migration-manager
description: Manages Supabase database migrations, schema linting, and seed resets for EquipQR. Use when the user says "draft migration", "apply local", "reset database", "lint schema", "new migration", "db reset", "seed data", or needs to scaffold, validate, or apply SQL migrations.
---

# Migration Manager

## When to Use

- **Draft Migration** — scaffold a new timestamped SQL file
- **Apply Local** — apply a migration to the local Supabase instance
- **Reset Database** — wipe and re-seed local database in correct order
- **Lint Schema** — check a migration file for forbidden patterns

---

## Commands

> **Windows (PowerShell)** commands are shown first. Bash equivalents are in `scripts/*.sh` for CI/WSL.

### 1. Draft Migration

Scaffold a new migration file with the correct timestamp prefix.

```powershell
.\.cursor\skills\migration-manager\scripts\draft.ps1 <snake_case_name>
```

Example: `.\.cursor\skills\migration-manager\scripts\draft.ps1 add_invoice_status_column`

Creates: `supabase\migrations\YYYYMMDDHHmmss_add_invoice_status_column.sql`

After scaffolding, open the file and write the migration SQL. Follow these rules:

- **Always enable RLS** on new tables: `ALTER TABLE <t> ENABLE ROW LEVEL SECURITY;`
- **Always add at least one RLS policy** for any new table
- **Use `IF NOT EXISTS`** for `CREATE TABLE`, `CREATE INDEX`
- **Use `CREATE OR REPLACE`** for functions and views
- **Wrap destructive operations** (`DROP TABLE`, `DROP COLUMN`) in a transaction with a comment explaining why
- **Never hardcode generated UUIDs** — use subqueries or variables

### 2. Apply Local

Run a specific migration (or all pending) against the local Supabase instance:

```powershell
# Apply all pending migrations
npx supabase db push --local

# Or reset entirely (applies all migrations + seeds)
npx supabase db reset
```

### 3. Reset Database

Full reset with ordered seed application:

```powershell
.\.cursor\skills\migration-manager\scripts\seed.ps1
```

This wraps `supabase db reset` and verifies seed files execute in the correct dependency order:

1. `00_safeguard.sql` — environment check
2. `01_auth_users.sql` — test accounts
3. `02_profiles.sql` — user profiles
4. `03_organizations.sql` → `06_team_members.sql` — org hierarchy
5. `07_equipment.sql` → `16_customers.sql` — domain data
6. `17_*` → `26_*` — PM templates, compatibility rules, load-test data
7. `99_cleanup_trigger_orgs.sql` — removes trigger-created orgs

### 4. Lint Schema

Validate a migration file for common mistakes:

```powershell
python .cursor/skills/migration-manager/scripts/lint.py supabase/migrations/<file>.sql
```

Checks for:
- `CREATE TABLE` without `ENABLE ROW LEVEL SECURITY`
- `CREATE TABLE` without any accompanying RLS policy
- Bare `DROP TABLE` / `DROP COLUMN` without `-- DESTRUCTIVE:` comment
- Missing `IF NOT EXISTS` on `CREATE TABLE`
- Missing `CREATE OR REPLACE` on functions
- Hardcoded UUIDs in INSERT statements
- `SECURITY DEFINER` functions without explicit `SET search_path`

Exit codes: `0` = clean, `1` = warnings found (prints each issue with line number).

---

## Migration Naming Convention

Format: `YYYYMMDDHHmmss_descriptive_snake_case_name.sql`

| Prefix | Meaning |
|--------|---------|
| `add_` | New table, column, or function |
| `fix_` | Bug fix in existing schema |
| `update_` | Modify existing object |
| `drop_` | Remove schema objects (use sparingly) |

Examples from this repo:
- `20260126000000_add_invoice_export_audit_logging.sql`
- `20260125220500_fix_part_lookup_search_path.sql`
- `20260201000000_allow_org_admin_assignee_when_equipment_has_no_team.sql`

---

## Stub Migrations

If a migration's logic is consolidated into another file, leave a stub:

```sql
-- CONSOLIDATED: This migration's logic was folded into
-- <other_migration_file>.sql
--
-- This stub file exists only to satisfy Supabase CLI migration version
-- tracking; it intentionally performs no schema changes.
```

---

## Post-Migration Checklist

After writing a migration, run through:

1. `python .cursor/skills/migration-manager/scripts/lint.py supabase/migrations/<file>.sql`
2. `npx supabase db reset` — verify it applies cleanly
3. Check Supabase security advisors for new warnings
4. Regenerate TypeScript types if schema changed: `npx supabase gen types typescript --local`
