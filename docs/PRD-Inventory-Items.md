Here is the comprehensive plan and feature specification formatted for you to provide to Cursor.

### Recommended Branch Name

`feature/local-inventory-system`

---

### **Cursor Feature Spec: Local Inventory & Audit System**

**Context:**
We are scrapping the previous "Global Part Picker" architecture. We are implementing a **Local Organization Inventory** system. This allows organizations to track their own stock, manage distinct items, and audit all usage (specifically linking parts usage to Work Orders).

**Core Philosophy:**

1. **Local Truth:** No global catalog. Organizations own their data.
2. **Audit Everything:** Every stock change (add/remove) is a transaction logged with a user and reason.
3. **Race Condition Safe:** Stock adjustments must happen via Database RPC to prevent concurrent overwrite issues.
4. **Flexible Scanning:** Support scanning specific internal QR codes (Bin/Shelf) OR generic manufacturer barcodes (Box).

---

### **Phase 1: Database Architecture (Supabase)**

**1. Clean Up Old Migrations**

* **Drop Tables:** `distributor_listing`, `distributor`, `part_identifier`, `part`.
* **Remove:** Any associated RLS policies or indexes.

**2. New Schema**

* **`inventory_items`**
  * `id` (uuid, PK)
  * `organization_id` (uuid, FK to organizations)
  * `name` (text, required)
  * `description` (text)
  * `sku` (text, nullable - Internal ID)
  * `external_id` (text, nullable - UPC/EAN/Manufacturer Barcode)
  * `quantity_on_hand` (integer, default 0, **allow negative**)
  * `low_stock_threshold` (integer, default 5)
  * `image_url` (text, nullable)
  * `location` (text, e.g., "Shelf A")
  * `created_by` (uuid, FK to profiles)
  * `default_unit_cost` (numeric, nullable - strictly for auto-filling forms, not binding)
  * *Timestamps (created_at, updated_at)*
* **`inventory_transactions`** (The Audit Log)
  * `id` (uuid, PK)
  * `inventory_item_id` (uuid, FK)
  * `organization_id` (uuid, FK - for easier filtering)
  * `user_id` (uuid, FK)
  * `previous_quantity` (integer)
  * `new_quantity` (integer)
  * `change_amount` (integer, e.g., -1, +10)
  * `transaction_type` (text: 'usage', 'restock', 'adjustment', 'initial', 'work_order')
  * `work_order_id` (uuid, FK, nullable - critical for tracking usage)
  * `notes` (text)
  * `created_at` (timestamptz)
* **`equipment_part_compatibility`** (Junction Table)
  * `equipment_id` (uuid, FK)
  * `inventory_item_id` (uuid, FK)
  * *Constraint: Compound Primary Key*
* **`inventory_item_managers`** (Role Assignment)
  * `inventory_item_id` (uuid, FK)
  * `user_id` (uuid, FK)
* **`organizations` update:**
  * Add `default_inventory_manager_id` (uuid, nullable) column.

**3. Database Functions (RPC)**

* **`adjust_inventory_quantity`**:
  * **Inputs:** `item_id`, `delta` (amount to change), `user_id`, `reason`, `work_order_id` (optional).
  * **Logic:**
        1. `SELECT ... FOR UPDATE` to lock the inventory row.
        2. Calculate new qty (`current + delta`).
        3. `UPDATE inventory_items`.
        4. `INSERT INTO inventory_transactions`.
        5. Return new quantity.

---

### **Phase 2: Backend Logic & Edge Functions**

**1. Scan Resolution Logic (`resolve-inventory-scan`)**

* **Input:** `scanned_value` (text), `user_id` (uuid).
* **Logic:**
    1. **Check Current Org:** Look for `inventory_items` where `external_id` OR `id` matches `scanned_value` in the user's *active* organization.
        * *Found:* Return `{ type: 'inventory', id: ..., orgId: current, action: 'view' }`.
    2. **Check Other Orgs:** If not found, look in *other* organizations the user is a member of.
        * *Found (1):* Return `{ type: 'inventory', id: ..., orgId: other, action: 'switch_prompt' }`.
        * *Found (>1):* Return `{ type: 'inventory', matches: [...], action: 'select_org_prompt' }`.
    3. **Check Equipment:** (Fallback to existing equipment logic).

---

### **Phase 3: Frontend Implementation**

**1. Inventory Management Views**

* **List View:** Filterable table (Name, SKU, Qty, Location). Low stock items highlighted.
* **Add/Edit Item:** Form with "Bulk Compatible Equipment" selector and "Bulk Manager Assignment" (defaulting to the Org's default manager).
* **Item Detail:**
  * Basic Info & Image.
  * **Transaction History Tab:** A timeline showing who took what and when.
  * **Compatibility Tab:** List of linked equipment.

**2. Scanner Integration**

* Update `QRScannerComponent` to handle the new `inventory` response types.
* Update `QRRedirectHandler` to handle the "Switch Organization" flow for parts (reusing the logic we have for equipment).

**3. Work Order Integration (`WorkOrderCostForm.tsx`)**

* **New Interaction:** "Add Part from Inventory".
* **Flow:**
    1. User clicks "Add Part".
    2. Modal shows **Compatible Parts** (filtered by the Work Order's Equipment ID).
    3. User selects Part + Quantity.
    4. **System Action:**
        * Calls RPC `adjust_inventory_quantity(delta: -Qty, work_order_id: current)`.
        * Creates a `work_order_costs` record (Snapshotting the cost at that moment).
    5. **Validation:** If Qty goes < 0, show a warning toast ("Inventory is now negative: -2"), but **allow** the transaction.

---

### **Implementation Order**

1. **Migration:** Generate and run the SQL migration (Drop old, Create new, Create RPC).
2. **Types:** Generate `src/integrations/supabase/types.ts`.
3. **Edge Function:** Create the scan resolver.
4. **UI - Foundation:** Create the Inventory List and Add/Edit forms.
5. **UI - Work Order:** Integrate the "Pick from Inventory" logic into Work Orders.
6. **UI - Scanner:** Connect the scanner to the new resolution logic.
