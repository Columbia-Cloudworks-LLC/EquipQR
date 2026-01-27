---
applyTo: "supabase/migrations/**/*.sql"
---

# Supabase SQL Migration Standards

## Purpose

Standards for PostgreSQL migrations in the EquipQR Supabase project.
Migrations are **immutable after deployment** - never modify applied migrations.

## What CI Does NOT Check

CI has no SQL-specific linting. All checks below require manual review.

---

## HIGH PRIORITY: Row Level Security

**CRITICAL: Enable RLS on every table immediately after creation.**

- [ ] RLS enabled: `ALTER TABLE "public"."table_name" ENABLE ROW LEVEL SECURITY;`
- [ ] No policies return `true` without explicit justification
- [ ] Policies scope by `organization_id` for multi-tenancy
- [ ] Separate policies for SELECT, INSERT, UPDATE, DELETE

```sql
-- VIOLATION: Public access without justification
CREATE POLICY "public_read" ON "public"."equipment"
  FOR SELECT USING (true);

-- CORRECT: Org-scoped access
CREATE POLICY "org_read" ON "public"."equipment"
  FOR SELECT USING (
    organization_id = get_user_organization_id()
  );
```

---

## HIGH PRIORITY: Idempotency

All migrations MUST be idempotent to prevent errors on re-runs.

```sql
-- Tables: Use IF NOT EXISTS
CREATE TABLE IF NOT EXISTS "public"."equipment" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" text NOT NULL
);

-- Policies: Use DO blocks
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'equipment' 
    AND policyname = 'org_isolation'
  ) THEN
    CREATE POLICY "org_isolation" ON "public"."equipment"
      FOR ALL
      USING (organization_id = (auth.jwt() ->> 'organization_id')::uuid);
  END IF;
END $$;
```

---

## MEDIUM PRIORITY: Keys & Indexes

- [ ] Primary Keys defined (prefer `uuid` with `gen_random_uuid()`)
- [ ] Foreign Keys have explicit constraint names
- [ ] Indexes on foreign keys and frequently queried columns
- [ ] Partial indexes for filtered queries

```sql
-- Index naming: idx_<table>_<column>
CREATE INDEX idx_equipment_organization_id 
  ON "public"."equipment" (organization_id);

-- Foreign key naming: fk_<table>_<referenced>
ALTER TABLE "public"."equipment"
  ADD CONSTRAINT fk_equipment_organization
  FOREIGN KEY (organization_id) REFERENCES organizations(id);
```

---

## MEDIUM PRIORITY: Naming Conventions

- Tables/Columns/Functions: `snake_case`
- Indexes: `idx_<table>_<column>`
- Policies: descriptive (e.g., `org_members_can_read`)
- Triggers: `tr_<table>_<action>`
- Foreign Keys: `fk_<table>_<referenced_table>`

---

## MEDIUM PRIORITY: Data Types

- [ ] `uuid` for primary keys (not serial/bigint)
- [ ] `timestamptz` for timestamps (not `timestamp`)
- [ ] `text` instead of `varchar` unless length limit required
- [ ] `jsonb` for JSON data (not `json`)

```sql
-- AVOID
"created_at" timestamp,
"id" serial PRIMARY KEY,

-- PREFER
"created_at" timestamptz DEFAULT now(),
"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
```

---

## LOW PRIORITY: Documentation

Add SQL comments for complex tables:

```sql
COMMENT ON TABLE "public"."equipment" IS 
  'Physical equipment assets tracked per organization';

COMMENT ON COLUMN "public"."equipment"."qr_code" IS 
  'Unique QR code identifier for mobile scanning';
```

---

## LOW PRIORITY: Reversibility

Include comments describing how to revert:

```sql
-- Revert instructions:
-- DROP INDEX idx_equipment_status;
-- DROP POLICY "equipment_select" ON equipment;
-- DROP TABLE equipment;
```

---

## Reminders

- **Immutability**: Never modify migrations after deployment
- **Testing**: Always test locally before deploying
- **CI/CD**: Deploy via approved pipeline, not local CLI
