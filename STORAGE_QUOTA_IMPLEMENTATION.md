# 5GB Image Storage Limit Implementation

## Summary

Implemented a hard 5GB storage limit per organization for image uploads. Once the limit is reached, users must delete existing images before uploading new ones.

## Changes Made

### 1. Database Functions ✅

Created Supabase functions in migration `add_storage_quota_enforcement`:

**`get_organization_storage_mb(org_id)`**
- Calculates total storage used by an organization in MB
- Sums all equipment note images and work order images
- Returns: `BIGINT` (storage in MB)

**`check_storage_limit(org_id, file_size_bytes, max_storage_gb)`**
- Checks if organization can upload a file of specified size
- Parameters:
  - `org_id`: Organization UUID
  - `file_size_bytes`: Size of file to upload
  - `max_storage_gb`: Maximum storage allowed (default: 5GB)
- Returns: `JSONB` with quota info:
  ```json
  {
    "can_upload": true/false,
    "current_storage_gb": 2.5,
    "max_storage_gb": 5,
    "file_size_mb": 1.5,
    "would_exceed": false,
    "remaining_gb": 2.5,
    "usage_percent": 50.0
  }
  ```

**`update_organization_storage()` (Trigger Function)**
- Automatically updates `organizations.storage_used_mb` when images are added/deleted
- Triggers:
  - `equipment_note_images_storage_trigger`
  - `work_order_images_storage_trigger`

### 2. Client-Side Utilities ✅

Created `src/utils/storageQuota.ts`:

**`checkStorageQuota(organizationId, fileSizeBytes)`**
- Calls database function to check quota
- Returns quota check result

**`validateStorageQuota(organizationId, fileSizeBytes)`**
- Throws error if quota exceeded
- Error message: "Storage limit reached. Your organization is using X GB of 5 GB..."

**`getCurrentStorage(organizationId)`**
- Gets current storage usage in MB

### 3. Service Updates ✅

**Equipment Note Images** (`src/services/equipmentNotesService.ts`):
- `createEquipmentNoteWithImages()` - Validates quota before uploading
- `uploadEquipmentNoteImage()` - Not yet updated (TODO: add validation)

**Work Order Images** (`src/services/workOrderNotesService.ts`):
- `createWorkOrderNoteWithImages()` - Validates quota before uploading

**Work Order Images Hook** (`src/hooks/useWorkOrderData.ts`):
- `useUploadWorkOrderImage()` - Validates quota before uploading

### 4. Automatic Tracking ✅

Database triggers automatically:
- Update `organizations.storage_used_mb` when images are added
- Update `organizations.storage_used_mb` when images are deleted
- Maintain accurate storage usage counts

## How It Works

### Upload Flow
1. User attempts to upload image(s)
2. Service calls `validateStorageQuota(orgId, fileSize)`
3. Database function `check_storage_limit()` is called:
   - Calculates current storage from all images
   - Checks if adding new file would exceed 5GB limit
   - Returns whether upload is allowed
4. If quota exceeded: Error thrown with helpful message
5. If quota OK: Upload proceeds as normal

### Quota Calculation
```typescript
// Sum all equipment note images for org
total_storage += SUM(equipment_note_images.file_size WHERE equipment.organization_id = org_id)

// Sum all work order images for org
total_storage += SUM(work_order_images.file_size WHERE work_order.organization_id = org_id)

// Check if adding new file would exceed limit
if ((total_storage + new_file_size) > 5GB) {
  // Block upload
}
```

## UI Feedback (TODO)

Need to create components to:
1. Show storage usage progress bar
2. Display remaining quota
3. Show error message when limit reached
4. Suggest deleting old images

Example UI locations:
- Equipment Details page
- Work Order Details page
- Organization Settings page

## Configuration

**Current Limit**: 5GB per organization (hard-coded in `MAX_STORAGE_GB`)

To change limit:
1. Update `src/utils/storageQuota.ts`: `MAX_STORAGE_GB = 5`
2. No database changes needed (function uses parameter)
3. Update user-facing documentation

## Testing Checklist

- [ ] Test upload when under 5GB - should succeed
- [ ] Test upload when at exactly 5GB - should block
- [ ] Test upload when over 5GB limit - should block
- [ ] Test multiple file upload - should sum all files
- [ ] Test after deleting images - storage should decrease
- [ ] Verify trigger updates storage correctly
- [ ] Check error message is user-friendly

## Error Messages

**Storage Limit Reached:**
```
Storage limit reached. Your organization is using X.XX GB of 5 GB (XX%). 
Cannot upload X.XX MB - only X.XX GB remaining. 
Please delete some images to free up space.
```

## Files Changed

```
src/
├── utils/storageQuota.ts                              ✅ New
├── services/equipmentNotesService.ts                   ✅ Updated
├── services/workOrderNotesService.ts                   ✅ Updated
└── hooks/useWorkOrderData.ts                          ✅ Updated

supabase/migrations/
└── 20250128000000_add_storage_quota_enforcement.sql  ✅ New (applied to prod)
```

## Future Enhancements

1. UI to display storage usage
2. Bulk delete images interface
3. Storage usage analytics dashboard
4. Increase limit dynamically (DB config table)
5. Different limits per plan (if billing returns)

## Notes

- Storage is tracked in the `organizations.storage_used_mb` column
- Calculation is done on-demand (not stored)
- Triggers keep storage counts accurate
- No data loss on quota enforcement
- Quota applies to total images, not per upload session

