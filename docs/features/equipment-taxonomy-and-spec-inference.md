# Equipment Taxonomy & Specification Inference

EquipQR provides deterministic make/model normalization, category typeahead, and optional specification inference during equipment creation and editing (`#1510`).

## Data Sources & Attribution

1. **Prior Fleet Units (`shop` — System of Record)**
   - Organization-scoped accepted specifications stored in `public.organization_equipment_spec_cache` (keyed by normalized manufacturer + model).
   - Once a shop confirms specifications on a unit, subsequent units of the same normalized make and model reuse the shop's verified category, subtype, and baseline specs.
2. **Local Open Equipment Taxonomy Seed (`taxonomy` — Offline-First)**
   - Derived from the Boom & Bucket Open Equipment Taxonomy and normalized manufacturer/model alias tables (`src/features/equipment/data/equipmentTaxonomySeed.ts`).
   - Resolves common shorthand (`CAT` → `Caterpillar`, `JD` → `John Deere`, `320GC` → `320 GC`, `8FGU25` → `Toyota 8FGU25`) and suggests equipment category and subtype even when offline.
3. **NHTSA vPIC Highway VIN Decoder (`vpic` — Public Domain, Online-Only)**
   - Uses the U.S. Department of Transportation / NHTSA Product Information Catalog and Vehicle Listing (`https://vpic.nhtsa.dot.gov/api/`).
   - Guarded by strict 17-character ISO 3779 / NHTSA check-digit validation (`validateHighwayVin`). Off-highway equipment serial numbers and PINs are never sent to vPIC.
4. **U.S. EPA Nonroad & Heavy-Duty Engine Certification Data (`epa` — Public Domain)**
   - Matches 12-character EPA engine family codes from machine emissions plates (e.g. `PCEXL06.7AAB`, `RJDXL04.5305`) to engine manufacturer, displacement, horsepower band, and emissions tier (`Tier 4 Final`, etc.).

## Honesty Clause & Explicit Non-Claims

- **Human-in-the-loop only:** Inferred specifications are presented as a suggestion banner with explicit **Accept Suggestion** and **Ignore** actions. Ignored suggestions are never persisted, and shop-entered values are never overwritten without confirmation.
- **Not a universal off-highway serial-to-year decoder:** Off-highway machine PINs do not follow a public check-digit year standard; EquipQR never fabricates model years from off-highway serial numbers.
- **Not an OEM dealer parts fitment graph:** Taxonomy inference classifies machines and populates baseline attributes; part interchangeability continues to use organization-managed compatibility rules and alternate groups.
