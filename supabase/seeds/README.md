# EquipQR Seed Data

This folder contains the **durable core** of local development seed data — the minimal committed SQL that E2E fixtures and Playwright constants depend on. The files are executed in lexicographic order by the Supabase CLI.

**Volume data is generated, not committed** (#1164). `scripts/seed-data/generate-seeds.ts` writes deterministic bulk SQL (inventory, alternate groups, equipment fleet, work orders with consumed parts and costs, inventory RBAC grants, operator check-ins) into `supabase/seeds/generated/` (gitignored), which `supabase db reset` applies **after** the committed files here. See [Generated Volume Data](#generated-volume-data).

## Security Warning

> **⚠️ LOCAL DEVELOPMENT ONLY**
>
> These files contain hardcoded test credentials (`password123`). They are committed to version control intentionally for local development convenience.
>
> - **NEVER** run these seed files against a production database
> - **NEVER** use these credentials in production environments
>
> The `auth.users` inserts will **FAIL** in Supabase hosted environments because direct auth schema access is blocked in production. This provides a built-in safeguard against accidental production seeding.

## File Structure

| File | Description |
| ------ | ------------- |
| `00_safeguard.sql` | Environment check and security notice |
| `01_auth_users.sql` | Test user accounts in `auth.users` |
| `02_profiles.sql` | User profile records |
| `03_organizations.sql` | 8 organizations (4 business + 4 personal) |
| `04_organization_members.sql` | Cross-org membership matrix |
| `05_teams.sql` | Teams per organization |
| `06_team_members.sql` | Team role assignments |
| `07_equipment.sql` | Equipment with GPS coordinates |
| `08_work_orders.sql` | Work orders in all statuses |
| `09_work_order_notes.sql` | Progress notes |
| `10_inventory_items.sql` | Parts with varied stock levels |
| `11_inventory_transactions.sql` | Audit trail |
| `12_equipment_part_compatibility.sql` | Part-equipment links |
| `13_equipment_notes.sql` | Equipment comments |
| `14_scans.sql` | QR scan history |
| `15_geocoded_locations.sql` | Location cache |
| `16_customers.sql` | Rental customers |
| `17_pm_template_forklift.sql` | Global Forklift PM checklist template (103 items) |
| `18_pm_template_pull_trailer.sql` | Global Pull Trailer PM checklist template (51 items) |
| `19_pm_template_compressor.sql` | Global Compressor PM checklist template (53 items) |
| `20_pm_template_scissor_lift.sql` | Global Scissor Lift PM checklist template (74 items) |
| `21_pm_template_excavator.sql` | Global Excavator PM checklist template (84 items) |
| `22_pm_template_skid_steer.sql` | Global Skid Steer PM checklist template (80 items) |
| `23_pm_template_compatibility_rules.sql` | PM template equipment compatibility |
| `24_part_compatibility_rules.sql` | Part-equipment compatibility rules (~40 rules) |
| `25_part_alternate_groups.sql` | Part alternate/interchange groups (10 groups, 30+ identifiers) |
| `29_e2e_playwright_fixtures.sql` | Playwright fixtures: requestor team member, pending invitation token, DSR case |
| `30_e2e_onboarding_fixture.sql` | Fresh Start onboarding org (no teams/equipment) |
| `31_cursed_historical_timeline.sql` | **CURSED_HISTORICAL_FIXTURE** — anonymized legacy historical timeline shapes (#1279) |
| `generated/*.sql` (gitignored) | **Generated volume data** — see [Generated Volume Data](#generated-volume-data) |

## Test Accounts

After running `npx supabase db reset`, you can login as any test user with password: `password123`

### User Matrix

| Email | Password | Owns (Personal Org) | Also Member At |
| ------- | ---------- | --------------------- | ---------------- |
| `owner@apex.test` | password123 | Apex Construction | Metro (member) |
| `admin@apex.test` | password123 | Amanda's Equipment | Apex (admin), Valley |
| `tech@apex.test` | password123 | Tom's Field Services | Apex (member) |
| `owner@metro.test` | password123 | Metro Equipment | Industrial (admin) |
| `tech@metro.test` | password123 | Mike's Repair Shop | Metro (member) |
| `owner@valley.test` | password123 | Valley Landscaping | - |
| `owner@industrial.test` | password123 | Industrial Rentals | Apex (member) |
| `multi@equipqr.test` | password123 | Multi Org Consulting | All 4 business orgs |

## Organizations

### Business Organizations (4)

- **Apex Construction Company** (premium) - Primary test org
- **Metro Equipment Services** (premium) - Cross-membership testing
- **Valley Landscaping** (free) - Free tier testing
- **Industrial Rentals Corp** (premium) - Rental business scenario

### Personal Organizations (4)

- **Amanda's Equipment Services** (free) - `admin@apex.test`'s org
- **Tom's Field Services** (free) - `tech@apex.test`'s org
- **Mike's Repair Shop** (free) - `tech@metro.test`'s org
- **Multi Org Consulting** (free) - `multi@equipqr.test`'s org

## Test Scenarios

| Scenario | Users/Orgs to Test |
| ---------- | ------------------- |
| Ownership | Every user owns exactly one org (business rule compliance) |
| Cross-org membership | `owner@apex.test` is also member at Metro |
| Multi-org admin | `owner@metro.test` is admin at Industrial |
| Free tier | Valley Landscaping and personal orgs test feature limitations |
| Multi-org user | `multi@equipqr.test` tests org switching (owns 1, member of 4) |

## Equipment Locations (Map Testing)

| Organization | Region | Cities |
| -------------- | -------- | -------- |
| Apex | Texas (clustered) | Dallas, Fort Worth, Houston |
| Metro | California (spread out) | LA, SF, San Diego |
| Valley | Colorado | Denver, Boulder, Colorado Springs |
| Industrial | Nationwide | Chicago, Detroit, Atlanta, NYC |
| Personal orgs | - | No equipment (minimal orgs) |

### Special Cases

- One equipment (Light Tower) has `NULL` location for empty state testing
- One equipment (Kubota Tractor) has stale 45-day-old location

## Work Order Status Coverage

| Status | Count | Description |
| -------- | ------- | ------------- |
| `submitted` | 2 | New requests awaiting review |
| `accepted` | 1 | Approved, not yet started |
| `assigned` | 1 | Assigned to technician |
| `in_progress` | 4 | Currently being worked |
| `on_hold` | 1 | Blocked waiting for parts |
| `completed` | 2 | Historical completed work |
| `cancelled` | 1 | Cancelled work order |

## Inventory Edge Cases

| Case | Item | Qty | Threshold |
| ------ | ------ | ----- | ----------- |
| Normal stock | Hydraulic Oil | 24 | 10 |
| LOW STOCK | Air Filter | 3 | 5 |
| LOW STOCK | LED Panel | 2 | 3 |
| OUT OF STOCK | Track Shoes | 0 | 4 |
| OUT OF STOCK | Scissor Lift Cylinder Seal | 0 | 2 |
| No SKU | LED Panel | 2 | 3 |

## PM Checklist Templates (Global)

The PM template seed files (`17_*` through `22_*`) create global PM checklist templates that are available to all organizations. These templates:

- Have `organization_id = NULL` (global, not org-specific)
- Are `is_protected = true` (cannot be modified by organizations)
- Use UUID prefix `cc0e8400` for template IDs

| Template | Items | Sections |
| ---------- | ------- | ---------- |
| Forklift PM | 103 | 12 |
| Pull Trailer PM | 51 | 8 |
| Compressor PM | 53 | 9 |
| Scissor Lift PM | 74 | 10 |
| Excavator PM | 84 | 12 |
| Skid Steer PM | 80 | 11 |

## Part Alternate Groups

The `25_part_alternate_groups.sql` file creates test data for the Part Alternates feature, which allows technicians to find interchangeable parts by searching part numbers.

### Test Scenarios

| Search This | Organization | Expected Result |
| ------------- | -------------- | ----------------- |
| `CAT-1R-0750` | Apex | Find WIX, Baldwin alternatives + in-stock Hydraulic Oil |
| `JLG-7024359` | Metro | Find Hercules aftermarket + in-stock seal kit |
| `TROJ-T-105` | Metro | Find Genie OEM and US Battery alternatives |
| `KUB-HH150-32094` | Valley | Find WIX, Fram alternatives + in-stock oil filter |

### Groups by Organization

| Organization | Groups | Verified | Unverified |
| -------------- | -------- | ---------- | ------------ |
| Apex Construction | 3 | 2 | 1 |
| Metro Equipment | 3 | 2 | 1 |
| Valley Landscaping | 2 | 1 | 1 |
| Industrial Rentals | 2 | 2 | 0 |

### Identifier Types Used

- **OEM**: Original manufacturer part numbers (e.g., `CAT-1R-0750`)
- **Aftermarket**: Third-party part numbers (e.g., `WIX-57090`)
- **SKU**: Internal inventory SKUs linked to inventory items
- **Cross-ref**: Cross-reference numbers from interchange guides

## Cursed Historical Timeline Fixtures (#1279)

`31_cursed_historical_timeline.sql` seeds org **CURSED_HISTORICAL_FIXTURE Timeline Lab**
(`660e8400-e29b-41d4-a716-446655440011`) with anonymized reconstructions of legacy
production shapes that missed a leading `submitted` status-history event.

| WO suffix | Purpose |
| --------- | ------- |
| `…440c01` | Single-event accepted-first stub (`Historical work order created`) |
| `…440c02` | Multi-event legacy ending `in_progress` |
| `…440c03` | Long `in_progress` chain (legacy accepted start) |
| `…440c04` | Happy-path submitted-first completed (contrast) |
| `…440c05` | Boundary: assigned without assignee |
| `…440c06` | Boundary: out-of-order timestamps |

Alex Apex is an **admin** member so default e2e personas can pin this org.
Casey Cursed (`owner@cursedtimeline.test`) owns the fixture org.

These rows intentionally keep the pre-#1276-repair shape. Seeds run after migrations,
so the one-shot backfill does not rewrite them.

## Trigger Handling

The `handle_new_user` trigger fires on `auth.users` INSERT and creates:

1. A profile record (uses ON CONFLICT - safe for seeding)
2. A new organization (with random UUID)
3. An organization_member record

**Problem:** During seeding, the trigger creates organizations with random UUIDs before our intended seed organizations are inserted.

**Solution:** The `99_cleanup_trigger_orgs.sql` file runs LAST and:

1. Identifies organizations NOT in our intended seed list
2. Deletes those trigger-created organizations and their memberships
3. Leaves only our seeded organizations with controlled UUIDs

This ensures users get the specific organization UUIDs defined in our seed files.

If you're seeing duplicate organizations or unexpected default org selection:

1. Ensure `99_cleanup_trigger_orgs.sql` exists and lists all intended org IDs
2. Run `npx supabase db reset` (not just `db seed`)

## Generated Volume Data

Bulk test data is produced by `scripts/seed-data/generate-seeds.ts` into `supabase/seeds/generated/` (gitignored) and applied by `supabase db reset` after the committed files (see `[db.seed].sql_paths` in `supabase/config.toml`).

### How it runs

| Entry point | Behavior |
| ------------- | ---------- |
| `dev-start.bat -Force` | Regenerates at `-SeedScale <1-100>` (default 1), then resets the DB |
| `run-user-regression.ps1 -ResetDb` (`dev-test.bat reset-db` / `local-full`) | Regenerates at scale 1, then resets |
| `npm run seed:generate [-- --scale N]` | Manual regeneration only (no reset) |

Generation is deterministic: the same scale always emits identical SQL (seeded RNG, counter-based UUIDs), so E2E behaves identically across machines and resets. Guardrail unit tests live in `src/tests/scripts/generateSeeds.test.ts`.

### Domains at scale 1

| File | Contents |
| ------ | ---------- |
| `50_generated_equipment.sql` | 32 extra equipment rows (8/org, `GEN-` serials, active/maintenance mix, ~20% unassigned) |
| `51_generated_inventory.sql` | 900 inventory items, 150 alternate groups, 623 identifiers + members |
| `52_generated_work_orders.sql` | 48 work orders across all statuses (dated 2025), notes, itemized costs, and reconciled `inventory_transactions` for consumed parts |
| `53_generated_parts_rbac.sql` | Parts Manager (Mike Mechanic @ Metro), Parts Consumer (Multi Org User @ Industrial) — **never Apex** (E2E deny-path guardrail) |
| `54_generated_operator_checkins.sql` | 1 Metro checklist template, 2 QR assignments on generated equipment, 12 ledger submissions — **Apex stays empty** for the evidence spec |

`--scale N` multiplies the volume rows linearly (durable RBAC grants and the operator template stay fixed).

### Dev media (images)

After `supabase db reset`, step **5b** runs `scripts/seed-dev-media.ps1` to upload photos from `supabase/seed-images/` into private Storage buckets and store **canonical paths** in Postgres (equipment display, equipment note images, work order images). See `supabase/seed-images/README.md` for the `equipment/`, `drop/`, and `work-orders/` folder conventions.

### E2E safety contract

Generated data must never disturb the durable-core fixtures Playwright asserts against:

- Generated UUIDs use dedicated prefixes (`c10e`/`c20e`/`c30e`/`c40e` inventory, `d1xe`-`d8xe` new domains) disjoint from committed seed ranges.
- Generated work orders are dated in 2025 so the 2026-dated core fixtures stay newest in recency-sorted lists.
- No inventory RBAC grants for Apex members; no Apex operator check-in rows.

### UUID Prefixes

| Type | Prefix |
| ------ | -------- |
| Inventory Items | `c10e8400` |
| Part Identifiers | `c20e8400` |
| Alternate Groups | `c30e8400` |
| Group Members | `c40e8400` |
| Equipment | `d10e8400` |
| Work Orders | `d20e8400` |
| Work Order Notes | `d30e8400` |
| Work Order Costs | `d40e8400` |
| Inventory Transactions | `d50e8400` |
| Operator Check-In Templates / Settings / Submissions | `d60e8400` / `d70e8400` / `d80e8400` |

## Adding New Seed Data

1. Create a new numbered file (e.g., `27_new_table.sql`)
2. Ensure the number reflects dependency order
3. Use `ON CONFLICT DO NOTHING` for idempotent inserts
4. Use consistent UUID patterns (see existing files for prefix conventions)
