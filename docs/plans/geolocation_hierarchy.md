# Geolocation Hierarchy - Implementation Summary

## Status: Implemented

All schema changes, frontend components, edge function updates, and utility code have been implemented and verified.

---

## 1. Schema Changes (5 migrations)

| Migration | File | Description |
|-----------|------|-------------|
| 1 | `20260208225242_add_org_scan_location_privacy.sql` | Added `scan_location_collection_enabled` boolean to `organizations` |
| 2 | `20260208225244_add_team_location_columns.sql` | Added `location_address`, `location_city`, `location_state`, `location_country`, `location_lat`, `location_lng`, `override_equipment_location` to `teams` |
| 3 | `20260208225245_add_equipment_assigned_location_columns.sql` | Added `assigned_location_street`, `assigned_location_city`, `assigned_location_state`, `assigned_location_country`, `assigned_location_lat`, `assigned_location_lng`, `use_team_location` to `equipment` |
| 4 | `20260208225350_add_equipment_location_history_table.sql` | Created `equipment_location_history` table with RLS, indexes, and policies |
| 5 | `20260208225353_add_scan_location_triggers.sql` | Created `enforce_scan_location_privacy` trigger, `log_scan_location_history` trigger, and `log_equipment_location_change` RPC |

---

## 2. Type Updates

- **Supabase types** regenerated (`src/integrations/supabase/types.ts`)
- **Team types** (`src/features/teams/types/team.ts`): Added `TeamLocation` interface and location fields to `Team`
- **Equipment types** (`src/features/equipment/types/equipment.ts`): Added `AssignedLocation`, `EffectiveLocation` interfaces, and assigned_location fields to form schema and `EquipmentRecord`
- **Fleet service** (`src/features/teams/services/teamFleetService.ts`): Added `'team'` to location source union

---

## 3. Frontend Implementation

### Effective Location Helper
- **File:** `src/utils/effectiveLocation.ts`
- Implements 3-tier priority: Team Override > Manual Assignment > Last Scan
- Includes Google Maps URL builders

### Feature Flag
- **File:** `src/lib/flags.ts`
- `GEOLOCATION_HIERARCHY_ENABLED` gated by `VITE_ENABLE_GEOLOCATION_HIERARCHY` env var

### Team Location Fields
- **Create:** `src/features/teams/components/CreateTeamDialog.tsx`
- **Edit:** `src/features/teams/components/TeamMetadataEditor.tsx`
- Google Places Autocomplete for address entry
- Override Equipment Location checkbox with tooltip
- Location data populated from Google Places structured fields

### EquipmentForm Structured Address
- **File:** `src/features/equipment/components/form/EquipmentStatusLocationSection.tsx`
- Legacy `location` field renamed to "Location Description"
- Collapsible "Assigned Address" section with Street, City, State, Country
- Helper text about auto-resolution of coordinates

### Organization Privacy Settings
- **File:** `src/features/organization/components/OrganizationSettings.tsx`
- "Privacy & Location" card with Switch toggle for QR Scan Location Collection
- Schema updated in `organizationSettingsSchema.ts`

### Scan Privacy (Client-Side)
- **File:** `src/features/equipment/pages/EquipmentDetails.tsx`
- `logScan` checks `scan_location_collection_enabled` before calling geolocation API
- Server-side trigger acts as safety net

### Fleet Map Hierarchy
- **File:** `src/features/teams/services/teamFleetService.ts`
- Updated query to fetch team and equipment location columns
- Implements 3-tier resolution: Team Override > Manual Assignment > Legacy/Scan

### Clickable Addresses
- **File:** `src/components/ui/ClickableAddress.tsx`
- Renders address as clickable Google Maps link
- Integrated into `EquipmentDetailsTab.tsx`

### Location History Logging
- **File:** `src/features/equipment/services/equipmentLocationHistoryService.ts`
- Non-blocking RPC calls to `log_equipment_location_change`
- Integrated into `useEquipmentForm.ts` for create/update operations

---

## 4. Edge Functions

### QuickBooks Customer Search
- **File:** `supabase/functions/quickbooks-search-customers/index.ts`
- Added `BillAddr` and `ShipAddr` to interface and response mapping
- Maps `CountrySubDivisionCode` to `State` for clarity

---

## 5. Location Resolution Flow

```
1. Equipment has Team AND team.override_equipment_location = true AND team has lat/lng
   → Use Team Location (source: 'team')

2. Equipment has assigned_location_lat AND assigned_location_lng
   → Use Manual Address (source: 'manual')

3. equipment.location parseable as "lat, lng" OR latest scan has coordinates
   → Use Last Scan (source: 'scan')

4. None of the above
   → No Location Available
```
