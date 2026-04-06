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
  description: 'Polished internal packet for a single work order, including photo evidence pages. Use Google Sheets for bulk exports.',
  includeByDefault: [
    'branded header and summary',
    'labor activity with photo context',
    'materials and costs',
    'pm checklist',
    'timeline',
    'photo evidence appendix',
  ],
  excludeAlways: [
    'private notes',
  ],
};

export const FIELD_WORKSHEET_EXPORT_POLICY: WorkOrderExportPolicy = {
  audience: 'internal',
  exportName: 'Printable Field Worksheet',
  title: 'Printable Field Worksheet',
  description: 'Handwriting-friendly worksheet for technicians to complete PM checklists and log notes on paper. Results must be re-entered into EquipQR.',
  includeByDefault: [
    'work order summary and dates',
    'equipment details',
    'pm checklist items with blank condition boxes',
    'blank labor summary rows',
    'blank parts and materials rows',
    'follow-up issues area',
    'technician certification and signature',
    're-entry attestation footer',
  ],
  excludeAlways: [
    'private notes',
    'existing note content',
    'cost data',
    'photos and images',
    'internal metadata and integration logs',
  ],
};
