import type { PrivacyDataCategoryRow } from '@/components/legal/PrivacyDataCategoryTable';

export const organizationDataCategories: PrivacyDataCategoryRow[] = [
  {
    category: 'Organization Profile',
    dataPoints:
      'Organization name, subscription plan (free or premium), logo image, brand background color, and feature configuration flags (e.g., fleet map enabled, customers feature enabled, scan location collection enabled).',
  },
  {
    category: 'Equipment Records',
    dataPoints:
      'Equipment name, manufacturer, model, serial number, status (active / maintenance / inactive), installation date, warranty expiration date, last maintenance date, free-form notes, custom key-value attributes, photos, GPS coordinates (both from QR scans and manual assignment), assigned address fields (street, city, state, country), and a complete location change history with source attribution (scan, manual, team sync, or QuickBooks).',
  },
  {
    category: 'Work Orders',
    dataPoints:
      'Title, description, priority, status, assigned technician, creator identity, due date, estimated hours, labor entries (date, technician, hours, notes), cost line items (description, quantity, unit price), photos and attachments, notes, preventive maintenance checklists, and completion timestamps.',
  },
  {
    category: 'Teams',
    dataPoints:
      'Team name, description, physical address and GPS coordinates, and member roster with role assignments (manager, technician, or viewer).',
  },
  {
    category: 'Inventory',
    dataPoints:
      'Item name, description, SKU, external ID, quantity on hand, low-stock threshold, default unit cost, storage location, item image, and a full transaction history (usage, restock, adjustment records with quantities, dates, and the user who made the change).',
  },
  {
    category: 'Customers',
    dataPoints:
      'Customer name and active/inactive status. Customers may be linked to teams and equipment for organizational tracking purposes.',
  },
  {
    category: 'Memberships & Invitations',
    dataPoints:
      'Member email address, organization-level role (owner, admin, or member), join date, and membership status. Invitations include the invitee email, invited role, invitation token, optional personal message, and expiration date.',
  },
  {
    category: 'File Uploads',
    dataPoints:
      'Images and photos attached to work orders and equipment notes. For each file we store: the original filename, file size, MIME type, an optional description, and the identity of the user who uploaded it.',
  },
  {
    category: 'Audit Trail',
    dataPoints:
      "An append-only, immutable log of every create, update, and delete action performed on equipment, work orders, inventory items, preventive maintenance records, organization memberships, team memberships, and teams. Each log entry records the actor's identity (user ID, name, email), timestamp, entity affected, and the specific fields that changed (old and new values). This log is maintained for compliance and accountability purposes (including OSHA, DOT, and ISO standards).",
  },
  {
    category: 'In-App Notifications',
    dataPoints:
      'Notification titles, messages, type (e.g., work order assigned, ownership transfer request), and read/unread status.',
  },
  {
    category: 'Preventive Maintenance Templates',
    dataPoints:
      'Checklist template names, descriptions, and structured checklist item data created by organization members for reuse across work orders.',
  },
];
