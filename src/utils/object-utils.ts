/**
 * Object utility functions for common object operations.
 */

/**
 * Helper function for shallow object comparison.
 * Compares two objects by checking if they have the same keys and values.
 * 
 * This is a shallow comparison - nested objects are compared by reference,
 * not by value. For deep equality, consider using a library like fast-deep-equal.
 * 
 * @param a - First value to compare
 * @param b - Second value to compare
 * @returns true if objects are shallowly equal, false otherwise
 */
export function shallowEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null || b == null || typeof a !== 'object' || typeof b !== 'object') {
    return false;
  }
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (const key of keysA) {
    if (!(key in b) || (a as Record<string, unknown>)[key] !== (b as Record<string, unknown>)[key]) {
      return false;
    }
  }
  return true;
}
