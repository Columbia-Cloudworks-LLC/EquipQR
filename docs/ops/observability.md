# Observability — Audit Log Routing

> Operational reference for where Google Workspace and Google Cloud audit logs live, how to enable them, and how to query them. Created in response to [issue #629](https://github.com/Columbia-Cloudworks-LLC/EquipQR/issues/629), which surfaced a recurring confusion about Workspace-tier vs. project-tier audit logging.

## Summary

| Audit log family | Tier | Producer | Where to query |
|---|---|---|---|
| Google Cloud Admin Activity (project services) | Project | Cloud-native services on `equipqr-prod` | `gcloud logging read --project=equipqr-prod` against `projects/equipqr-prod/logs/cloudaudit.googleapis.com%2Factivity` |
| Google Cloud Data Access (project services) | Project | Cloud-native services on `equipqr-prod`, **only when enabled** via project `auditConfigs` | `gcloud logging read --project=equipqr-prod` against `projects/equipqr-prod/logs/cloudaudit.googleapis.com%2Fdata_access` |
| **Google Workspace audit logs** (Admin, Login, OAuth Token, SAML, Groups) | **Org** (only when Workspace data sharing is enabled) | `columbiacloudworks.com` Workspace tenant | `gcloud logging read --organization=476784721717` against `organizations/476784721717/logs/cloudaudit.googleapis.com%2F{activity,data_access}` |

The single most common confusion (the one that produced [#629](https://github.com/Columbia-Cloudworks-LLC/EquipQR/issues/629)) is between the second and third rows. The remediation is documented below.

## Where Google Workspace OAuth audit logs live (corrected architecture)

The service identifiers `admin.googleapis.com`, `oauth2.googleapis.com`, and `cloudidentity.googleapis.com` look like Google Cloud project services, but for audit-logging purposes they are **Google Workspace** services. They do **not** emit Cloud Logging Data Access audit logs at the project tier. Per [Audit logs for Google Workspace § Service-specific information](https://cloud.google.com/logging/docs/audit/gsuite-audit-logging#service-info):

| `protoPayload.serviceName` | Workspace audit log | Audit log types | Tier |
|---|---|---|---|
| `admin.googleapis.com` | Workspace **Admin Audit** | Admin Activity **only** | Org |
| `oauth2.googleapis.com` | Workspace **OAuth Token Audit** | Both Admin Activity and Data Access | Org |
| `cloudidentity.googleapis.com` | Workspace **Enterprise Groups Audit** | Admin Activity **only** | Org |
| `login.googleapis.com` | Workspace **Login Audit** and **SAML Audit** | Data Access **only** (`login.googleapis.com` covers both) | Org |

Consequences for operators:

- **Project-level `gcloud projects set-iam-policy equipqr-prod` with an `auditConfigs` block on these names is a verified no-op.** The IAM policy will accept and persist the YAML, but no entries will appear under `projects/equipqr-prod/logs/cloudaudit.googleapis.com%2Fdata_access` for these service names because the underlying producers do not write at the project tier.
- The Cloud Console **IAM & Admin → Audit Logs** table (`https://console.cloud.google.com/iam-admin/audit?project=equipqr-prod`) does not list these services as configurable rows for the same reason.
- The events that matter for #601-class evidence (e.g. `google.identity.oauth2.GetToken`, `google.identity.oauth2.Request`, `google.identity.oauth2.Authorize`, `google.identity.oauth2.Deny`, `google.identity.oauth2.RevokeToken`) are emitted by the Workspace tenant once data sharing is enabled, and land in the **org** Cloud Logging buckets at the **Admin Activity** log name (`cloudaudit.googleapis.com%2Factivity`) — these are always-on for Workspace once sharing is on; no `DATA_READ`/`DATA_WRITE` toggling is needed for them.

## Enabling Workspace → Google Cloud audit log sharing

This is a Google Workspace tenant action performed by a **Workspace super-admin** on `columbiacloudworks.com`. It is **not** a Google Cloud Console action and cannot be performed by service accounts (including the EquipQR Cursor agent SAs).

1. Sign in to [admin.google.com](https://admin.google.com) as a Workspace super-admin.
2. Navigate to **Account → Account settings → Legal and compliance → Sharing options** (alternative path: [support.google.com/a/answer/9320190](https://support.google.com/a/answer/9320190)).
3. In **Share data with Google Cloud Platform services**, select **Enabled** → **Save**.
4. Per [View and manage audit logs for Google Workspace](https://cloud.google.com/logging/docs/audit/configure-gsuite-audit-logs), audit logs from Workspace services begin flowing to Cloud Logging on the linked Google Cloud organization (`476784721717`, the parent of `equipqr-prod`) under the log names listed below.

The setting is reversible from the same Admin Console screen — set the toggle back to **Disabled** to stop new entries from flowing. Existing entries already in the org Cloud Logging buckets remain through their default retention windows.

## Querying org-tier audit logs

After Workspace data sharing is enabled, query against the **organization** resource, not the project:

```powershell
# All Workspace OAuth Token Audit entries in the last hour
gcloud logging read 'logName="organizations/476784721717/logs/cloudaudit.googleapis.com%2Factivity" AND protoPayload.serviceName="oauth2.googleapis.com"' --organization=476784721717 --limit=10 --freshness=1h --format=json

# Workspace Admin SDK directory reads (used by the Workspace OAuth callback)
gcloud logging read 'logName="organizations/476784721717/logs/cloudaudit.googleapis.com%2Factivity" AND protoPayload.serviceName="admin.googleapis.com"' --organization=476784721717 --limit=10 --freshness=24h --format=json

# Workspace Login Audit failures across the tenant
gcloud logging read 'logName="organizations/476784721717/logs/cloudaudit.googleapis.com%2Fdata_access" AND protoPayload.serviceName="login.googleapis.com" AND protoPayload.methodName="google.login.LoginService.loginFailure"' --organization=476784721717 --limit=10 --freshness=7d --format=json
```

The same queries are reachable through the Cloud Console **Logs Explorer** by switching the resource selector from `equipqr-prod` to the organization (`476784721717`).

### Required IAM grants for org-tier reads

As of 2026-04, the agent's `equipqr-cursor-agent-viewer@equipqr-prod` service account holds `roles/logging.privateLogViewer` (covers both `activity` and `data_access` log names) plus `roles/logging.viewAccessor` on org `476784721717`, so the queries above run successfully under the agent's default identity. See [`docs/ops/cloud-admin-access.md`](cloud-admin-access.md) for the full org-tier role posture and the impersonation chain that lets the agent elevate to the editor SA on demand.

## Project-setup baseline note

Any new Google Cloud project provisioned for EquipQR within organization `476784721717` **inherits Workspace audit log routing automatically** once Workspace data sharing is enabled at the tenant tier — the routing is org-tier, not project-tier. There is no per-project action required to capture Workspace audit logs for new projects.

What does require per-project attention:

- **Project-tier Cloud-native Data Access audit logs** (e.g. on `storage.googleapis.com`, `secretmanager.googleapis.com`, etc.) are still off by default for any new project. If a future Change Record needs Data Access logs on a Cloud-native service, that is a separate per-project `auditConfigs` edit and is in-scope for the IAM admin role on the editor SA (`equipqr-cursor-agent-editor-pr@equipqr-prod`).

## 7-day cost observation

Cloud Logging is charged at **$0.50/GiB after the first 50 GiB/project/month free** (per [Google Cloud Observability pricing](https://cloud.google.com/products/observability/pricing)). Workspace Admin Activity audit logs are stored in the org's `_Required` bucket at no charge; only Data Access entries hit the `_Default` bucket and count toward the free tier.

To capture the 7-day baseline post-enable (target completion: **2026-04-26**), run the following from a session with org-level log-read access:

```powershell
# Entry count by log name, last 7 days, org tier
gcloud logging read 'logName="organizations/476784721717/logs/cloudaudit.googleapis.com%2Factivity"' --organization=476784721717 --freshness=7d --format='value(insertId)' | Measure-Object | Select-Object -ExpandProperty Count

gcloud logging read 'logName="organizations/476784721717/logs/cloudaudit.googleapis.com%2Fdata_access"' --organization=476784721717 --freshness=7d --format='value(insertId)' | Measure-Object | Select-Object -ExpandProperty Count
```

Then complete this table inline:

| Log name | Entries (7-day) | Approx. bytes (7-day) | Projected GiB/month | $/month at $0.50/GiB after free tier |
|---|---|---|---|---|
| `organizations/476784721717/logs/cloudaudit.googleapis.com%2Factivity` (Admin Activity, free tier in `_Required`) | _TBD_ | _TBD_ | _TBD_ | **$0** (always-on, `_Required` bucket) |
| `organizations/476784721717/logs/cloudaudit.googleapis.com%2Fdata_access` (Data Access, counts toward free tier in `_Default`) | _TBD_ | _TBD_ | _TBD_ | _TBD_ |

If the projected `_Default` ingestion exceeds, say, 25 GiB/month (half the free tier) — investigate per-service contributors with `protoPayload.serviceName` aggregation and consider the `exemptedMembers` lever per [Configure Data Access audit logs § Exemptions](https://cloud.google.com/logging/docs/audit/configure-data-access#exemptions).

## Related documents

- [`docs/ops/deployment.md`](deployment.md) — Workspace OAuth setup and shared client policy.
- [`docs/ops/better-stack-monitoring.md`](better-stack-monitoring.md) — uptime monitoring (separate observability surface).
- [`.env.example`](../../.env.example) — Workspace OAuth env vars (`VITE_GOOGLE_WORKSPACE_CLIENT_ID`, `GOOGLE_WORKSPACE_CLIENT_ID`, `GOOGLE_WORKSPACE_CLIENT_SECRET`).
- [Issue #629](https://github.com/Columbia-Cloudworks-LLC/EquipQR/issues/629) — original ticket and redirect comment.
- [Issue #601](https://github.com/Columbia-Cloudworks-LLC/EquipQR/issues/601) — the customer report that surfaced the original observability gap.
