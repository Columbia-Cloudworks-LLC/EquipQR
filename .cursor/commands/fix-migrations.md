# Fix Migration Errors

## Purpose

Debug and fix Supabase migration errors from CI/CD logs. This command helps make migrations idempotent so they can safely run on databases with existing schema objects.

## Workflow Context

**IMPORTANT**: This project uses a CI/CD workflow for database migrations:

1. **Local**: Edit migration files only - do NOT push to remote databases
2. **Preview Branch**: Supabase CI automatically runs migrations on preview database when you push
3. **Main Branch**: Supabase CI runs migrations on production when merged

**DO NOT** run `supabase db push`, `supabase db reset` on remote/linked databases, or any command that modifies remote databases directly. Only fix the local migration files.

## Instructions

When the user provides migration error logs from CI/CD:

1. **Identify the failing migration file** from the error message (e.g., `Applying migration 20260114000000_baseline.sql...`)

2. **Identify the error type** and apply the appropriate fix:

### Common Error Types and Fixes

#### Policy already exists (`SQLSTATE 42710`)

```sql
-- Before
CREATE POLICY "policy_name" ON public.table_name ...

-- After
DROP POLICY IF EXISTS "policy_name" ON public.table_name;
CREATE POLICY "policy_name" ON public.table_name ...
```

#### Constraint already exists (`SQLSTATE 42710` or `42P16`)

```sql
-- Before
ALTER TABLE public.table_name ADD CONSTRAINT "constraint_name" PRIMARY KEY (id);

-- After
DO $$ BEGIN 
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'constraint_name') THEN 
    ALTER TABLE public.table_name ADD CONSTRAINT "constraint_name" PRIMARY KEY (id); 
  END IF; 
END $$;
```

#### Index already exists (`SQLSTATE 42P07`)

```sql
-- Before
CREATE INDEX "index_name" ON public.table_name(column);

-- After
CREATE INDEX IF NOT EXISTS "index_name" ON public.table_name(column);
```

#### Column does not exist for COMMENT (`SQLSTATE 42703`)

```sql
-- Before
COMMENT ON COLUMN public.table_name.column_name IS 'description';

-- After
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'table_name' 
    AND column_name = 'column_name'
  ) THEN
    COMMENT ON COLUMN public.table_name.column_name IS 'description';
  END IF;
END $$;
```

#### Column does not exist (needs to be added)

Create a new migration file with timestamp BEFORE the failing migration:

```sql
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'table_name' 
    AND column_name = 'column_name'
  ) THEN
    ALTER TABLE public.table_name ADD COLUMN column_name data_type;
  END IF;
END $$;
```

1. **Edit only the local migration files** - make the minimal changes needed to fix the error

2. **Inform the user** which files were modified so they can review, commit, and push to trigger CI/CD

## Output Format

After fixing, provide:

- List of files modified
- Summary of changes made
- Remind user to commit and push to preview branch to test the fixes
