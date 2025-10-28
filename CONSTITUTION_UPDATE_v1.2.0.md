# EquipQR Constitution Update: v1.2.0

## Summary

Successfully incorporated critical database migration lessons learned from production incidents into the EquipQR Constitution, upgrading from version 1.1.0 to 1.2.0.

**Update Date**: 2025-10-28  
**Version**: 1.1.0 → 1.2.0 (MINOR)  
**Source**: `MIGRATION_RULES_ADDED_TO_SPEC.md`

## Version Bump Rationale

**MINOR (1.1.0 → 1.2.0)** - Material expansion of governance adding:
- New mandatory section: Database Migration Integrity
- New quality gates: MCP tool verification before migration changes
- Critical workflow rules: Never rename applied migrations
- Based on real production incidents that caused deployment failures

## Changes Made

### 1. Constitution File (`.specify/memory/constitution.md`)

#### Added New Section: Database Migration Integrity (CRITICAL)

**Location**: Development Workflow → Database Migration Integrity

**Key Rules Added**:
- **The Golden Rule**: Once a migration has been applied to production, its timestamp is PERMANENT and IMMUTABLE
- **Migration Format**: `YYYYMMDDHHMMSS_descriptive_name.sql` (mandatory)
- **Never Rename Applied Migrations**: Production timestamps are permanent; renaming causes deployment failures
- **Production is Source of Truth**: Always verify production state before making migration changes
- **MCP Tool Verification**: Use `mcp_supabase_list_migrations` to check production before any migration work
- **Idempotent Operations**: Use `IF NOT EXISTS`, `IF NOT NULL`, etc. for safe repeated execution
- **Local/Remote Sync**: Local migration files MUST match production timestamps exactly

**Migration Workflow Defined**:
1. Before Migration Work: Check production with `mcp_supabase_list_migrations(project_id)`
2. Create Migration: Use current timestamp, never backdate
3. Write Migration: Use idempotent operations (`CREATE TABLE IF NOT EXISTS`)
4. Test Locally: Run `supabase db reset` to verify complete migration chain
5. Validate: Run `node scripts/supabase-fix-migrations.mjs`
6. Deploy: After deployment, timestamp becomes permanent
7. Never Rename: Applied migrations are immutable forever

**Fixing Local/Remote Mismatch**:
- Use MCP tools to list production migrations
- Create placeholder files for missing migrations with exact production timestamps
- Revert any incorrectly renamed files to match production
- Never assume local is correct

**Reference Documentation**: 
- `docs/deployment/migration-rules-quick-reference.md`
- `docs/deployment/database-migrations.md`

#### Updated Pull Request Process

Added migration-specific step:
- **Step 3**: If PR includes migrations, verify production state with MCP tools first
- **Step 4**: Added migration validation check: `node scripts/supabase-fix-migrations.mjs`

#### Updated CI/CD Quality Gates

Added new job: **Migration Integrity Job** (if migrations changed)
- Migration filename validation
- Production state verification via MCP tools
- Local/remote timestamp consistency check
- Migration idempotency verification (contains `IF NOT EXISTS` clauses)
- No renamed migration detection

#### Updated Code Review Requirements

Added migration as primary focus area:
- **Migrations**: Timestamp format, idempotency, RLS policies, production state verification

#### Updated Version Footer

- Version: 1.1.0 → 1.2.0
- Last Amended: 2025-10-25 → 2025-10-28

### 2. Plan Template (`.specify/templates/plan-template.md`)

#### Added to Constitution Check Section

**New subsection**: Database Migration Integrity (if feature includes migrations)

Checklist items added:
- [ ] Migration format: `YYYYMMDDHHMMSS_descriptive_name.sql`
- [ ] Production state verified with `mcp_supabase_list_migrations` before changes
- [ ] No renaming of applied migrations
- [ ] Idempotent operations (`IF NOT EXISTS`, `IF NOT NULL`)
- [ ] Local/remote timestamp sync validated
- [ ] Migration validation script passed: `node scripts/supabase-fix-migrations.mjs`

### 3. Tasks Template (`.specify/templates/tasks-template.md`)

#### Updated Constitution Compliance Section

Added to compliance checklist:
- Migration Integrity: Format `YYYYMMDDHHMMSS_name.sql`, verify production with MCP tools, use idempotent operations, never rename applied migrations

#### Added Migration Task Examples

**New task group**: Migration tasks (if feature includes database changes)

Example tasks added to foundational phase:
- [ ] TXXX Verify production state with `mcp_supabase_list_migrations(project_id)`
- [ ] TXXX Create migration file with format `YYYYMMDDHHMMSS_descriptive_name.sql`
- [ ] TXXX Write idempotent migration (use `IF NOT EXISTS`, `IF NOT NULL`)
- [ ] TXXX Add RLS policies in migration for new tables
- [ ] TXXX Test with `supabase db reset` to verify complete migration chain
- [ ] TXXX Validate with `node scripts/supabase-fix-migrations.mjs`
- [ ] TXXX Update TypeScript types after schema changes

## Real-World Impact

These changes were driven by actual production incidents:

### Incident 1: Billing Migration Order Issue
- **Problem**: Billing migration referenced tables before they existed
- **Attempted Fix**: Renamed migrations to earlier timestamps
- **Result**: Local/remote mismatch, deployment failures

### Incident 2: "Remote Migration Versions Not Found"
- **Problem**: Production had October timestamps, local had renamed January/September timestamps
- **Root Cause**: Migration renaming created mismatch between local and production
- **Impact**: Deployment failures, database sync issues

### Prevention
These constitutional rules now prevent similar incidents by:
- Making migration timestamp immutability explicit and mandatory
- Requiring production verification before migration changes
- Establishing production as source of truth
- Adding quality gates to detect violations early

## Files Modified

1. ✅ `.specify/memory/constitution.md` - Added Database Migration Integrity section
2. ✅ `.specify/templates/plan-template.md` - Added migration checks to Constitution Check
3. ✅ `.specify/templates/tasks-template.md` - Added migration tasks and compliance rules

## Files NOT Requiring Changes

- ⚠️ `.specify/templates/spec-template.md` - No changes needed (edge cases already covered)
- ⚠️ `.specify/templates/commands/README.md` - No changes needed (generic command guidance)

## Validation

- ✅ Constitution version updated: 1.1.0 → 1.2.0
- ✅ Amendment date updated: 2025-10-28
- ✅ Sync impact report updated at top of constitution
- ✅ All dependent templates synchronized
- ✅ Version bump rationale documented
- ✅ Real-world incident references included

## Key Principles Established

1. **Production Timestamps Are Permanent**: Once a migration is applied to production, its timestamp cannot be changed
2. **Production is Source of Truth**: Always verify production state before making migration changes
3. **MCP Tools Are Mandatory**: Use Supabase MCP tools to verify production state
4. **Idempotency is Required**: All migrations must use safe operations that can run multiple times
5. **Local Must Match Production**: Local migration files must exactly match production timestamps

## Next Steps for Team

### For All Developers
1. Read the updated Database Migration Integrity section in the constitution
2. Always use `mcp_supabase_list_migrations` before migration work
3. Never rename migrations after deployment
4. Use `node scripts/supabase-fix-migrations.mjs` to validate

### For Code Reviewers
1. Check migration format: `YYYYMMDDHHMMSS_descriptive_name.sql`
2. Verify idempotent operations (`IF NOT EXISTS`, etc.)
3. Confirm production state was verified via MCP tools
4. Validate RLS policies for new tables

### For CI/CD Pipeline
Consider adding Migration Integrity Job to automated checks:
- Migration filename validation
- Production state verification
- Timestamp consistency checks
- Idempotency pattern detection

## Commit Message

```
docs: amend constitution to v1.2.0 (database migration governance)

MINOR version bump adding mandatory Database Migration Integrity
requirements to prevent production incidents.

Key additions:
- Never rename applied migrations (timestamps are permanent)
- Production is source of truth for migration state
- Mandatory MCP tool verification before migration changes
- Idempotent operations requirement
- Migration validation in PR process and quality gates

Based on real production incidents documented in
MIGRATION_RULES_ADDED_TO_SPEC.md where migration renaming
caused deployment failures and database sync issues.

Templates updated:
- plan-template.md: Added migration integrity checks
- tasks-template.md: Added migration validation tasks

Refs: MIGRATION_RULES_ADDED_TO_SPEC.md, Memory ID 10414170
```

## References

- **Constitution**: `.specify/memory/constitution.md` (v1.2.0)
- **Source Document**: `MIGRATION_RULES_ADDED_TO_SPEC.md`
- **Quick Reference**: `docs/deployment/migration-rules-quick-reference.md`
- **Full Guide**: `docs/deployment/database-migrations.md`
- **AI Memory**: ID 10414170 (permanent memory of critical rule)

---

**Version**: 1.2.0 | **Updated**: 2025-10-28 | **Status**: Complete ✅

