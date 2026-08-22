import { FIELD_SYNONYMS, type ColumnMapping } from '@/types/csvImport';

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