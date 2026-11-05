# Disaster Recovery Plan

This document outlines the disaster recovery procedures for EquipQR™, including how to restore the Supabase database from backups and point-in-time recovery (PITR).

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Backup Types](#backup-types)
- [Recovery Procedures](#recovery-procedures)
  - [Point-in-Time Recovery (PITR)](#point-in-time-recovery-pitr)
  - [Daily Backup Restoration](#daily-backup-restoration)
- [Step-by-Step Recovery Guide](#step-by-step-recovery-guide)
- [Post-Recovery Checklist](#post-recovery-checklist)
- [Logical backup and restore (pg_dump)](#logical-backup-and-restore-pg_dump)
- [Testing the Recovery Plan](#testing-the-recovery-plan)
- [Contact and Escalation](#contact-and-escalation)

---

## Overview

EquipQR™ uses Supabase as its backend platform, which provides robust backup and recovery capabilities:

| Environment | Project Ref | Purpose |
|-------------|-------------|---------|
| **Production** | `ymxkzronkhwxzcdcbnwq` | Live production database (also serves cloud preview via `supabase.equipqr.app`) |
| **Legacy preview branch** | `olsdirkvvfegvclbpgrg` | **Retiring (#1033)** — decommission after cutover validation |

### Recovery Time Objective (RTO)

- **Target**: < 1 hour for critical data restoration
- **Actual**: Depends on database size and restoration method

### Recovery Point Objective (RPO)

- **With PITR enabled**: Seconds (near-zero data loss)
- **With Daily Backups only**: Up to 24 hours of data loss

---

## Prerequisites

Before performing any recovery operation, ensure you have:

### 1. Access Token

Generate a Supabase access token from the dashboard:

1. Go to [https://supabase.com/dashboard/account/tokens](https://supabase.com/dashboard/account/tokens)
2. Click **Generate new token**
3. Copy and store securely

### 2. Required Permissions

- **Organization Owner** or **Admin** role in Supabase
- Access to the Supabase Dashboard
- API access with `database:write` OAuth scope

### 3. Environment Variables

Set these environment variables before running recovery commands:

```bash
# For Production
export SUPABASE_ACCESS_TOKEN="your-access-token"
export PROJECT_REF="ymxkzronkhwxzcdcbnwq"

# For Staging (if recovering staging environment)
# export PROJECT_REF="olsdirkvvfegvclbpgrg"
```

### 4. Communication Plan

Before starting recovery:
- [ ] Notify stakeholders of expected downtime
- [ ] Post status update on company communication channels
- [ ] Prepare incident report template

---

## Backup Types

### Daily Backups (All Plans)

- **Frequency**: Once per day
- **Retention**: 7 days (varies by plan)
- **Type**: Logical backup (SQL dump)
- **Best for**: General disaster recovery, data corruption within 24+ hours

### Point-in-Time Recovery (PITR)

- **Availability**: Pro, Team, and Enterprise plans
- **Granularity**: Second-level precision
- **Retention**: Configurable (7-30 days typical)
- **Type**: Physical backup with WAL (Write-Ahead Logging)
- **Best for**: Recovering from recent incidents, accidental deletions, data corruption

> **Note**: When PITR is enabled, daily backups are automatically disabled as PITR provides finer granularity.

---

## Recovery Procedures

### Check Current Backup Status

Before recovering, verify available backups:

```bash
# List all available backups
curl -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  "https://api.supabase.com/v1/projects/$PROJECT_REF/database/backups"
```

**Example Response:**

```json
{
  "region": "us-east-1",
  "walg_enabled": true,
  "pitr_enabled": true,
  "backups": [
    {
      "is_physical_backup": true,
      "status": "COMPLETED",
      "inserted_at": "2026-01-13T00:00:00Z"
    }
  ],
  "physical_backup_data": {
    "earliest_physical_backup_date_unix": 1736640000,
    "latest_physical_backup_date_unix": 1736726400
  }
}
```

**Key Fields:**
- `pitr_enabled`: Whether PITR is available
- `earliest_physical_backup_date_unix`: Oldest point you can restore to
- `latest_physical_backup_date_unix`: Most recent restore point

---

## Point-in-Time Recovery (PITR)

PITR allows you to restore your database to any specific point in time within the retention window.

### When to Use PITR

- Accidental data deletion (e.g., `DELETE` without `WHERE` clause)
- Data corruption from a faulty migration
- Recovering from a specific incident with known timestamp
- Rolling back a bad deployment

### Step 1: Determine the Recovery Timestamp

Convert your target recovery time to a Unix timestamp.

**Option A: Using PowerShell (Windows)**

See the current [Bash workflow commands](https://github.com/Columbia-Cloudworks-LLC/EquipQR/blob/preview/docs/ops/linux-workflows.md) for this operation.

**Option B: Using Bash (Linux/Mac)**

```bash
# Convert a specific date/time to Unix timestamp
# Example: January 13, 2026 at 2:30:00 PM UTC
date -d "2026-01-13T14:30:00Z" +%s
```

**Option C: Online Converter**

Use [https://www.epochconverter.com/](https://www.epochconverter.com/) to convert human-readable dates to Unix timestamps.

### Step 2: Verify Recovery Window

Ensure your target timestamp falls within the available recovery window:

```bash
curl -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  "https://api.supabase.com/v1/projects/$PROJECT_REF/database/backups"
```

Check that your `recovery_time_target_unix` is:
- **Greater than** `earliest_physical_backup_date_unix`
- **Less than or equal to** `latest_physical_backup_date_unix`

### Step 3: Prepare for Downtime

> ⚠️ **CRITICAL**: The project will be **inaccessible** during the restoration process.

Before proceeding:
- [ ] Notify all users of maintenance window
- [ ] Stop all scheduled jobs and cron tasks
- [ ] Document current edge function states
- [ ] If using custom replication slots, drop them (Realtime is handled automatically)

### Step 4: Execute PITR Restoration

```bash
# Set your recovery timestamp (in seconds since Unix epoch)
RECOVERY_TIMESTAMP="1736776200"  # Replace with your target timestamp

# Execute the restoration
curl -X POST "https://api.supabase.com/v1/projects/$PROJECT_REF/database/backups/restore-pitr" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"recovery_time_target_unix\": \"$RECOVERY_TIMESTAMP\"
  }"
```

**Expected Response:**

```json
{
  "status": "initiated",
  "message": "PITR restoration has been initiated"
}
```

### Step 5: Monitor Restoration Progress

Check the project status in the Supabase Dashboard or via API:

```bash
curl -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  "https://api.supabase.com/v1/projects/$PROJECT_REF"
```

Wait for the status to return to `ACTIVE_HEALTHY`.

---

## Daily Backup Restoration

For projects without PITR, or when restoring from a specific daily backup.

### Step 1: List Available Backups

```bash
curl -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  "https://api.supabase.com/v1/projects/$PROJECT_REF/database/backups"
```

### Step 2: Download Backup File

If the backup includes a `download_url`, you can download it directly:

```bash
# Download the backup file
curl -o backup.sql.zip "DOWNLOAD_URL_FROM_RESPONSE"

# Extract the SQL file
unzip backup.sql.zip
```

### Step 3: Restore via Dashboard

For daily backup restoration, use the Supabase Dashboard:

1. Navigate to **Project Settings** → **Database** → **Backups**
2. Select the backup you want to restore
3. Click **Restore**
4. Confirm the restoration

---

## Step-by-Step Recovery Guide

### Scenario: Accidental Data Deletion

**Situation**: A user accidentally deleted critical equipment records at 2:30 PM UTC.

**Recovery Steps**:

See the current [Bash workflow commands](https://github.com/Columbia-Cloudworks-LLC/EquipQR/blob/preview/docs/ops/linux-workflows.md) for this operation.

### Scenario: Bad Migration Deployment

**Situation**: A migration at 10:00 AM corrupted data. You need to roll back.

**Recovery Steps**:

1. Identify the exact timestamp before the migration was applied
2. Use PITR to restore to 1-2 minutes before that timestamp
3. Fix the migration script
4. Re-apply the corrected migration

```bash
# Restore to 9:58 AM (2 minutes before the bad migration)
RECOVERY_TIMESTAMP=$(date -d "2026-01-13T09:58:00Z" +%s)

curl -X POST "https://api.supabase.com/v1/projects/$PROJECT_REF/database/backups/restore-pitr" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"recovery_time_target_unix\": \"$RECOVERY_TIMESTAMP\"}"
```

---

## Post-Recovery Checklist

After a successful restoration, complete these verification steps:

### Immediate Actions

- [ ] **Verify database connectivity**: Test API endpoints
- [ ] **Check data integrity**: Spot-check critical tables (equipment, work_orders, organizations)
- [ ] **Verify RLS policies**: Ensure Row Level Security is working correctly
- [ ] **Test authentication**: Confirm users can log in

### Application Verification

```bash
# Verify the deep health endpoint (Supabase Edge Function, no auth required)
curl https://supabase.equipqr.app/functions/v1/healthcheck

# Check the public status page for aggregate service health
# https://status.equipqr.app
```

- [ ] **Test critical workflows**:
  - [ ] Create new equipment
  - [ ] Create new work order
  - [ ] Upload images
  - [ ] Real-time updates working

### Edge Functions

- [ ] **Verify Edge Functions are operational**:
  - [ ] `send-invitation-email`
  - [ ] `geocode-location`
  - [ ] `quickbooks-*` functions (if applicable)
  - [ ] `export-report`
  - [ ] `export-work-orders-excel`

### Replication & Subscriptions

- [ ] **Realtime subscriptions**: Test that real-time updates are working
- [ ] **Recreate custom replication slots**: If you had custom slots before recovery

### Documentation

- [ ] **Update incident report**: Document the incident and recovery
- [ ] **Log the recovery**: Record timestamp, method used, and any issues
- [ ] **Notify stakeholders**: Confirm recovery is complete

---

## Logical backup and restore (pg_dump)

Use a logical backup when you need a copy you control: before a risky migration,
to move data to a new instance, or to rehearse recovery locally. Supabase daily
backups and PITR (above) remain the primary recovery path for hosted projects.

A logical backup has three parts. Keep them together:

| File | Command | Why |
| --- | --- | --- |
| `roles.sql` | `pg_dumpall --roles-only --no-role-passwords` | `pg_dump` does not include roles. |
| `<name>.dump` | `pg_dump -Fc -d postgres` (as `supabase_admin`) | Schema, data, grants, default privileges. |
| `manifest.txt` | Row count per table in `public`, `auth`, `storage` | Proves the restore is complete. |

### Restore into a fresh Supabase Postgres instance

1. Start the target from the same `supabase/postgres` image version as the source.
2. Apply roles: `psql -f roles.sql`. "Role already exists" errors are expected.
3. **Clear the image's default privileges on `public` before restoring.** The
   Supabase image grants `anon`, `authenticated` and `service_role` default
   privileges on every new function, table and sequence in `public`. `pg_dump`
   records grants relative to Postgres built-in defaults, so it never emits the
   `REVOKE ... FROM anon` that our migrations applied. Skip this step and every
   restored function becomes executable by `anon`. In the 2026-11-05 drill, 288
   functions became executable by `anon` against an expected 3.

   ```sql
   DO $$
   DECLARE r text;
   BEGIN
     FOREACH r IN ARRAY ARRAY['postgres', 'supabase_admin'] LOOP
       EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM anon, authenticated, service_role', r);
       EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated, service_role', r);
       EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated, service_role', r);
     END LOOP;
   END $$;
   ```

   The dump's own `ALTER DEFAULT PRIVILEGES` entries restore the source's real
   defaults at the end of `pg_restore`.

4. Restore: `pg_restore -U supabase_admin -d postgres --clean --if-exists <name>.dump`.
   Expect three harmless errors: `graphql_public` already exists (two), and
   ownership of the `stripe_wrapper` foreign-data wrapper cannot change.
5. Roll forward any migrations newer than the backup:
   `npx supabase migration up --db-url "postgresql://postgres:<password>@<host>:<port>/postgres?sslmode=disable"`.
   The CLI records each file's version, so later deploys skip them.

`pg_cron` lives in one database per cluster. Restoring into a database other than
`postgres` drops the `cron` schema and its jobs.

### Verify the restore

- Row counts match `manifest.txt` exactly.
- `anon` can execute the same public functions as the source (3 today):

  ```sql
  SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND has_function_privilege('anon', p.oid, 'EXECUTE');
  ```

- Every `supabase/tests/*.sql` pgTAP file passes (pgTAP must be installed in `extensions`).
- `supabase_migrations.schema_migrations` lists the same latest version as the source.

---

## Testing the Recovery Plan

### Quarterly DR Testing

Perform disaster recovery tests quarterly using the **staging environment**:

```bash
# Use staging project for DR testing
export PROJECT_REF="olsdirkvvfegvclbpgrg"

# Run full recovery test
# Document time taken and any issues encountered
```

### Test Checklist

- [ ] Access token generation works
- [ ] Backup listing API returns valid data
- [ ] PITR timestamp conversion is accurate
- [ ] Recovery command executes successfully
- [ ] Post-recovery verification passes

### Document Results

After each test, update this section with:
- Date of test
- Time to complete recovery
- Issues encountered
- Improvements identified

#### 2026-11-05: local logical restore drill

- **Scope:** `pg_dump` of the local stack, restored into a fresh
  `supabase/postgres:17.6.1.165` container, then rolled forward with migration
  `20261105043341_remove_work_orders_team_id.sql`.
- **Time:** dump under 10 s; `pg_restore` 7 s (2.3 MB, 116 tables); roll-forward under 10 s.
- **Result:** row counts identical on all 116 tables; 695/695 pgTAP assertions pass after roll-forward.
- **Issue found:** restoring over the image-initialized `postgres` database made
  288 public functions executable by `anon` (expected 3). Fixed by step 3 of the
  restore procedure; ACLs then matched a clean restore exactly.
- **Not covered:** hosted daily backup and PITR restores. The quarterly test
  above still names the decommissioned staging project `olsdirkvvfegvclbpgrg`.

---

## Contact and Escalation

### Internal Contacts

| Role | Contact | Responsibility |
|------|---------|----------------|
| **Database Admin** | [TBD] | Execute recovery procedures |
| **DevOps Lead** | [TBD] | Coordinate recovery efforts |
| **Product Owner** | [TBD] | Stakeholder communication |

### Supabase Support

- **Dashboard**: [https://supabase.com/dashboard/support](https://supabase.com/dashboard/support)
- **Documentation**: [https://supabase.com/docs](https://supabase.com/docs)
- **Status Page**: [https://status.supabase.com](https://status.supabase.com)

### Escalation Path

1. **Level 1**: Attempt recovery using this guide
2. **Level 2**: Contact internal Database Admin
3. **Level 3**: Open Supabase support ticket (Pro/Team/Enterprise plans)
4. **Level 4**: Escalate to Supabase enterprise support (Enterprise plans)

---

## Appendix

### A. Quick Reference Commands

```bash
# Set environment
export SUPABASE_ACCESS_TOKEN="your-token"
export PROJECT_REF="ymxkzronkhwxzcdcbnwq"

# List backups
curl -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  "https://api.supabase.com/v1/projects/$PROJECT_REF/database/backups"

# PITR Restore
curl -X POST "https://api.supabase.com/v1/projects/$PROJECT_REF/database/backups/restore-pitr" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"recovery_time_target_unix": "TIMESTAMP"}'
```

### B. Unix Timestamp Conversion Reference

| Date (UTC) | Unix Timestamp |
|------------|----------------|
| 2026-01-13 00:00:00 | 1736726400 |
| 2026-01-13 12:00:00 | 1736769600 |
| 2026-01-14 00:00:00 | 1736812800 |

### C. Related Documentation

- [Deployment Guide](./deployment.md)
- [Migrations Guide](./migrations.md)
- [Local Supabase Development](./local-supabase-development.md)
- [Supabase Branch Secrets](./supabase-branch-secrets.md)

---

**Last Updated**: January 2026  
**Document Owner**: EquipQR™ DevOps Team  
**Review Frequency**: Quarterly
