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
| `23_pm_template_compatibility_rules.sql` | PM template equipment compatibility |
| `24_part_compatibility_rules.sql` | Part-equipment compatibility rules (~40 rules) |
| `25_part_alternate_groups.sql` | Part alternate/interchange groups (10 groups, 30+ identifiers) |
| `26_large_inventory.sql` | **Large-scale load testing data** (900 items, 150 groups, 623 identifiers) |

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

## Part Alternate Groups

The `25_part_alternate_groups.sql` file creates test data for the Part Alternates feature, which allows technicians to find interchangeable parts by searching part numbers.

### Test Scenarios

| Search This | Organization | Expected Result |
|-------------|--------------|-----------------|
| `CAT-1R-0750` | Apex | Find WIX, Baldwin alternatives + in-stock Hydraulic Oil |
| `JLG-7024359` | Metro | Find Hercules aftermarket + in-stock seal kit |
| `TROJ-T-105` | Metro | Find Genie OEM and US Battery alternatives |
| `KUB-HH150-32094` | Valley | Find WIX, Fram alternatives + in-stock oil filter |

### Groups by Organization

| Organization | Groups | Verified | Unverified |
|--------------|--------|----------|------------|
| Apex Construction | 3 | 2 | 1 |
| Metro Equipment | 3 | 2 | 1 |
| Valley Landscaping | 2 | 1 | 1 |
| Industrial Rentals | 2 | 2 | 0 |

### Identifier Types Used

- **OEM**: Original manufacturer part numbers (e.g., `CAT-1R-0750`)
- **Aftermarket**: Third-party part numbers (e.g., `WIX-57090`)
- **SKU**: Internal inventory SKUs linked to inventory items
- **Cross-ref**: Cross-reference numbers from interchange guides

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

## Large-Scale Load Testing Data

The `26_large_inventory.sql` file contains auto-generated test data for load testing scenarios where organizations have hundreds of parts.

### Data Summary

| Type | Count | Description |
|------|-------|-------------|
| Inventory Items | 900 | Realistic parts across 18 categories |
| Part Alternate Groups | 150 | Groups of interchangeable parts |
| Part Identifiers | 623 | OEM and aftermarket part numbers |
| Group Members | 623 | Links between identifiers and groups |

### Distribution by Organization

| Organization | Inventory Items | Alternate Groups |
|--------------|-----------------|------------------|
| Apex Construction | 300 | 50 |
| Metro Equipment | 250 | 40 |
| Valley Landscaping | 150 | 25 |
| Industrial Rentals | 200 | 35 |

### Categories (weighted by org type)

- **Apex Construction**: Undercarriage, Hydraulics, Engine, Ground Engaging, Filters
- **Metro Equipment**: Lift Parts, Batteries, Hydraulics, Safety, Tires & Wheels
- **Valley Landscaping**: Landscaping, Filters, Fluids, Engine
- **Industrial Rentals**: Forklift, Batteries, Tires & Wheels, Safety

### Regenerating the Data

To regenerate with different configurations:

```bash
# Edit CONFIG in scripts/generate-large-inventory-seed.ts, then run:
npx tsx scripts/generate-large-inventory-seed.ts > supabase/seeds/26_large_inventory.sql
```

The script uses seeded random numbers for reproducibility - the same config produces identical output.

### UUID Prefixes

| Type | Prefix |
|------|--------|
| Inventory Items | `c10e8400` |
| Part Identifiers | `c20e8400` |
| Alternate Groups | `c30e8400` |
| Group Members | `c40e8400` |

## Adding New Seed Data

1. Create a new numbered file (e.g., `27_new_table.sql`)
2. Ensure the number reflects dependency order
3. Use `ON CONFLICT DO NOTHING` for idempotent inserts
4. Use consistent UUID patterns (see existing files for prefix conventions)
