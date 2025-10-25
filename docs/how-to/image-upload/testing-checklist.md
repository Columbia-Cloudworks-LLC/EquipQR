# Image Upload Functionality Testing Checklist

## Pre-Testing Setup

### Environment Preparation
- [ ] EquipQR application running on localhost:8080
- [ ] User logged in with technician permissions
- [ ] Test equipment record available (ID: d051d130-fc60-4a62-8f11-32807ba9b269)
- [ ] Test images available in .local-equipment-photos directory
- [ ] Browser developer tools open for debugging

### Test Images Available
- [ ] Forklift-001.jpg
- [ ] Forklift-002.jpg
- [ ] Forklift-003.jpg
- [ ] Forklift-004.jpg
- [ ] Additional equipment images as needed

## Core Image Upload Testing

### 1. Equipment Page Access
- [ ] Navigate to equipment page successfully
- [ ] Equipment details load correctly
- [ ] All tabs visible (Details, Notes, Work Orders, Images, Scans)
- [ ] Equipment image displays (if available)

### 2. Work Order Creation
- [ ] Click "Work Orders" tab
- [ ] Click "Create Work Order" button
- [ ] Work order form opens
- [ ] Fill required fields:
  - [ ] Title: "Test Image Upload Work Order"
  - [ ] Priority: Select appropriate level
  - [ ] Description: "Testing image upload functionality"
- [ ] Click "Create Work Order" to save

### 3. Image Upload via Work Order Notes
- [ ] Open created work order
- [ ] Scroll to "Add Note" section
- [ ] Fill note details:
  - [ ] Note Content: "Testing image upload with work order note"
  - [ ] Hours Worked: Enter test value
  - [ ] Private Note: Test both checked and unchecked
- [ ] Upload test images:
  - [ ] Click "Choose Files" button
  - [ ] Select Forklift-001.jpg
  - [ ] Select Forklift-002.jpg (multiple images)
  - [ ] Verify images appear in preview
- [ ] Click "Add Note" to save
- [ ] Verify note appears with images

### 4. Image Upload via Equipment Notes
- [ ] Go to "Notes" tab in equipment page
- [ ] Click "Add Note" button
- [ ] Fill note details:
  - [ ] Note Content: "Testing direct equipment note with images"
  - [ ] Hours Worked: Enter test value
- [ ] Upload test images:
  - [ ] Click "Choose Files" button
  - [ ] Select Forklift-003.jpg
  - [ ] Verify image appears in preview
- [ ] Click "Add Note" to save
- [ ] Verify note appears with image

### 5. Image Gallery Verification
- [ ] Go to "Images" tab in equipment page
- [ ] Verify uploaded images appear in gallery
- [ ] Check image information:
  - [ ] Upload date displayed
  - [ ] Uploaded by information
  - [ ] Source (work order vs equipment note)
- [ ] Test image viewing:
  - [ ] Click on image to view full size
  - [ ] Navigate between images
  - [ ] Close image viewer

### 6. Display Image Setting
- [ ] In Images tab, find uploaded image
- [ ] Click "Set as Display Image" button
- [ ] Confirm selection in dialog
- [ ] Verify image becomes main equipment photo
- [ ] Check equipment page shows new display image

## PM Checklist Testing

### 7. PM Checklist Work Order Creation
- [ ] Create new work order
- [ ] Check "Include PM Checklist" option
- [ ] Select "Forklift PM Checklist" template
- [ ] Click "Create Work Order"
- [ ] Verify PM checklist appears in work order

### 8. PM Checklist Initialization
- [ ] Open work order with PM checklist
- [ ] Click "Initialize Checklist" if needed
- [ ] Verify all checklist items appear
- [ ] Check sections are organized properly

### 9. PM Checklist Completion
- [ ] Click "Set All to OK" button
- [ ] Verify all items marked as condition 2 (Good)
- [ ] Select individual items for detailed work:
  - [ ] Change condition to 4 (Poor)
  - [ ] Add detailed notes explaining issue
  - [ ] Upload image showing problem
- [ ] Click "Save Changes"
- [ ] Verify changes are saved

### 10. PM Checklist Progress Saving
- [ ] Make changes to checklist items
- [ ] Verify auto-save indicator shows "Saving"
- [ ] Wait for "Saved" confirmation
- [ ] Refresh page and verify changes persist
- [ ] Test manual save button

## Work Order Management Testing

### 11. Work Order Status Changes
- [ ] Open work order details
- [ ] Click status dropdown
- [ ] Change status from "Pending" to "In Progress"
- [ ] Add status change notes
- [ ] Save changes
- [ ] Change status to "Completed"
- [ ] Verify status updates correctly

### 12. Parts and Costs Addition
- [ ] Go to "Costs" section in work order
- [ ] Click "Add Item" button
- [ ] Fill item details:
  - [ ] Item Name: "Test Part"
  - [ ] Quantity: 2
  - [ ] Unit Cost: 25.00
  - [ ] Description: "Test part for image upload testing"
- [ ] Save item
- [ ] Verify item appears in costs list
- [ ] Add labor cost item
- [ ] Verify total cost calculation

### 13. Private Notes Testing
- [ ] Add new note with "Private Note" toggle ON
- [ ] Add note content: "This is a private note for testing"
- [ ] Upload test image with private note
- [ ] Save note
- [ ] Verify note appears with private indicator
- [ ] Add public note for comparison
- [ ] Verify both notes display correctly

## Error Handling Testing

### 14. Upload Error Scenarios
- [ ] Test unsupported file format (e.g., .txt file)
- [ ] Test oversized file (>10MB)
- [ ] Test upload with poor network connection
- [ ] Test upload with no internet connection
- [ ] Verify appropriate error messages

### 15. Save Error Scenarios
- [ ] Test saving with invalid data
- [ ] Test saving with network issues
- [ ] Test saving with permission errors
- [ ] Verify error handling and user feedback

## Mobile Interface Testing

### 16. Mobile Image Upload
- [ ] Test on mobile device or mobile browser view
- [ ] Navigate to equipment page
- [ ] Create work order on mobile
- [ ] Upload images using mobile interface
- [ ] Verify mobile-specific UI elements

### 17. Mobile PM Checklist
- [ ] Test PM checklist on mobile
- [ ] Verify touch interactions work
- [ ] Test image upload on mobile
- [ ] Verify mobile-specific layouts

## Performance Testing

### 18. Large Image Upload
- [ ] Upload high-resolution images
- [ ] Test multiple large image uploads
- [ ] Monitor upload progress indicators
- [ ] Verify system performance

### 19. Multiple Concurrent Operations
- [ ] Upload images while saving PM checklist
- [ ] Add notes while changing work order status
- [ ] Test auto-save during image upload
- [ ] Verify no conflicts or data loss

## Data Integrity Testing

### 20. Image Association Verification
- [ ] Verify images uploaded via work orders appear in equipment Images tab
- [ ] Verify images uploaded via equipment notes appear in Images tab
- [ ] Check image metadata is correct
- [ ] Verify image URLs are accessible

### 21. Cross-Reference Testing
- [ ] Verify work order notes link to correct equipment
- [ ] Verify PM checklist items save correctly
- [ ] Verify cost items are properly associated
- [ ] Verify status changes are recorded

## Cleanup and Documentation

### 22. Test Data Cleanup
- [ ] Remove test work orders
- [ ] Remove test equipment notes
- [ ] Remove test images from gallery
- [ ] Reset equipment display image if needed

### 23. Screenshot Documentation
- [ ] Take screenshots of each major step
- [ ] Add green arrows to highlight important elements
- [ ] Save screenshots in docs/how-to/image-upload/screenshots/
- [ ] Update documentation with actual screenshots

## Test Results Summary

### Pass/Fail Tracking
- [ ] Total tests: 23 categories
- [ ] Passed: ___ tests
- [ ] Failed: ___ tests
- [ ] Issues found: ___ issues

### Issues to Report
- [ ] List any bugs or issues found
- [ ] Note any UI/UX improvements needed
- [ ] Document any performance issues
- [ ] Record any missing functionality

### Recommendations
- [ ] Document any workflow improvements
- [ ] Note any additional training needed
- [ ] Suggest documentation updates
- [ ] Recommend feature enhancements

---

**Testing Date**: ___________
**Tester**: ___________
**Environment**: localhost:8080
**Browser**: ___________
**Mobile Device**: ___________
