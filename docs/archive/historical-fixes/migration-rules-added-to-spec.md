# Migration Rules Added to Project Specification

## Summary

The critical insight "**Never rename migrations after they've been applied to production**" was formally added to the project's rules and specification in response to real production issues.

**Date**: October 2025  
**Status**: Complete ✅

## What Was Added

### 1. Documentation Enhanced
- `docs/deployment/database-migrations.md` - Added critical rules about never renaming migrations
- `docs/deployment/migration-rules-quick-reference.md` - NEW quick reference guide
- `docs/README.md` - Updated navigation with CRITICAL markers

### 2. Key Rules Established
- Production migration timestamps are permanent and immutable
- Always check production state with Supabase MCP tools before changes
- Production is the source of truth, not local files
- Use placeholder files for missing migrations

### 3. AI Memory Created
**Memory ID: 10414170** - Permanent memory ensuring the critical rule is followed

## Real-World Impact

Created in response to actual issues:
1. **Billing migration issue**: Referenced tables before they existed
2. **Attempted fix**: Renamed migrations to earlier timestamps
3. **Result**: Local/remote mismatch, deployment failures
4. **Final fix**: Reverted all renames, created placeholders, synced with production

## Key Takeaway

> **Production migration timestamps are PERMANENT. Once applied, never rename.**

**Last Updated**: October 2025

