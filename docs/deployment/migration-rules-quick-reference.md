# Database Migration Rules - Quick Reference

## ⚠️ CRITICAL RULES

### 1. Never Rename Applied Migrations
**THE GOLDEN RULE**: Once a migration has been applied to production, its timestamp is **PERMANENT**.

```bash
❌ NEVER DO THIS:
# Migration already applied to production as 20251028012503
mv 20251028012503_my_migration.sql 20250902000000_my_migration.sql

✅ DO THIS INSTEAD:
# Check production first
mcp_supabase_list_migrations(project_id)
# Keep local files matching production timestamps exactly
```

**Why?** Supabase tracks migrations by timestamp. Renaming causes:
- "Remote migration versions not found in local migrations directory" errors
- Deployment failures
- Local/remote database mismatch

### 2. Production is Source of Truth
**Always verify production state before making migration changes:**

```bash
# Step 1: Check production migrations
Use Supabase MCP tools: mcp_supabase_list_migrations

# Step 2: Compare with local
ls supabase/migrations/*.sql | sort

# Step 3: Sync local to match production
# Create placeholders for missing migrations
# Revert any incorrectly renamed files
```

### 3. Migration Naming Format
**Required format:** `YYYYMMDDHHMMSS_descriptive_name.sql`

```bash
✅ Valid:
20251028012503_deprecate_billing.sql
20251027234423_rls_performance_indexes.sql

❌ Invalid:
20251021_part_picker.sql  # Missing time portion
2025-10-28-my-migration.sql  # Wrong separator
my_migration.sql  # No timestamp
```

## 🔧 Common Workflows

### Adding a New Migration

```bash
# 1. Create migration with current timestamp
# Format: YYYYMMDDHHMMSS (year, month, day, hour, minute, second)
touch supabase/migrations/20251028143022_add_new_feature.sql

# 2. Write migration (use IF NOT EXISTS for safety)
# 3. Test locally
supabase db reset

# 4. Validate filename
node scripts/supabase-fix-migrations.mjs

# 5. Deploy to production
# Migration timestamp is now PERMANENT
```

### Fixing Local/Remote Mismatch

```bash
# 1. Check what's in production
mcp_supabase_list_migrations(project_id)

# 2. List local migrations
ls supabase/migrations/*.sql | sort

# 3. For missing migrations (in production, not local):
# Create placeholder file with EXACT production timestamp
echo "-- Migration already applied to production" > \
  supabase/migrations/20251025063611_fix_invitation_access.sql

# 4. For incorrectly renamed files:
# Revert to production timestamp
mv 20250902000000_billing.sql 20251028012503_billing.sql
```

### Handling Migration Order Issues

```bash
# ❌ DON'T: Rename applied migrations
mv 20251028_old.sql 20250901_new.sql

# ✅ DO: For NEW migrations only
# Set correct timestamp BEFORE first deployment

# ✅ DO: For historical issues
# Create new migration or accept the order
# Fresh DB setup may fail, but production works
```

## 🚨 Troubleshooting

### Error: "Remote migration versions not found"
**Cause:** Local migration files don't match production timestamps

**Fix:**
1. Use MCP tools to list production migrations
2. Create/rename local files to match production exactly
3. Never assume local is correct

### Error: Migration fails on `supabase db reset`
**Cause:** Migration references tables before they exist

**Fix:**
- Ensure table creation migrations run first
- Use `CREATE TABLE IF NOT EXISTS`
- Check dependency order

### Error: Invalid migration filename
**Cause:** Filename doesn't match `YYYYMMDDHHMMSS_name.sql` format

**Fix:**
```bash
node scripts/supabase-fix-migrations.mjs
# Follow the output instructions
```

## 📝 Checklist Before Deployment

- [ ] Migration filename matches `YYYYMMDDHHMMSS_description.sql`
- [ ] Used `IF NOT EXISTS` for safe operations
- [ ] Tested with `supabase db reset` locally
- [ ] Validated with `node scripts/supabase-fix-migrations.mjs`
- [ ] Checked production state with MCP tools
- [ ] Verified migration is idempotent (can run multiple times)
- [ ] Added RLS policies if creating new tables
- [ ] Updated TypeScript types if needed

## 🎯 Remember

1. **Production timestamp = PERMANENT** - Never rename after deployment
2. **Production = Source of Truth** - Always check before making changes
3. **MCP Tools = Your Friend** - Use them to verify production state
4. **Placeholders Work** - Create empty files to match production timestamps
5. **Fresh DB ≠ Production** - Historical order issues are okay if production works

## 📚 Full Documentation

See `docs/deployment/database-migrations.md` for complete details.

