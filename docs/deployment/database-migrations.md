# Database Migrations Guide

## Overview

EquipQR uses Supabase for database management with a structured migration system. This guide covers migration best practices, naming conventions, and troubleshooting.

## Migration File Structure

### Naming Convention
Migration files must follow this exact pattern:
```
YYYYMMDDHHMMSS_descriptive_name.sql
```

**Examples:**
- ✅ `20250822120000_add_team_id_to_work_orders.sql`
- ✅ `20250822120100_create_equipment_notes_table.sql`
- ❌ `20250822120000-.sql` (invalid: missing name)
- ❌ `20250822-120000-add-feature.sql` (invalid: uses dashes)

### File Organization
```
supabase/migrations/
├── 20250730000100_work_orders_baseline.sql    # Early baseline tables
├── 20250730000200_equipment_baseline.sql      # Core table definitions
├── 20250822120000_add_team_features.sql       # Feature additions
├── 20250822130000_update_rls_policies.sql     # Policy updates
└── 20250822140000_add_indexes.sql             # Performance optimizations
```

## Migration Best Practices

### 1. Never Rename Applied Migrations ⚠️
**CRITICAL RULE**: Once a migration has been applied to production, NEVER rename or change its timestamp.

- Production migration timestamps are permanent and immutable
- Renaming creates a mismatch between local and remote databases
- Supabase will report "Remote migration versions not found in local migrations directory"
- **Always check production migrations before renaming** using Supabase MCP tools:
  ```bash
  # Use mcp_supabase_list_migrations to see production state
  ```

**If you need to fix migration order:**
- ✅ For NEW migrations: Set correct timestamp before first deployment
- ✅ For historical issues: Create placeholder files matching production timestamps
- ❌ Never rename migrations already applied to production

### 2. Baseline-First Rule
Critical tables like `work_orders`, `equipment`, and `organizations` must have baseline `CREATE TABLE` migrations that run early in the sequence. This ensures `supabase db reset` works correctly.

### 3. Idempotent Operations
Always use safe operations that won't fail if run multiple times:
```sql
-- ✅ Safe operations
CREATE TABLE IF NOT EXISTS public.example_table (...);
ALTER TABLE public.example_table ADD COLUMN IF NOT EXISTS new_column text;
CREATE INDEX IF NOT EXISTS idx_example ON public.example_table(column_name);

-- ❌ Unsafe operations
CREATE TABLE public.example_table (...);  -- Fails if table exists
ALTER TABLE public.example_table ADD COLUMN new_column text;  -- Fails if column exists
```

### 4. Production is Source of Truth
**Always verify production state before making migration changes:**

```bash
# Check what migrations are applied in production
# Use Supabase MCP tools: mcp_supabase_list_migrations

# Compare with local migrations
ls supabase/migrations/*.sql

# Create placeholder files for any missing migrations
# Match production timestamps exactly
```

**If local and remote are out of sync:**
1. Use MCP tools to list production migrations
2. Create placeholder files for any missing locally
3. Revert any incorrectly renamed migrations to match production
4. Never assume local is correct - production is the source of truth

### 5. Row Level Security (RLS)
Always enable RLS on new tables and create appropriate policies:
```sql
-- Enable RLS
ALTER TABLE public.new_table ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own data" 
ON public.new_table 
FOR SELECT 
USING (user_id = auth.uid());
```

### 6. Constraints and Validation
Use validation triggers instead of CHECK constraints for time-based validations:
```sql
-- ❌ Avoid CHECK constraints with time functions
ALTER TABLE public.invitations 
ADD CONSTRAINT expires_future CHECK (expires_at > now());

-- ✅ Use validation triggers instead
CREATE OR REPLACE FUNCTION validate_expiration()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.expires_at <= now() THEN
    RAISE EXCEPTION 'Expiration date must be in the future';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_invitation_expiration
  BEFORE INSERT OR UPDATE ON public.invitations
  FOR EACH ROW EXECUTE FUNCTION validate_expiration();
```

## Local Development

### Running Migrations
```bash
# Apply all pending migrations
supabase db push

# Reset database to clean state and apply all migrations
supabase db reset

# Generate types after migrations
supabase gen types typescript --local > src/integrations/supabase/types.ts
```

### Testing Migrations
Before pushing to production, always test the complete migration chain:
```bash
# Test complete database reset
supabase db reset

# Verify all tables and policies exist
supabase db diff
```

### Migration Validation Script
Use the project's migration fix script to validate filenames:
```bash
# Check and fix migration filenames
node scripts/supabase-fix-migrations.mjs
```

## Common Migration Patterns

### Adding New Table
```sql
-- Create table with proper defaults
CREATE TABLE IF NOT EXISTS public.new_feature (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL,
  name text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.new_feature ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Organization members can view features" 
ON public.new_feature 
FOR SELECT 
USING (organization_id IN (
  SELECT organization_id FROM organization_members 
  WHERE user_id = auth.uid() AND status = 'active'
));

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_new_feature_org_id ON public.new_feature(organization_id);

-- Create updated_at trigger
CREATE TRIGGER update_new_feature_updated_at
  BEFORE UPDATE ON public.new_feature
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
```

### Adding Column to Existing Table
```sql
-- Add column safely
ALTER TABLE public.existing_table 
ADD COLUMN IF NOT EXISTS new_column text DEFAULT 'default_value';

-- Add index if needed
CREATE INDEX IF NOT EXISTS idx_existing_table_new_column 
ON public.existing_table(new_column);

-- Update RLS policies if needed
DROP POLICY IF EXISTS "old_policy_name" ON public.existing_table;
CREATE POLICY "updated_policy_name"
ON public.existing_table
FOR SELECT
USING (organization_id IN (
  SELECT organization_id FROM organization_members 
  WHERE user_id = auth.uid() AND status = 'active'
));
```

### Creating Database Functions
```sql
CREATE OR REPLACE FUNCTION public.calculate_something(param_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result jsonb;
BEGIN
  -- Function logic here
  SELECT jsonb_build_object('success', true) INTO result;
  RETURN result;
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
```

## Troubleshooting

### Common Issues

#### 1. Remote Migration Versions Not Found
**Problem:** "Remote migration versions not found in local migrations directory"
**Cause:** Local migration files renamed/missing while production has different versions.
**Solution:** 
- Use Supabase MCP tools to list production migrations
- Create placeholder files matching production timestamps exactly
- Revert any renamed migrations to match production
- Never rename migrations after they've been applied to production

#### 2. Migration Fails on `db reset`
**Problem:** `ALTER TABLE` statements fail because base table doesn't exist.
**Solution:** Ensure baseline `CREATE TABLE` migrations exist early in the sequence.

#### 3. Invalid Migration Filenames
**Problem:** Files named `-.sql` or with dashes get skipped.
**Solution:** Run `node scripts/supabase-fix-migrations.mjs` to normalize names.

#### 4. Constraint Violations
**Problem:** CHECK constraints with `now()` cause restoration failures.
**Solution:** Replace with validation triggers.

#### 5. RLS Policy Conflicts
**Problem:** Duplicate or conflicting policies prevent table access.
**Solution:** Use `DROP POLICY IF EXISTS` before creating new policies.

### Debugging Commands
```bash
# Check local migration status
supabase migration list

# Check production migrations (use Supabase MCP tools)
# mcp_supabase_list_migrations with project_id

# Compare local vs remote
ls supabase/migrations/*.sql | sort

# View specific migration
cat supabase/migrations/20250822120000_migration_name.sql

# Check database schema
supabase db diff

# Inspect table structure
supabase db shell
\d+ table_name

# Validate migration filenames
node scripts/supabase-fix-migrations.mjs
```

### Emergency Recovery
If migrations are severely broken:
1. Backup any important data
2. Run `supabase db reset` to start fresh
3. Fix migration files using the naming conventions
4. Re-run `supabase db push`
5. Restore data if needed

## CI/CD Integration

### GitHub Actions
The project includes automated migration validation in CI. Migrations are tested in the `test` job but not automatically applied to production.

### Production Deployment
Always test migrations in staging before production:
1. Deploy to staging environment
2. Run `supabase db push` on staging
3. Verify functionality
4. Deploy to production
5. Run `supabase db push` on production

## Security Considerations

### RLS Policies
- Always enable RLS on tables containing user data
- Test policies thoroughly with different user scenarios
- Use security definer functions for complex access patterns

### Data Migration
- Never include sensitive data in migration files
- Use environment variables for configuration values
- Audit all migration files before deployment

This guide ensures reliable database migrations and helps prevent the common issues that cause CI failures.