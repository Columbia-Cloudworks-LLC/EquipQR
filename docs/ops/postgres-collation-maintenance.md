# Postgres Collation Version Maintenance

Operational runbook for Supabase Postgres **collation version mismatch** warnings on production project `ymxkzronkhwxzcdcbnwq`.

Related issue: [#1141](https://github.com/Columbia-Cloudworks-LLC/EquipQR/issues/1141)

## Current production status

- `postgres`: remediated on 2026-07-05 via `ALTER DATABASE postgres REFRESH COLLATION VERSION`.
  Evidence: `datcollversion=153.121`, `actual_version=153.121`; no new `database "postgres" has a collation version mismatch` warning after the refresh.
- `template1`: vendor-owned follow-up. Evidence: `datcollversion=153.120`, `actual_version=153.121`; `ALTER DATABASE template1 REFRESH COLLATION VERSION` failed with `must be owner of database template1`.

## Symptom

Before remediation, Postgres logs emitted warnings on every connection to `postgres`:

```text
database "postgres" has a collation version mismatch
The database was created using collation version 153.120, but the operating system provides version 153.121.
```

Datadog or other observability tools may classify these warnings as errors and depress apparent request success rates even when REST/API traffic returns HTTP 200.

## Validation queries

Check stored vs actual collation versions:

```sql
SELECT datname,
       datcollversion,
       pg_database_collation_actual_version(oid) AS actual_version
FROM pg_database
WHERE datname IN ('postgres', 'template1');
```

List collation-dependent objects that need rebuild before refreshing catalog version (PostgreSQL docs):

```sql
SELECT pg_describe_object(refclassid, refobjid, refobjsubid) AS collation,
       pg_describe_object(classid, objid, objsubid) AS object
FROM pg_depend d
JOIN pg_collation c
  ON refclassid = 'pg_collation'::regclass
 AND refobjid = c.oid
WHERE c.collversion <> pg_collation_actual_version(c.oid)
ORDER BY 1, 2;
```

## Root cause

Supabase upgraded the underlying OS/glibc collation library (153.120 → 153.121) after the database was created. Postgres warns until dependent objects are rebuilt and the catalog version is refreshed.

This is **platform maintenance**, not an application migration. Do **not** encode `ALTER DATABASE ... REFRESH COLLATION VERSION` in repo migrations.

## Approval gate

**Stop and obtain explicit maintainer approval** before running any production REINDEX or `ALTER DATABASE` command. These operations can lock indexes/tables and require a low-traffic window.

Confirm a recent backup exists per [disaster-recovery.md](./disaster-recovery.md) before proceeding.

## Maintenance procedure (production `postgres`)

Run from the Supabase SQL editor or a direct Postgres session with superuser privileges during an approved window.

1. **Snapshot evidence** — record `datcollversion` / `actual_version` and the dependent-object query output above.
2. **Rebuild collation-dependent objects** — for each object returned by the dependent-object query, run the appropriate `REINDEX` (or `REINDEX DATABASE postgres` if the object list is broad and the maintainer accepts the lock scope).
3. **Refresh catalog version** — after rebuild completes:

   ```sql
   ALTER DATABASE postgres REFRESH COLLATION VERSION;
   ```

4. **Verify** — re-run the validation query; `datcollversion` must equal `actual_version` for `postgres`.
5. **Observe logs** — confirm Postgres logs no longer emit collation mismatch warnings for `postgres` on new connections (allow several minutes for log drain).

## template1

Production logs may also warn on `template1`. That database is Supabase-managed. The agent attempted `ALTER DATABASE template1 REFRESH COLLATION VERSION` on 2026-07-05, and Supabase returned:

```text
ERROR: must be owner of database template1
```

Open a Supabase support ticket with project ref `ymxkzronkhwxzcdcbnwq` asking Supabase to refresh the `template1` collation version from `153.120` to `153.121`, or to perform the platform-owned equivalent. Track that vendor-owned residual in [#1143](https://github.com/Columbia-Cloudworks-LLC/EquipQR/issues/1143).

## Separate code fix (issue #1141)

The recurring Postgres **ERROR** `invalid input syntax for type oid: "postgres"` was caused by cron helper functions casting `current_user` (a role name) to `oid`. That is fixed in migration `20260705130000_fix_cron_helper_role_checks.sql` by authorizing via `session_user` and `cron.job_id`, matching `invoke_quickbooks_invoice_status_sync()`.

After that migration deploys, verify queue-worker cron intervals no longer emit the invalid OID error in Supabase Postgres logs.

## Issue closure scope (#1141)

- Cron helper `current_user::oid` cast: fixed in migration `20260705130000_fix_cron_helper_role_checks.sql`.
  Verification: Postgres logs show no `invalid input syntax for type oid: "postgres"` after two cron intervals.
- Collation version mismatch warning: production `postgres` refreshed on 2026-07-05 after the dependent-object query returned no rows.
  Verification: `datcollversion` equals `actual_version`, and `postgres` connection warnings stop.

Track the vendor-owned `template1` residual in [#1143](https://github.com/Columbia-Cloudworks-LLC/EquipQR/issues/1143). Do not encode collation DDL in repo migrations.

## References

- [PostgreSQL ALTER DATABASE … REFRESH COLLATION VERSION](https://www.postgresql.org/docs/current/sql-alterdatabase.html)
- [PostgreSQL collation version notes (ALTER COLLATION)](https://www.postgresql.org/docs/current/sql-altercollation.html)
- [Supabase upgrading guide](https://supabase.com/docs/guides/platform/upgrading)
