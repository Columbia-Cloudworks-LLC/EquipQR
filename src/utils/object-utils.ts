/**
 * Object utility functions for common object operations.
 */

import type { Tables } from '@/integrations/supabase/types';

type Equipment = Tables<'equipment'>;

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
