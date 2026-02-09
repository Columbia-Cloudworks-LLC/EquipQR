import { FIELD_SYNONYMS, type ColumnMapping, type MappedRow } from '@/types/csvImport';

// =============================================================================
// CSV Import Validation Constants
// =============================================================================

/** Maximum length for any single cell value. Values exceeding this are truncated. */
const MAX_CELL_VALUE_LENGTH = 1000;

/** Maximum length for generated custom attribute keys. */
const MAX_CUSTOM_KEY_LENGTH = 50;

/** Pattern for valid custom attribute keys (lowercase, starts with letter). */
const VALID_CUSTOM_KEY_PATTERN = /^[a-z][a-z0-9_]*$/;

/**
 * Truncate a cell value to the maximum allowed length.
 * Returns the truncated value, or the original if within limits.
 */
export const truncateCellValue = (value: string): string => {
  if (value.length > MAX_CELL_VALUE_LENGTH) {
    return value.substring(0, MAX_CELL_VALUE_LENGTH);
  }
  return value;
};

/**
 * Validate and sanitize a custom attribute key.
 * Returns a safe key or null if the key is invalid even after sanitization.
 */
export const sanitizeCustomKey = (key: string): string | null => {
  // Truncate to max length
  let sanitized = key.substring(0, MAX_CUSTOM_KEY_LENGTH);

  // If it already matches the pattern, return as-is
  if (VALID_CUSTOM_KEY_PATTERN.test(sanitized)) {
    return sanitized;
  }

  // Attempt to fix: strip invalid chars
  sanitized = sanitized.replace(/[^a-z0-9_]/g, '');

  // Ensure it starts with a letter
  if (sanitized.length > 0 && !/^[a-z]/.test(sanitized)) {
    sanitized = 'x_' + sanitized;
  }

  // Final validation
  if (sanitized.length === 0 || !VALID_CUSTOM_KEY_PATTERN.test(sanitized)) {
    return null;
  }

  return sanitized;
};

/**
 * Normalize header text for comparison (case/space/punct-insensitive)
 */
export const normalizeHeader = (header: string): string => {
  return header
    .trim()
    .toLowerCase()
    .replace(/[_-]/g, ' ') // Convert underscores and hyphens to spaces first
    .replace(/\//g, ' ') // Convert forward slashes to spaces for S/N
    .replace(/[^\w\s]/g, '') // Remove special characters
    .replace(/\s+/g, ' '); // Normalize multiple spaces to single space
};

/**
 * Convert header to snake_case for JSONB keys
 */
export const toSnakeCase = (header: string): string => {
  return header
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^\w]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
};

/**
 * Normalize canonical key for matching (manufacturer, model, serial)
 */
export const normalizeCanonicalKey = (value: string): string => {
  return value
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
};

/**
 * Auto-map headers to standard fields using synonyms
 */
export const autoMapHeaders = (headers: string[]): ColumnMapping[] => {
  const usedFields = new Set<string>();
  
  // Track duplicate headers
  const headerCounts = new Map<string, number>();
  const headerIndices = new Map<string, number[]>();
  
  headers.forEach((header, index) => {
    const normalized = normalizeHeader(header);
    if (!headerCounts.has(normalized)) {
      headerCounts.set(normalized, 0);
      headerIndices.set(normalized, []);
    }
    headerCounts.set(normalized, headerCounts.get(normalized)! + 1);
    headerIndices.get(normalized)!.push(index);
  });

  return headers.map((header, index) => {
    const normalized = normalizeHeader(header);
    const isDuplicate = headerCounts.get(normalized)! > 1;
    const duplicateIndex = headerIndices.get(normalized)!.indexOf(index);
    
    // Try to auto-map to standard fields
    for (const [field, synonyms] of Object.entries(FIELD_SYNONYMS)) {
      if (usedFields.has(field)) continue;
      
      if (synonyms.some(synonym => normalizeHeader(synonym) === normalized)) {
        usedFields.add(field);
        return {
          header,
          mappedTo: field as 'name' | 'manufacturer' | 'model' | 'serial' | 'location' | 'last_maintenance',
          isDuplicate,
          duplicateIndex
        };
      }
    }
    
    // Special heuristic for serial number fields - if header starts with "serial"
    if (!usedFields.has('serial') && (
      normalized.startsWith('serial') || 
      normalized.startsWith('sn') || 
      normalized.startsWith('s n')
    )) {
      usedFields.add('serial');
      return {
        header,
        mappedTo: 'serial',
        isDuplicate,
        duplicateIndex
      };
    }
    
    // Map to custom attribute
    return {
      header,
      mappedTo: 'custom' as const,
      customKey: toSnakeCase(header),
      isDuplicate,
      duplicateIndex
    };
  });
};

/**
 * Check if a cell value is considered empty
 */
export const isEmptyCell = (value: string | number | boolean | null | undefined): boolean => {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed === '' || trimmed.toLowerCase() === 'n/a' || trimmed.toLowerCase() === 'null';
  }
  return false;
};

/**
 * Resolve duplicate headers using leftmost non-empty precedence
 */
export const resolveDuplicateHeaders = (
  row: Record<string, string>,
  mappings: ColumnMapping[]
): Record<string, string> => {
  const resolved: Record<string, string> = {};
  const keyToIndices = new Map<string, number[]>();
  
  // Group mappings by their target key
  mappings.forEach((mapping, index) => {
    let key: string;
    if (mapping.mappedTo === 'custom') {
      key = mapping.customKey || toSnakeCase(mapping.header);
    } else {
      key = mapping.mappedTo;
    }
    
    if (!keyToIndices.has(key)) {
      keyToIndices.set(key, []);
    }
    keyToIndices.get(key)!.push(index);
  });
  
  // For each target key, find leftmost non-empty value
  for (const [key, indices] of keyToIndices) {
    for (const index of indices.sort()) {
      const header = mappings[index].header;
      const value = row[header];
      
      if (!isEmptyCell(value)) {
        resolved[key] = value;
        break;
      }
    }
  }
  
  return resolved;
};

/**
 * Map a row according to column mappings with duplicate resolution
 */
export const mapRowData = (
  row: Record<string, string>,
  mappings: ColumnMapping[],
  rowIndex: number
): MappedRow => {
  const resolved = resolveDuplicateHeaders(row, mappings);
  
  const result: MappedRow = {
    rowIndex,
    name: resolved.name,
    manufacturer: resolved.manufacturer,
    model: resolved.model,
    serial: resolved.serial,
    location: resolved.location,
    last_maintenance: resolved.last_maintenance,
    customAttributes: {},
    raw: row
  };
  
  // Add custom attributes (with validation)
  for (const [key, value] of Object.entries(resolved)) {
    if (!['name', 'manufacturer', 'model', 'serial', 'location', 'last_maintenance'].includes(key)) {
      if (!isEmptyCell(value)) {
        // Validate custom attribute key
        const safeKey = sanitizeCustomKey(key);
        if (safeKey) {
          // Truncate excessively long values
          const safeValue = typeof value === 'string' ? truncateCellValue(value) : value;
          result.customAttributes[safeKey] = inferType(safeValue);
        }
      }
    }
  }
  
  return result;
};

/**
 * Infer type for custom attribute values
 */
export const inferType = (value: string): string | number | boolean => {
  if (isEmptyCell(value)) return value;
  
  const trimmed = value.trim();
  
  // Boolean
  if (['true', 'false', 'yes', 'no'].includes(trimmed.toLowerCase())) {
    return ['true', 'yes'].includes(trimmed.toLowerCase());
  }
  
  // Number
  const num = Number(trimmed);
  if (!isNaN(num) && isFinite(num) && trimmed !== '') {
    return num;
  }
  
  // Date (basic check for common formats)
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed) || 
      /^\d{2}\/\d{2}\/\d{4}$/.test(trimmed) ||
      /^\d{4}\/\d{2}\/\d{2}$/.test(trimmed)) {
    const date = new Date(trimmed);
    if (!isNaN(date.getTime())) {
      return trimmed; // Keep as string for now
    }
  }
  
  return trimmed;
};

/**
 * Parse and validate date string
 */
export const parseDate = (dateStr: string): Date | null => {
  if (isEmptyCell(dateStr)) return null;
  
  const trimmed = dateStr.trim();
  const date = new Date(trimmed);
  
  if (isNaN(date.getTime())) return null;
  return date;
};

/**
 * Check if a date is newer than another
 */
export const isNewerDate = (newDate: string, existingDate: string | null): boolean => {
  if (!existingDate) return true;
  
  const newParsed = parseDate(newDate);
  const existingParsed = parseDate(existingDate);
  
  if (!newParsed || !existingParsed) return false;
  
  return newParsed > existingParsed;
};

/**
 * Validate equipment creation rules
 */
export const validateCreateRule = (row: MappedRow): { valid: boolean; error?: string } => {
  const hasSerial = !isEmptyCell(row.serial);
  const hasManufacturer = !isEmptyCell(row.manufacturer);
  const hasModel = !isEmptyCell(row.model);
  
  if (hasSerial || (hasManufacturer && hasModel)) {
    return { valid: true };
  }
  
  return {
    valid: false,
    error: 'Provide a serial or both manufacturer and model to create a new asset'
  };
};

/**
 * Strip BOM from CSV content
 */
export const stripBOM = (content: string): string => {
  return content.replace(/^\uFEFF/, '');
};

/**
 * Generate unique import ID
 */
export const generateImportId = (): string => {
  return `import_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Download CSV file with error data
 */
export const downloadErrorsCSV = (
  errors: Array<{ row: number; reason: string }>,
  originalData: Record<string, string>[]
): void => {
  if (errors.length === 0) return;
  
  const errorRows = errors.map(error => ({
    ...originalData[error.row - 1], // Convert to 0-based index
    __ERROR__: error.reason
  }));
  
  const headers = Object.keys(errorRows[0]);
  const csvContent = [
    headers.join(','),
    ...errorRows.map(row => 
      headers.map(header => `"${(row as Record<string, string>)[header] || ''}"`).join(',')
    )
  ].join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `import_errors_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};