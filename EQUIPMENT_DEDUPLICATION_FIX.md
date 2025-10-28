# Equipment Deduplication Fix

## Issue
**Priority:** P1  
**Badge:** Deduplicate equipment list before linking to work order

## Problem Description
The work order creation flow had a bug where equipment IDs were duplicated:

1. **Form Initialization** (`useWorkOrderForm.ts` line 60):
   - Seeds `equipmentIds` array with the primary equipment ID
   - `equipmentIds: equipmentId ? [equipmentId] : []`

2. **Creation Hook** (`useWorkOrderCreationEnhanced.ts` line 83):
   - Merges `equipmentId` with `equipmentIds` array
   - `const equipmentIds = [data.equipmentId, ...(data.equipmentIds || [])]`

3. **Result**:
   - When no additional equipment is selected, array contains `[primaryId, primaryId]`
   - Violates UNIQUE(work_order_id, equipment_id) constraint in `work_order_equipment` table
   - Shows error toast to user even though they didn't add duplicate equipment
   - `createPMsForEquipment` generates duplicate PM entries for same equipment

## Solution Implemented
Modified `src/hooks/useWorkOrderCreationEnhanced.ts` line 84 to deduplicate the equipment array:

**Before:**
```typescript
const equipmentIds = [data.equipmentId, ...(data.equipmentIds || [])];
```

**After:**
```typescript
const equipmentIds = Array.from(new Set([data.equipmentId, ...(data.equipmentIds || [])]));
```

## How It Works
- Uses JavaScript `Set` to automatically remove duplicate IDs
- `Array.from()` converts Set back to array
- Preserves order (primary equipment first)
- Works correctly for both single and multi-equipment scenarios

## Impact
✅ Fixes UNIQUE constraint violations in `work_order_equipment` table  
✅ Prevents duplicate PM records for same equipment  
✅ Removes false error toast when creating work orders with single equipment  
✅ Maintains existing functionality for multi-equipment work orders  
✅ Single line change with minimal risk

## Testing Recommendations
1. Create work order with single equipment (no additional equipment selected)
   - Should succeed without errors
   - Should create one entry in `work_order_equipment`
   - If PM enabled, should create one PM record

2. Create work order with multiple equipment
   - Should link all unique equipment
   - Should handle if user somehow selects primary equipment twice

3. Create work order with PM template
   - Should create PM for each unique equipment only once

## Files Modified
- `src/hooks/useWorkOrderCreationEnhanced.ts` (1 line changed, 1 comment added)

## Date
January 28, 2025

