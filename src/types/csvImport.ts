export interface MappedRow {
  rowIndex: number;
  name?: string;
  manufacturer?: string;
  model?: string;
  serial?: string;
  location?: string;
  last_maintenance?: string;
  customAttributes: Record<string, string | number | boolean | null>;
  raw: Record<string, string>;
}

export interface ImportPreviewRow {
  rowIndex: number;
  action: 'create' | 'merge' | 'error';
  name?: string;
  manufacturer?: string;
  model?: string;
  serial?: string;
  location?: string;
  last_maintenance?: string;
  customAttributes: Record<string, string | number | boolean | null>;
  error?: string;
  warning?: string;
}

export interface ImportDryRunResult {
  validCount: number;
  willCreate: number;
  willMerge: number;
  errorCount: number;
  sample: ImportPreviewRow[];
  warnings: string[];
  errors: Array<{ row: number; reason: string }>;
}

export interface ColumnMapping {
  header: string;
  mappedTo: 'name' | 'manufacturer' | 'model' | 'serial' | 'location' | 'last_maintenance' | 'custom' | 'skip';
  customKey?: string;
  isDuplicate?: boolean;
  duplicateIndex?: number;
}

export interface CSVImportState {
  step: 1 | 2 | 3;
  file: File | null;
  parsedData: Record<string, string>[] | null;
  headers: string[];
  delimiter: string;
  rowCount: number;
  mappings: ColumnMapping[];
  selectedTeamId: string | null;
  dryRunResult: ImportDryRunResult | null;
  importProgress: {
    processed: number;
    total: number;
    isImporting: boolean;
    completed: boolean;
    errors: Array<{ row: number; reason: string }>;
  };
  importId: string;
}

export interface FieldSynonyms {
  [key: string]: string[];
}

export const FIELD_SYNONYMS: FieldSynonyms = {
  name: ['name', 'equipment_name', 'asset_name', 'title', 'description'],
  manufacturer: ['manufacturer', 'mfr', 'mfg', 'brand', 'make'],
  model: ['model', 'model_no', 'model_number', 'model_name'],
  serial: ['serial', 'serial_no', 'serial_number', 'sn', 'serial_num', 'serial number', 'serial#', 's/n', 's n'],
  location: ['location', 'site', 'facility', 'building', 'area', 'position'],
  last_maintenance: ['last_maintenance', 'last maintenance', 'last_service_date', 'pm_date', 'maintenance_date']
};