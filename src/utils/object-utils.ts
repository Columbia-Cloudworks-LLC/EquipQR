/**
 * Object utility functions for common object operations.
 */

import type { Tables } from '@/integrations/supabase/types';

type Equipment = Tables<'equipment'>;

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

/**
 * Prepares equipment update data with business rule enforcement.
 * 
 * Business rule: When `last_maintenance` is updated manually, 
 * `last_maintenance_work_order_id` should be cleared to null because
 * the maintenance date is no longer tied to a specific work order.
 * 
 * @param updateData - Partial equipment update data
 * @returns The update data with business rules applied
 */
export function applyEquipmentUpdateRules(
  updateData: Partial<Equipment>
): Partial<Equipment> {
  const result = { ...updateData };
  
  // When last_maintenance is updated, clear the work order reference
  // This ensures the date isn't incorrectly linked to an old work order
  if ('last_maintenance' in result) {
    result.last_maintenance_work_order_id = null;
  }
  
  return result;
}
