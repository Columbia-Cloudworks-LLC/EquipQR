/**
 * Audit Log Explorer (issue #641) — re-exports the Logflare-style explorer
 * surface so consumers can import everything from a single canonical path.
 */

export {
  AuditExplorer,
  type AuditExplorerProps,
} from './AuditExplorer';
export {
  AuditTimelineHistogram,
  type AuditTimelineHistogramProps,
} from './AuditTimelineHistogram';
export {
  AuditLogTimeRangePicker,
  type AuditLogTimeRangePickerProps,
} from './AuditLogTimeRangePicker';
export {
  AuditLogList,
  VIRTUALIZATION_THRESHOLD,
  type AuditLogListProps,
} from './AuditLogList';
export {
  AuditLogDetailPanel,
  type AuditLogDetailPanelProps,
} from './AuditLogDetailPanel';
