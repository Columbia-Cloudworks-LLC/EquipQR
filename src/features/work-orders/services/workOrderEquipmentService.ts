// Service for managing work order equipment relationships
import { supabase } from '@/integrations/supabase/client';
import type { WorkOrderEquipmentWithDetails } from '@/features/work-orders/types/workOrderEquipment';
import { logger } from '@/utils/logger';

/**
 * Get all equipment linked to a work order
 */
export const getWorkOrderEquipment = async (
  workOrderId: string
): Promise<WorkOrderEquipmentWithDetails[]> => {
  try {
    const { data, error } = await supabase
      .from('work_order_equipment')
      .select(`
        *,
        equipment:equipment_id (
          id,
          name,
          manufacturer,
          model,
          serial_number,
          team_id,
          location,
          status
        )
      `)
      .eq('work_order_id', workOrderId)
      .order('is_primary', { ascending: false }) // Primary equipment first
      .order('created_at', { ascending: true });

    if (error) {
      logger.error('Error fetching work order equipment:', error);
      throw error;
    }

    return data as WorkOrderEquipmentWithDetails[];
  } catch (error) {
    logger.error('Error in getWorkOrderEquipment:', error);
    throw error;
  }
};

