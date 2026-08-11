// Notification keys
export const notifications = {
  root: ['notifications'] as const,
  byOrg: (orgId: string) => ['notifications', orgId] as const,
};

/** Signed display URLs for the private `user-avatars` bucket. */
export const userAvatars = {
  root: ['resolved-avatar-url'] as const,
  resolvedUrl: (storedPathOrKey: string) =>
    ['resolved-avatar-url', storedPathOrKey] as const,
};

// Inventory keys
export const inventory = {
  root: ['inventory'] as const,
  list: (orgId: string, filters?: Record<string, unknown>) =>
    filters
      ? (['inventory', orgId, 'list', filters] as const)
      : (['inventory', orgId, 'list'] as const),
  listPrefix: (orgId: string) => ['inventory', orgId, 'list'] as const,
  metadata: (orgId: string) => ['inventory', orgId, 'metadata'] as const,
  itemImages: (orgId: string, itemId: string) =>
    ['inventory-item-images', orgId, itemId] as const,
  itemAlternates: (orgId: string, itemId: string) =>
    ['inventory-item-alternates', orgId, itemId] as const,
};

export const partsRoles = {
  managers: (orgId: string) => ['parts-managers', orgId] as const,
  isManager: (orgId: string, userId: string) =>
    ['is-parts-manager', orgId, userId] as const,
  consumers: (orgId: string) => ['parts-consumers', orgId] as const,
  isConsumer: (orgId: string, userId: string) =>
    ['is-parts-consumer', orgId, userId] as const,
};

// Ticket keys
export const tickets = {
  root: ['tickets'] as const,
  mine: () => ['tickets', 'mine'] as const,
};
