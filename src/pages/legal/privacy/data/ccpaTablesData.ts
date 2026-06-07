export interface CcpaPersonalInfoCategoryRow {
  category: string;
  examples: string;
  collected: string;
}

export const ccpaPersonalInfoCategories: CcpaPersonalInfoCategoryRow[] = [
  {
    category: 'Identifiers',
    examples: 'Name, email address, account ID',
    collected: 'Yes',
  },
  {
    category: 'Internet or Network Activity',
    examples: 'Browser push subscription tokens, user agent',
    collected: 'Yes',
  },
  {
    category: 'Geolocation Data',
    examples: 'GPS coordinates from QR code scans (when enabled by org admin)',
    collected: 'Yes (opt-in)',
  },
  {
    category: 'Professional or Employment Info',
    examples: 'Organization membership, role, team assignments',
    collected: 'Yes',
  },
  {
    category: 'Commercial Information',
    examples: 'Work order and invoice data (via QuickBooks integration, when activated)',
    collected: 'Conditional',
  },
  {
    category: 'Inferences / Activity Records',
    examples: 'Audit trail entries, scan history, notification records',
    collected: 'Yes',
  },
];

export interface CcpaRetentionPeriodRow {
  dataCategory: string;
  retentionPeriod: string;
}

export const ccpaRetentionPeriods: CcpaRetentionPeriodRow[] = [
  { dataCategory: 'User profiles', retentionPeriod: 'Account lifetime plus 30 days post-deletion' },
  { dataCategory: 'Audit log entries', retentionPeriod: '3 years (general) / 7 years (financial records)' },
  { dataCategory: 'QR scan records and location history', retentionPeriod: '3 years from record date' },
  { dataCategory: 'In-app notifications', retentionPeriod: '30 days' },
  { dataCategory: 'Push notification subscriptions', retentionPeriod: '90 days of inactivity' },
  {
    dataCategory: 'Organization invitations (expired/declined)',
    retentionPeriod: '30 days after expiry',
  },
  { dataCategory: 'User departure records', retentionPeriod: '90 days after processing' },
];
