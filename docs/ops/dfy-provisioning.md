# Done-For-You yard provisioning

Use this runbook to set up a customer's EquipQR organization for them before anyone at the shop has an account. You create the organization, import its equipment, print QR labels, and pre-stage the owner and mechanics by email. Each person is attached to the yard automatically the first time they sign in with that email. Introduced in issue #1648.

## Who can provision

Only EquipQR operators: the user accounts whose IDs are listed in the `DFY_OPERATOR_USER_IDS` Edge secret of that Supabase project. Access is per user, never per organization. The list comes from the GitHub `production` and `preview` environment secrets of the same name and is synced to Supabase by `dev/ci/sync-deploy-config.mjs`. A missing or empty list means nobody is an operator.

An operator can reach a yard only while nobody has joined it: `provisioned_at` is set, `claimed_at` is empty, and the organization has no active members. As soon as the first staged person signs in, the yard disappears from the operator page and every operator action on it is refused. After that, EquipQR staff see the customer's data only if the owner grants time-limited support access.

## Provision a yard

1. Sign in as an operator and open **your avatar menu → Provision a yard** (`/dashboard/operator/provision`).
2. Under **New yard**, enter the organization name, an optional team name, and the staff list, one person per line:

   ```text
   owner@acmeheavy.com, owner
   office@acmeheavy.com, admin
   mike@acmeheavy.com, mechanic
   lead@acmeheavy.com, mechanic, manager
   ```

   - There must be exactly one `owner`. Roles: `owner`, `admin`, `mechanic`, `technician`, or `member`. The last three all become organization `member`.
   - Mechanics join the yard team as `technician` unless you add a team role (`manager`, `technician`, `requestor`, or `viewer`). Owners and admins already see the whole organization, so they join the team only if you give them a team role.
3. Optionally attach an equipment CSV. Recognized headers include `name`/`unit`, `manufacturer`/`make`, `model`, `serial_number`/`serial`/`vin`, `location`, `installation_date`/`in service date`, `status`, `notes`, and `import_id`. Other columns are ignored. A missing location defaults to `Yard`, and a missing installation date defaults to today.
4. Select **Review**. If any email already belongs to a verified EquipQR account, the page lists it. That account is attached the moment the yard is created, and the yard then stops being editable, so double-check the address and tick the confirmation.
5. Select **Create yard**. Everything is created in one transaction. Each form submission carries a request ID, so retrying after a network error returns the same yard instead of creating a second one. The organization records who provisioned it in `provisioned_by`.

While the yard is still waiting for its first sign-in, select it under **Waiting for first sign-in** to:

- add or remove staged people, including replacing a mistyped owner: remove the staged owner first, then add the new one (a yard can have only one staged owner),
- add equipment from another CSV or delete equipment,
- download **Labels CSV** (`equipment_id`, name, make, model, serial, and `qr_url` = `/qr/equipment/<id>?org=<org>`) for a label printer's mail merge,
- **Send sign-in invites**, which emails a Supabase invite link to each staged person who hasn't signed in yet.

`node dev/dfy/provision-yard.mjs --manifest <file> --dry-run` still validates a JSON manifest with the same rules, but it no longer writes anything.

## How claiming works

1. A provisioned organization has **no members**. Organization access is based on membership, so Row Level Security (RLS) keeps the yard and its equipment hidden from every user until someone claims it.
2. Each staff email is stored in `organization_provisioned_members` with a role (`owner`, `admin`, or `member`), an optional team role, and the operator who staged it (`staged_by`). Only the service role can write to this table.
3. When a staged email signs in **with a verified address**, the staged row is claimed:
   - **Google sign-in:** claimed in `handle_new_user()` when the account is created.
   - **Magic link, invite link, or confirmed email signup:** claimed by the `on_auth_user_email_confirmed_claim` trigger when `email_confirmed_at` is set.
4. Claiming creates an active membership with the staged role (`access_source = 'provisioned'`) and adds mechanics to the yard team. It marks the product onboarding checklist complete, marks the staged row `claimed` with the role actually granted in `claimed_role`, and records `organizations.claimed_at` when the owner claims. If the organization already has an active owner, a staged owner becomes an admin and `claimed_role` shows `admin`.
5. Each staged row is claimed on its own. If one fails, the person still signs in, the row stays `pending`, and the error is saved in `last_claim_error`.
6. Staged people don't get an empty "My Organization", so the yard is their default organization and they land on its dashboard.

Claiming trusts a verified email, so it depends on two hosted Auth settings: `mailer_autoconfirm = false` and secure email change turned on, with email and Google as the only sign-in methods. The production release checks all of this with `dev/ci/check-auth-config.mjs` and stops if any of it changes. An unconfirmed password signup that uses a staged email gets nothing.

## After handoff

- **Check claim status:** the org's owners and admins see everyone who hasn't signed in yet under **Members → Waiting to sign in**. From SQL:

  ```sql
  select email, role, status, claimed_role, claimed_at, last_claim_error
  from public.organization_provisioned_members
  where organization_id = '<org-id>';
  ```

- **Revoke a staged person before they claim:** the org's owners and admins can remove anyone from **Waiting to sign in**. The row becomes `revoked` with `revoked_by` and `revoked_at`. The unique index applies only to live rows, so the address can be staged again later.
- **Revoked before they verified:** a person who signed up with a staged email but hadn't verified it yet gets a normal "My Organization" when they verify, so they never land with no organization.
- **QuickBooks:** when the claiming owner first opens the dashboard and QuickBooks Online is not connected, they see a dismissible "Connect QuickBooks" card. It starts the normal OAuth flow, and the connection is stored on the existing organization.
