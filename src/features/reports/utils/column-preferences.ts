import type { ReportType } from '@/features/reports/types/reports';

// Storage key prefix for column preferences
const COLUMN_PREFS_KEY = 'equipqr_export_columns_';

/**
 * Get saved column preferences from localStorage
 */
export function getSavedColumnPreferences(reportType: ReportType): string[] | null {
  try {
    const saved = localStorage.getItem(`${COLUMN_PREFS_KEY}${reportType}`);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch {
    // Ignore localStorage errors
  }
  return null;
}

/**
 * Save column preferences to localStorage
 */
export function saveColumnPreferences(reportType: ReportType, columns: string[]): void {
  try {
    localStorage.setItem(`${COLUMN_PREFS_KEY}${reportType}`, JSON.stringify(columns));
  } catch {
    // Ignore localStorage errors
  }
}

/**
 * Clear saved column preferences for a report type
 */
export function clearColumnPreferences(reportType: ReportType): void {
  try {
    localStorage.removeItem(`${COLUMN_PREFS_KEY}${reportType}`);
  } catch {
    // Ignore localStorage errors
  }
}
