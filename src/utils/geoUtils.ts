
/**
 * Parse a "lat, lng" string into coordinates
 * Accepts formats like "41.2345, -90.1234" or "41.2345,-90.1234"
 */
export function parseLatLng(raw: string): { lat: number; lng: number } | null {
  if (!raw || typeof raw !== 'string') return null;
  
  const cleaned = raw.trim();
  const parts = cleaned.split(',').map(part => part.trim());
  
  if (parts.length !== 2) return null;
  
  const lat = parseFloat(parts[0]);
  const lng = parseFloat(parts[1]);
  
  if (isNaN(lat) || isNaN(lng)) return null;
  
  // Basic validation for realistic coordinates
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  
  return { lat, lng };
}

/**
 * Normalize address text for consistent caching
 * Must match server-side normalization logic
 */
export function normalizeAddress(raw: string): string {
  if (!raw || typeof raw !== 'string') return '';
  
  return raw
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' '); // collapse multiple spaces
}
