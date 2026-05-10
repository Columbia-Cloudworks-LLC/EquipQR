/**
 * Primary in-app surface for field QR workflows: browse fleet, open records,
 * and use printed equipment QR stickers. Browser-native QR opens resolve to
 * `/qr/equipment/:equipmentId` (and related QR routes) outside the dashboard shell.
 *
 * `fieldScan=1` distinguishes the Scan QR nav entry from the generic Equipment tab
 * (same page, separate bottom-nav active state).
 */
export const DASHBOARD_MOBILE_SCAN_ENTRY_PATH = '/dashboard/equipment?fieldScan=1' as const;
export const DASHBOARD_FIELD_SCAN_QUERY_FLAG = 'fieldScan=1' as const;
