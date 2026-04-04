export type WorkOrderExportAudience = 'external' | 'internal';

export interface WorkOrderExportPolicy {
  audience: WorkOrderExportAudience;
  exportName: string;
  title: string;
  description: string;
  includeByDefault: string[];
  includeByApproval?: string[];
  excludeAlways: string[];
}

export const SERVICE_REPORT_EXPORT_POLICY: WorkOrderExportPolicy = {
  audience: 'external',
  exportName: 'Service Report PDF',
  title: 'Service Report PDF',
  description: 'Polished, customer-safe report designed to be shared externally.',
  includeByDefault: [
    'work order summary and dates',
    'equipment details',
    'customer name when available',
    'pm checklist outcomes',
    'public notes and photos',
  ],
  includeByApproval: [
    'line-item costs and totals',
    'labor hours',
    'exact location fields',
  ],
  excludeAlways: [
    'private notes',
    'internal status history reasons',
    'internal metadata and integration logs',
  ],
};

export const INTERNAL_WORK_ORDER_PACKET_POLICY: WorkOrderExportPolicy = {
  audience: 'internal',
  exportName: 'Internal Work Order Packet',
  title: 'Internal Work Order Packet',
  description: 'Complete operational export for shop and office workflows.',
  includeByDefault: [
    'summary worksheet',
    'labor detail worksheet',
    'materials and costs worksheet',
    'pm checklist worksheet',
    'timeline worksheet',
    'equipment worksheet',
  ],
  excludeAlways: [
    'private notes',
  ],
};
