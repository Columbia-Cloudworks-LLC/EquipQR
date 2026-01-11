# EquipQR Seed Data

This folder contains modular seed data files for local development. The files are executed in lexicographic order by the Supabase CLI.

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
|------|-------------|
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

## Test Accounts

After running `npx supabase db reset`, you can login as any test user with password: `password123`

### User Matrix

| Email | Password | Owns (Personal Org) | Also Member At |
|-------|----------|---------------------|----------------|
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
|----------|-------------------|
| Ownership | Every user owns exactly one org (business rule compliance) |
| Cross-org membership | `owner@apex.test` is also member at Metro |
| Multi-org admin | `owner@metro.test` is admin at Industrial |
| Free tier | Valley Landscaping and personal orgs test feature limitations |
| Multi-org user | `multi@equipqr.test` tests org switching (owns 1, member of 4) |

## Equipment Locations (Map Testing)

| Organization | Region | Cities |
|--------------|--------|--------|
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
|--------|-------|-------------|
| `submitted` | 2 | New requests awaiting review |
| `accepted` | 1 | Approved, not yet started |
| `assigned` | 1 | Assigned to technician |
| `in_progress` | 4 | Currently being worked |
| `on_hold` | 1 | Blocked waiting for parts |
| `completed` | 2 | Historical completed work |
| `cancelled` | 1 | Cancelled work order |

## Inventory Edge Cases

| Case | Item | Qty | Threshold |
|------|------|-----|-----------|
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
|----------|-------|----------|
| Forklift PM | 103 | 12 |
| Pull Trailer PM | 51 | 8 |
| Compressor PM | 53 | 9 |
| Scissor Lift PM | 74 | 10 |
| Excavator PM | 84 | 12 |
| Skid Steer PM | 80 | 11 |

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

## Adding New Seed Data

1. Create a new numbered file (e.g., `23_new_table.sql`)
2. Ensure the number reflects dependency order
3. Use `ON CONFLICT DO NOTHING` for idempotent inserts
4. Use consistent UUID patterns (see existing files for prefix conventions)
