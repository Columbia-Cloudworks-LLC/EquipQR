# Google Cloud Admin Access — Agent IAM Posture

> Operational reference for the two service accounts that act as Cursor agent identities against Google Cloud organization `476784721717` (`columbiacloudworks.com`). Documents the role posture, invocation patterns, security trade-offs, and the reapply procedure for new orgs or new projects.

## Two-SA model

The Cursor agents in this workspace operate as one of two service accounts, both children of the `equipqr-prod` project, both org-wide as of 2026-04:

| Service account | Role | When the agent uses it |
|---|---|---|
| `equipqr-cursor-agent-viewer@equipqr-prod.iam.gserviceaccount.com` | **Default identity** — every read-only investigation, every gcloud query, every audit-log read | Always (the agent's "default identity") |
| `equipqr-cursor-agent-editor-pr@equipqr-prod.iam.gserviceaccount.com` | **Elevation identity** — only invoked when the user explicitly asks for a change | Via `--impersonate-service-account` from the viewer session, on demand |

The viewer SA holds `roles/iam.serviceAccountTokenCreator` *on the editor SA* (a resource-level grant on the editor SA itself, scoped to project `equipqr-prod`). That single grant is the impersonation chain — the viewer SA can mint short-lived OAuth tokens for the editor SA when (and only when) the agent passes `--impersonate-service-account`.

## Org-tier role posture

### Viewer SA (read-only across the entire org)

Granted on organization `476784721717` (Tier 2 of the original setup):

- `roles/browser`
- `roles/resourcemanager.organizationViewer`
- `roles/resourcemanager.folderViewer`
- `roles/iam.securityReviewer`
- `roles/logging.privateLogViewer`
- `roles/logging.viewAccessor`
- `roles/monitoring.viewer`
- `roles/billing.viewer`
- `roles/cloudasset.viewer`
- `roles/serviceusage.serviceUsageViewer`
- `roles/orgpolicy.policyViewer`
- `roles/securitycenter.adminViewer`

Plus, on each of the four billing accounts under the org (`011523-563BCD-AEF141`, `013785-72B06A-A89CAC`, `01606A-9B223B-B345F7`, `01C54A-FE04FD-748113`):

- `roles/billing.viewer`

### Editor SA (co-admin write across the entire org)

Granted on organization `476784721717`:

- `roles/resourcemanager.organizationAdmin` *(the keystone — manages IAM on the org, folders, and projects)*
- `roles/resourcemanager.folderAdmin`
- `roles/resourcemanager.projectCreator`
- `roles/resourcemanager.projectMover`
- `roles/orgpolicy.policyAdmin`
- `roles/iam.organizationRoleAdmin`
- `roles/iam.serviceAccountAdmin`
- `roles/logging.admin`
- `roles/monitoring.admin`
- `roles/cloudasset.owner`
- `roles/serviceusage.serviceUsageAdmin`
- `roles/securitycenter.admin`
- `roles/billing.user`

Plus, on each of the four billing accounts:

- `roles/billing.admin`

### Deliberately NOT granted

- **`roles/owner`** — Google's [best practices for service accounts](https://cloud.google.com/iam/docs/best-practices-service-accounts) explicitly say "don't grant Owner to SAs in production". The bundle above is functionally equivalent for org-admin work and traceable to specific permissions in audit logs.
- **`roles/editor`** — same rationale.
- **Workspace super-admin** — lives on the Workspace tenant at admin.google.com, not on Cloud IAM. Stays with humans (Nicholas).

## Agent invocation patterns

### Default (read-only)

```powershell
# Agent's default behavior — runs as viewer SA.
gcloud projects list
gcloud logging read '...' --organization=476784721717
gcloud organizations get-iam-policy 476784721717
```

### Explicit elevation (write)

```powershell
# When the agent needs to make a change, it adds --impersonate-service-account
# to the specific command. Only that one command runs as the editor SA.
gcloud projects set-iam-policy <project> policy.yaml `
  --impersonate-service-account=equipqr-cursor-agent-editor-pr@equipqr-prod.iam.gserviceaccount.com

gcloud projects create my-new-project `
  --organization=476784721717 `
  --impersonate-service-account=equipqr-cursor-agent-editor-pr@equipqr-prod.iam.gserviceaccount.com
```

The agent should **never** switch the active gcloud account to the editor SA via `gcloud config set account`. Always keep the viewer SA as the default and use `--impersonate-service-account` on a per-command basis.

### Audit trail

Every command run under the editor SA appears in org-tier Cloud Logging Admin Activity logs under:

```
protoPayload.authenticationInfo.principalEmail = "equipqr-cursor-agent-editor-pr@equipqr-prod.iam.gserviceaccount.com"
```

with the impersonating principal also captured under `protoPayload.authenticationInfo.serviceAccountDelegationInfo[].principalSubject`. This means every elevated action is fully traceable to (a) the editor SA that performed it, and (b) the viewer SA / human that requested the impersonation.

## Reapply / new-org bootstrap

The full role posture above can be reapplied to a new Google Cloud organization (or re-seeded after a teardown) by running the following from a shell signed in as a human with `roles/resourcemanager.organizationAdmin` on the target org. Replace the `$org` and SA emails for the new context.

### 1. Viewer SA org-wide read

```powershell
$org    = "<TARGET_ORG_ID>"
$viewer = "serviceAccount:<viewer-sa@<project>.iam.gserviceaccount.com>"

$viewerRoles = @(
  "roles/browser",
  "roles/resourcemanager.organizationViewer",
  "roles/resourcemanager.folderViewer",
  "roles/iam.securityReviewer",
  "roles/logging.privateLogViewer",
  "roles/logging.viewAccessor",
  "roles/monitoring.viewer",
  "roles/billing.viewer",
  "roles/cloudasset.viewer",
  "roles/serviceusage.serviceUsageViewer",
  "roles/orgpolicy.policyViewer",
  "roles/securitycenter.adminViewer"
)

foreach ($role in $viewerRoles) {
  gcloud organizations add-iam-policy-binding $org --member=$viewer --role=$role --condition=None | Out-Null
}
```

### 2. Editor SA org-wide co-admin

```powershell
$org    = "<TARGET_ORG_ID>"
$editor = "serviceAccount:<editor-sa@<project>.iam.gserviceaccount.com>"

$editorRoles = @(
  "roles/resourcemanager.organizationAdmin",
  "roles/resourcemanager.folderAdmin",
  "roles/resourcemanager.projectCreator",
  "roles/resourcemanager.projectMover",
  "roles/orgpolicy.policyAdmin",
  "roles/iam.organizationRoleAdmin",
  "roles/iam.serviceAccountAdmin",
  "roles/logging.admin",
  "roles/monitoring.admin",
  "roles/cloudasset.owner",
  "roles/serviceusage.serviceUsageAdmin",
  "roles/securitycenter.admin",
  "roles/billing.user"
)

foreach ($role in $editorRoles) {
  gcloud organizations add-iam-policy-binding $org --member=$editor --role=$role --condition=None | Out-Null
}
```

### 3. Impersonation chain

```powershell
$editorEmail = "<editor-sa@<project>.iam.gserviceaccount.com>"
$viewer      = "serviceAccount:<viewer-sa@<project>.iam.gserviceaccount.com>"

gcloud iam service-accounts add-iam-policy-binding $editorEmail `
  --member=$viewer `
  --role="roles/iam.serviceAccountTokenCreator" `
  --project=<project>
```

### 4. Billing accounts

```powershell
$editor = "serviceAccount:<editor-sa@<project>.iam.gserviceaccount.com>"
$viewer = "serviceAccount:<viewer-sa@<project>.iam.gserviceaccount.com>"
$billingAccounts = @("<BILLING_ACCOUNT_ID_1>", "<BILLING_ACCOUNT_ID_2>")

foreach ($acct in $billingAccounts) {
  gcloud beta billing accounts add-iam-policy-binding $acct --member=$editor --role="roles/billing.admin" | Out-Null
  gcloud beta billing accounts add-iam-policy-binding $acct --member=$viewer --role="roles/billing.viewer" | Out-Null
}
```

## Future projects under the same org

Projects created under organization `476784721717` (whether by the editor SA via `gcloud projects create --organization=476784721717`, or manually in the Console) **inherit all of the role bindings above automatically**. There is no per-project re-grant needed — the viewer SA can read everything in the new project, and the editor SA can manage IAM on it, the moment it appears.

## Reversal

Every `add-iam-policy-binding` above has a matching `remove-iam-policy-binding` form. The setup is fully reversible by running the same scripts with `remove-iam-policy-binding` in place of `add-iam-policy-binding`. The impersonation grant from step 3 can be revoked with:

```powershell
gcloud iam service-accounts remove-iam-policy-binding $editorEmail `
  --member=$viewer `
  --role="roles/iam.serviceAccountTokenCreator" `
  --project=equipqr-prod
```

## Security notes

- **Lateral movement is bounded.** The only impersonation chain in this setup is viewer → editor (one hop, intentional, auditable). No other SA can mint tokens for either of these two.
- **No SA keys.** This setup uses Application Default Credentials and impersonation throughout. The org policy `iam.disableServiceAccountKeyCreation` (already enforced on this org) stays compatible — nothing here attempts to mint long-lived keys.
- **Workspace super-admin remains separate.** The Workspace data-sharing toggle, OAuth log surfacing, and any tenant-level admin action stays with humans on admin.google.com. The editor SA cannot perform Workspace admin actions even with org-admin rights on Cloud, by design.
- **Auditability.** Every action by either SA is captured in org-tier Cloud Logging Admin Activity (`cloudaudit.googleapis.com%2Factivity` under `organizations/476784721717/logs/`). For elevated actions, the original requesting principal appears in `serviceAccountDelegationInfo`.

## Related documents

- [`docs/ops/observability.md`](observability.md) — where Workspace and Cloud audit logs live and how to query them.
- [`docs/ops/deployment.md`](deployment.md) — Workspace OAuth deployment and shared client policy.
- [Best practices for using service accounts securely](https://cloud.google.com/iam/docs/best-practices-service-accounts) — Google's canonical SA security guidance.
- [Access control for organization resources](https://cloud.google.com/resource-manager/docs/access-control-org) — Google's canonical org-IAM reference.
