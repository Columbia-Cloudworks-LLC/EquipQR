# Inventory Guides Screenshots

This directory contains screenshots for the Inventory Management Guides documentation.

## Screenshot Naming Convention

Screenshots should follow this naming pattern:
```
[sequence]-[descriptive-name].png
```

### Parts Manager Journey (01-09)
| File | Description |
|------|-------------|
| `01-nav-inventory.png` | Sidebar with Inventory highlighted |
| `02-parts-managers-button.png` | Inventory page header with Parts Managers button |
| `03-managers-empty.png` | Empty parts managers panel |
| `04-select-members.png` | Member selection dialog with checkboxes |
| `05-managers-added.png` | Parts managers panel showing added members |

### Inventory Items Journey (10-49)
| File | Description |
|------|-------------|
| `10-add-item-button.png` | Inventory page with Add Item button |
| `11-form-basic-info.png` | Inventory form showing basic info fields |
| `12-form-stock-info.png` | Inventory form showing quantity fields |
| `13-item-created.png` | Inventory list with newly created item |
| `20-rules-empty.png` | Empty compatibility rules section |
| `21-rules-manufacturer.png` | Manufacturer dropdown selection |
| `22-rules-match-types.png` | Match type selection dropdown |
| `23-rules-status.png` | Rule status selection |
| `24-rules-complete.png` | Complete rule with match count |
| `30-item-detail.png` | Inventory item detail page overview |
| `31-adjust-button.png` | Item detail with Adjust Quantity button |
| `32-adjust-dialog.png` | Quantity adjustment dialog |
| `33-transactions.png` | Transaction history tab |
| `40-qr-button.png` | QR code button on item detail |
| `41-qr-display.png` | QR code display dialog |

### Alternate Groups Journey (50-99)
| File | Description |
|------|-------------|
| `50-nav-groups.png` | Sidebar showing Alternate Groups link |
| `51-groups-page.png` | Alternate Groups page with New Group button |
| `52-create-group-dialog.png` | Create group dialog with form fields |
| `53-group-created.png` | Groups page showing newly created group |
| `60-group-detail-empty.png` | Empty group detail page |
| `61-add-item-dialog.png` | Add inventory item dialog with search |
| `62-item-added.png` | Group detail showing added inventory item |
| `70-add-part-number.png` | Group detail with Add Part Number button |
| `71-part-number-type.png` | Part number type selection dropdown |
| `72-part-number-form.png` | Part number form with value and manufacturer |
| `73-part-numbers-list.png` | Group detail showing added part numbers |
| `80-edit-group-status.png` | Edit group dialog with status dropdown |
| `81-group-verified.png` | Group detail page with verified badge |

## Screenshot Guidelines

### Technical Requirements
- **Format**: PNG (preferred) or WebP
- **Resolution**: 1280px wide (desktop), retina-ready (2x) preferred
- **Aspect Ratio**: Capture the relevant UI section, not full screen
- **File Size**: Optimize images (use tools like ImageOptim, TinyPNG)

### Visual Guidelines
- Use light theme for consistency (dark theme optional as secondary)
- Ensure the app has realistic seed data populated
- Login as an admin/owner to show all UI elements
- Highlight the relevant button/element with a red box or arrow annotation
- Blur or redact any sensitive test data if needed

### Capture Tips
1. Use browser DevTools to set viewport to 1280px width
2. Use "Capture node screenshot" in DevTools for precise element captures
3. For dialogs/modals, capture the entire dialog including backdrop
4. Include enough context to orient the user (page header, etc.)

## Adding Screenshots to the Guide

Screenshots are referenced in `src/components/support/InventoryGuides.tsx` using the `screenshotId` prop:

```tsx
<GuideStep
  step={1}
  title="Navigate to Inventory"
  description="Click Inventory in the sidebar..."
  screenshotId="guides/inventory/01-nav-inventory"
  screenshotAlt="Sidebar with Inventory highlighted"
/>
```

Once screenshots are added, update the `GuideStep` component to render actual images instead of placeholders.
