export type OperatorCheckinReportFormat = 'pdf' | 'xlsx';

export type OperatorCheckinReportDetailLevel = 'compact' | 'full';

export type OperatorCheckinChecklistMode = 'exceptions' | 'all';

export interface OperatorCheckinReportExportOptions {
  format: OperatorCheckinReportFormat;
  detailLevel: OperatorCheckinReportDetailLevel;
  includeOperatorFields: boolean;
  includeEquipmentSnapshot: boolean;
  includeClientContext: boolean;
  includeChecklist: boolean;
  checklistMode: OperatorCheckinChecklistMode;
  includeNotes: boolean;
}

export const DEFAULT_COMPACT_EXPORT_OPTIONS: OperatorCheckinReportExportOptions = {
  format: 'pdf',
  detailLevel: 'compact',
  includeOperatorFields: true,
  includeEquipmentSnapshot: false,
  includeClientContext: false,
  includeChecklist: true,
  checklistMode: 'exceptions',
  includeNotes: true,
};

export const FULL_AUDIT_EXPORT_OPTIONS: OperatorCheckinReportExportOptions = {
  format: 'pdf',
  detailLevel: 'full',
  includeOperatorFields: true,
  includeEquipmentSnapshot: true,
  includeClientContext: true,
  includeChecklist: true,
  checklistMode: 'all',
  includeNotes: true,
};

export function applyDetailPreset(
  preset: OperatorCheckinReportDetailLevel,
  current: OperatorCheckinReportExportOptions,
): OperatorCheckinReportExportOptions {
  const base = preset === 'full' ? FULL_AUDIT_EXPORT_OPTIONS : DEFAULT_COMPACT_EXPORT_OPTIONS;
  return { ...base, format: current.format };
}
