# Part Picker Administration

## Overview

The part picker admin tools let maintainers curate structured metadata for the searchable parts catalog. The UI lives behind a development-only route and reuses the super admin access checks that protect other debug dashboards.

- **Page**: `src/pages/PartPickerAdmin.tsx`
- **Route**: `/dashboard/debug/part-picker` (only available when `import.meta.env.DEV` is truthy)
- **Sidebar**: Appears under the **Debug** group for super admins in development builds

## Access Control

The page reuses `useSuperAdminAccess`, so only maintainers who are owners or admins of the configured super admin organization can view or mutate catalog data. Non-authorized users see an inline access-denied message.

## Managing Part Metadata

Use the **New part** button (or the edit action in the table) to open the part form. The dialog supports:

- Canonical MPN (unique key used by the picker and seed scripts)
- Title (display label)
- Brand and description
- Synonyms (comma or newline separated, stored as a `text[]`)

Creating or updating a part immediately invalidates the React Query cache and refreshes the table. All writes go directly through the Supabase client to the `part` table, so edits are reflected in downstream scripts and the Typesense indexer.

## Managing Identifiers

Select **Identifiers** on any row to open the identifier management dialog. Maintainers can:

1. Choose the identifier type (`MPN`, `SKU`, `OEM`, `UPC`, `EAN`)
2. Enter the raw identifier value (normalization happens automatically with `normalizePartNumber`)
3. Save new identifiers or update existing rows

Identifiers persist to the `part_identifier` table. Each mutation re-fetches the part so the dialog stays in sync.

## Managing Distributor Listings

Select **Listings** to link a part to one or more distributors. The dialog lets maintainers:

1. Choose a distributor from the live `distributor` table
2. Provide an optional distributor SKU
3. Save new or updated listings (stored in `distributor_listing`)

Existing listings appear in a table within the dialog with inline edit actions.

## Seed and Index Scripts

The existing scripts continue to function without modification:

- `scripts/seed-parts.ts` upserts canonical part rows and will not throw if manual edits exist. Identifiers created via the UI are additive and the script still inserts default identifiers when run with a service key.
- `scripts/index-parts.ts` reads the same metadata fields (`canonical_mpn`, `title`, `brand`, `category`, `synonyms`) and remains compatible with the editable schema.

Because the admin UI performs standard Supabase CRUD, no additional migration work is required for local development. After editing data via the dashboard, re-run the seed or index scripts as needed to refresh Typesense.

## Related Components

- `src/components/ui` – shared shadcn-inspired primitives used for tables, dialogs, and buttons
- `src/lib/parts/normalize.ts` – normalization helpers used when writing identifiers
- `src/hooks/useSuperAdminAccess.ts` – access guard shared with other admin views
