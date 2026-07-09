# Async export jobs (#1193)

EquipQR supports an **async export job** path for heavy CSV reports (equipment and work orders) to cut database egress and avoid edge timeouts.

## Flow

1. Client calls `export-report` with `{ async: true }` (default for equipment / work-orders from the Fleet Export Console).
2. Edge function authorizes the user, then calls `enqueue_export_job` which:
   - inserts `export_request_log` (`job_mode=async`, `status=pending`)
   - sends a message on the pgmq `exports` queue
3. Cron invokes `queue-worker`, which drains `exports` then `notifications`.
4. `process-export-job` marks the log `processing`, builds CSV (minimal columns), uploads to the private `export-results` bucket, sets `completed` + signed URL, and inserts an `export_ready` notification.
5. Client polls `get_export_job_status` and downloads via the signed URL. A loading toast stays visible until completion.

## Sync path (backward compatible)

Smaller report types (inventory, scans, operator check-ins, alternate groups) and any call without `async: true` still return CSV bytes in the same HTTP response (`job_mode=sync`).

Equipment / work-order **sync** exports still prefer the DB RPCs `export_equipment_csv_rows` / `export_work_orders_csv_rows` so only requested columns leave Postgres.

## Key objects

| Piece | Role |
| --- | --- |
| `export_request_log` | Job status (`pending` / `processing` / `completed` / `failed`), payload, result path |
| `pgmq.q_exports` | Durable queue |
| `enqueue_export_job` / `get_export_job_status` | Authenticated RPCs |
| `export_*_csv_rows` | SECURITY DEFINER row shaping + RBAC |
| `process-export-job` | Worker edge function |
| `export-results` storage bucket | Private CSV artifacts (signed download) |

## Security

- Enqueue and status RPCs require `auth.uid()` and org membership; equipment export requires org admin.
- Work-order scoped exporters (requestor/viewer) are limited to their team memberships inside the RPC.
- Storage objects are readable only by the owning user path segment; service role writes.
- `queue-worker` / `process-export-job` accept service-role Bearer only.

## Local verification

After `.\dev-start.bat -Force` (applies the migration):

1. Export equipment or work orders from Reports — expect loading toast, then download.
2. Confirm a row in `export_request_log` with `job_mode=async` and `status=completed`.
3. Optionally invoke `queue-worker` with the service role if cron is not running locally.
