// Notification keys
export const notifications = {
  root: ['notifications'] as const,
  byOrg: (orgId: string) => ['notifications', orgId] as const,
};

// Inventory keys
export const inventory = {
  root: ['inventory'] as const,
  itemImages: (orgId: string, itemId: string) =>
    ['inventory-item-images', orgId, itemId] as const,
  itemAlternates: (orgId: string, itemId: string) =>
    ['inventory-item-alternates', orgId, itemId] as const,
};

// Ticket keys
export const tickets = {
  root: ['tickets'] as const,
  mine: () => ['tickets', 'mine'] as const,
};
