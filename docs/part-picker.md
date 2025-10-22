# Part Picker v0

## Setup

### 1. Configure Environment

**Local `.env` file:**
```ini
# Typesense Cloud Configuration
TYPESENSE_HOST=uzv2k15o4eb608awp-1.a1.typesense.net
TYPESENSE_PORT=443
TYPESENSE_PROTOCOL=https
TYPESENSE_API_KEY=UCiHFzc4IbjDaR1YOzW9MUyfWTChGBiJ

# Admin key for scripts (seed, index, ensure-collections)
# SENSITIVE - DO NOT COMMIT
TYPESENSE_ADMIN_API_KEY=xbtr6YhQCoE9BzOVbjJgCaArB9iqxlf5

# Supabase (if not already set)
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

**Supabase Edge Function Secrets** (via Dashboard → Project Settings → Edge Functions):
```
TYPESENSE_HOST=uzv2k15o4eb608awp-1.a1.typesense.net
TYPESENSE_PORT=443
TYPESENSE_PROTOCOL=https
TYPESENSE_API_KEY=UCiHFzc4IbjDaR1YOzW9MUyfWTChGBiJ
```
*(Use search-only key for edge functions)*

### 2. Initialize Typesense Collection
```bash
npm run typesense:ensure
```
*(No Docker needed - using Typesense Cloud)*

**Note:** Scripts use `tsx` and automatically load `.env` via `dotenv`

### 3. Run Database Migration
Run migration via Supabase CLI or Studio to create tables from:
`supabase/migrations/20251021_part_picker.sql`

### 4. Seed and Index
```bash
npm run seed:parts   # Populates Postgres
npm run index:parts  # Indexes to Typesense Cloud
```

## Edge Functions
- parts-search: POST body params `q` (required), `brand?`, `category?`, `limit?`
- part-detail: POST body param `id` (required)

## API Shapes
- Search result item:
```
{ id, canonical_mpn, title, brand, category, distributor_count, has_distributors }
```
- Detail:
```
{ part: { id, canonical_mpn, title, brand, category, description, attributes, synonyms }, distributors: [{ name, phone, website, email }] }
```

## UI
- Route: `/dashboard/part-picker` (redirect from `/part-picker`)
- Instant search, Enter opens first result
- Detail shows distributors table with tel:/http links
