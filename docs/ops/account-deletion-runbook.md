# Account Deletion Operator Runbook

Columbia Cloudworks LLC — EquipQR internal operations guide for hybrid self-service account deletion.

## What self-service deletion does

When a user deletes their account from **Settings → Danger Zone → Delete account**:

1. `preview_account_deletion` runs a read-only eligibility check.
2. If eligible, the `delete-account` Edge Function runs `prepare_account_deletion`, storage cleanup, and `auth.admin.deleteUser`.
3. A linked `dsr_requests` row (`request_type = deletion`) records receipts in `dsr_request_events`.

Personal data removed or redacted includes profile email/avatar, notification preferences, OAuth sessions, dashboard preferences, export rate-limit logs, and the Auth identity.

## What is preserved for organizations

Organization-owned evidence is **not** deleted because a user leaves:

- Work orders, notes, PM history, inventory records, audit log rows
- Work-order and equipment-note photos (storage objects stay; `storage.objects.owner_id` is cleared so Auth deletion is not blocked)
- Denormalized display names (`*_name` columns, `audit_log.actor_name`)

Personal email is redacted from audit/DSR actor fields where applicable.

## Why work-order/equipment photos are not blindly deleted

Object paths often start with `{userId}/...` but the files belong to the organization's work order or equipment record. Deleting by user prefix would destroy customer evidence. The flow preserves bytes and clears Storage ownership metadata instead.

## Blocker meanings

| Code | Meaning | Operator next step |
|------|---------|-------------------|
| `sole_owner_of_shared_org` | User owns a non-personal org with other members or operational data | User must transfer ownership or delete the org from org settings first |
| `pending_ownership_transfer` | Pending `ownership_transfer_requests` row | Wait for accept/reject/cancel/expiry |
| `pending_workspace_merge` | Workspace personal-org merge in flight | Complete or cancel merge request |
| `missing_attribution_snapshot` | Required `*_name` schema columns missing | Engineering migration gap — do not force Auth delete |
| `auth_fk_blocker` | Legacy RESTRICT FK still blocking (pre-migration environments) | Run latest migrations; rerun preview |
| `unclassified_storage` | User owns marketing bucket objects | Manual storage review |
| `manual_review_required` | Account already tombstoned or policy requires review | Use DSR cockpit |

## Manual review / blocked self-service

When preview returns blockers, the Edge Function upserts a `dsr_requests` deletion case (`status = received`). Operators use the existing DSR admin workflow (`manage-dsr-request`) after the user resolves blockers or when policy requires human verification.

Admin SQL fulfillment (`fulfill_dsr_deletion`) runs `prepare_account_deletion` and fixes `export_request_log` cleanup. It does **not** delete the Auth user or Storage bytes — complete those via `delete-account` retry or manual steps below.

## Retry a failed storage or Auth step

1. Inspect latest `dsr_request_events` for the case (`domain = storage` or `domain = auth`).
2. If SQL prep succeeded but storage failed, rerun storage cleanup:
   - Call `apply_account_deletion_storage_metadata(user_id)` (service role)
   - Remove paths returned in `delete_paths` via Storage API (`user-avatars` only for personal deletes)
3. If storage succeeded but Auth failed, verify no `storage.objects.owner_id = user_id` rows remain, then call `auth.admin.deleteUser`.
4. Append a new `dsr_request_events` receipt documenting the retry outcome.

## Evidence locations

- `public.dsr_requests` — case status, requester identity, verification method
- `public.dsr_request_events` — append-only fulfillment receipts (immutable)
- `public.audit_log` — organization-scoped actions with preserved `actor_name`
- `public.profiles.deleted_at` — tombstone timestamp after SQL prep (profile row may be removed when Auth user is deleted)

## Related endpoints

- Edge Function: `delete-account` (self-service orchestration)
- Edge Function: `manage-dsr-request` action `fulfill_deletion` (admin SQL fulfillment)
- RPC: `preview_account_deletion`, `prepare_account_deletion`, `apply_account_deletion_storage_metadata`
