# Done-For-You yard provisioning

Use this runbook to set up a customer's EquipQR organization for them before anyone at the shop has an account. You create the organization, import its equipment, print QR labels, and pre-stage the owner and mechanics by email. Each person is attached to the yard automatically the first time they sign in with that email. Introduced in issue #1648.

## How claiming works

1. The script creates the organization with **no members**. Organization access is based on membership, so Row Level Security (RLS) keeps the yard and its equipment hidden from every user until someone claims it.
2. Each staff email is stored in `organization_provisioned_members` with a role (`owner`, `admin`, or `member`) and an optional team role. Only the service role can write to this table.
3. When a staged email signs in **with a verified address**, the staged row is claimed:
   - **Google sign-in:** claimed in `handle_new_user()` when the account is created.
   - **Magic link, invite link, or confirmed email signup:** claimed by the `on_auth_user_email_confirmed_claim` trigger when `email_confirmed_at` is set.
4. Claiming creates an active membership with the staged role (`access_source = 'provisioned'`) and adds mechanics to the yard team. It marks the product onboarding checklist complete, marks the staged row `claimed` with the role actually granted in `claimed_role`, and records `organizations.claimed_at` when the owner claims. If the organization already has an active owner, a staged owner becomes an admin and `claimed_role` shows `admin`.
   - Each staged row is claimed on its own. If one fails, the person still signs in, the row stays `pending`, and the error is saved in `last_claim_error`. Staged people do not get an empty "My Organization", so the yard is their default organization and they land on its dashboard.
5. If an email already belongs to a verified account when you stage it, that account is attached immediately.

Claiming depends on `mailer_autoconfirm = false` in production (see [auth-signup-email-workflow.md](./auth-signup-email-workflow.md)). An unconfirmed password signup that uses a staged email gets nothing.

## Manifest

```json
{
  "organization": { "name": "Acme Heavy Repair", "maxMembers": 10 },
  "team": { "name": "Main Yard" },
  "staff": [
    { "email": "owner@acmeheavy.com", "role": "owner" },
    { "email": "office@acmeheavy.com", "role": "admin" },
    { "email": "mike@acmeheavy.com", "role": "mechanic" },
    { "email": "lead@acmeheavy.com", "role": "mechanic", "teamRole": "manager" }
  ],
  "equipment": [
    { "name": "Excavator 7", "manufacturer": "Deere", "model": "310SL", "serialNumber": "1T0310SL..." }
  ]
}
```

- `staff` must have exactly one `owner`. Roles: `owner`, `admin`, `mechanic`, `technician`, or `member`. The last three all become organization `member`.
- Mechanics join the yard team as `technician` unless you set `teamRole` (`manager`, `technician`, `requestor`, or `viewer`). Owners and admins already see the whole organization, so they join the team only if you give them a `teamRole`.
- `maxMembers` is raised to at least the number of staff, and never set below 5.
- Equipment rows can come from `equipment`, from `--equipment-csv`, or both. Recognized CSV headers include `name`/`unit`, `manufacturer`/`make`, `model`, `serial_number`/`serial`/`vin`, `location`, `installation_date`/`in service date`, `status`, `notes`, and `import_id`. Other columns are ignored. A missing location defaults to `Yard`, and a missing installation date defaults to today.

## Run it

```bash
# 1. Validate without writing anything
node dev/dfy/provision-yard.mjs --manifest acme.json --equipment-csv acme-iron.csv --dry-run

# 2. Provision (service role key for the target project)
SUPABASE_URL=https://<project-ref>.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=<service-role-key> \
  node dev/dfy/provision-yard.mjs --manifest acme.json --equipment-csv acme-iron.csv \
    --app-url https://equipqr.app --out tmp/dfy/acme

# Optional: also email Supabase invite links to the still-pending staff
#   ... --send-invites
```

If any step fails after the organization is created, the script deletes the organization. The delete cascades to the team, equipment, and staged rows.

Output (default `tmp/dfy/<slug>-<org-id-prefix>/`, which is gitignored):

- `labels.csv`: one row per equipment record with `equipment_id`, name, make, model, serial, `qr_url` (`/qr/equipment/<id>?org=<org>`), and the matching SVG path. You can feed it to a label printer's mail merge.
- `qr/<equipment_id>.svg`: one QR code per record.

## After handoff

- **Check claim status:**

  ```sql
  select email, role, status, claimed_at
  from public.organization_provisioned_members
  where organization_id = '<org-id>';
  ```

  The org's owners and admins can also read this roster in the app through RLS.
- **Revoke a staged person before they claim:** the org's owners and admins see a "Waiting to sign in" list on the Members page and can remove anyone there. The row becomes `revoked` with `revoked_by` and `revoked_at`. The unique index applies only to live rows, so the address can be staged again later.
- **Revoked before they verified:** a person who signed up with a staged email but hadn't verified it yet gets a normal "My Organization" when they verify, so they never land with no organization.
- **QuickBooks:** when the claiming owner first opens the dashboard and QuickBooks Online is not connected, they see a dismissible "Connect QuickBooks" card. It starts the normal OAuth flow, and the connection is stored on the existing organization.
