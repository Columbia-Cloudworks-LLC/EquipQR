/**
 * Audit Components Index
 *
 * Exports the audit-component surface. The org-wide /audit-log page is
 * now driven by the Logflare-style explorer in ./explorer/ (issue #641);
 * the legacy AuditLogTable and AuditEntryDetailSheet were deleted in the
 * same change.
 */

export { HistoryTab } from './HistoryTab';
export { ChangesDiff, ChangesSummary } from './ChangesDiff';
export { default as AuditLogToolbar } from './AuditLogToolbar';
export { default as AuditLogFilterPopover } from './AuditLogFilterPopover';
export { default as AuditLogDownloadMenu } from './AuditLogDownloadMenu';

// New Logflare-style explorer
export {
  AuditExplorer,
  AuditTimelineHistogram,
  AuditLogTimeRangePicker,
  AuditLogList,
  AuditLogDetailPanel,
  VIRTUALIZATION_THRESHOLD,
  type AuditExplorerProps,
  type AuditTimelineHistogramProps,
  type AuditLogTimeRangePickerProps,
  type AuditLogListProps,
  type AuditLogDetailPanelProps,
} from './explorer';
