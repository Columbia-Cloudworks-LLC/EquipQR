// Service for managing work order equipment relationships
import { supabase } from '@/integrations/supabase/client';
import type {
  WorkOrderEquipment,
  WorkOrderEquipmentWithDetails,
  CreateWorkOrderEquipmentData,
  AddEquipmentToWorkOrderParams,
  RemoveEquipmentFromWorkOrderParams,
  SetPrimaryEquipmentParams,
} from '@/features/work-orders/types/workOrderEquipment';
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

/**
 * Get primary equipment for a work order
 */
export const getPrimaryEquipment = async (
  workOrderId: string
): Promise<WorkOrderEquipmentWithDetails | null> => {
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
      .eq('is_primary', true)
      .single();

    if (error && error.code !== 'PGRST116') {
      logger.error('Error fetching primary equipment:', error);
      throw error;
    }

    return data as WorkOrderEquipmentWithDetails | null;
  } catch (error) {
    logger.error('Error in getPrimaryEquipment:', error);
    return null;
  }
};

/**
 * Add equipment to a work order
 * If primaryEquipmentId is provided, it will be set as primary
 * Otherwise, the first equipment in the list will be primary
 */
export const addEquipmentToWorkOrder = async ({
  workOrderId,
  equipmentIds,
  primaryEquipmentId,
}: AddEquipmentToWorkOrderParams): Promise<WorkOrderEquipment[]> => {
  try {
    // Determine primary equipment
    const primaryId = primaryEquipmentId || equipmentIds[0];

    // Create records for all equipment
    const records: CreateWorkOrderEquipmentData[] = equipmentIds.map((equipmentId) => ({
      work_order_id: workOrderId,
      equipment_id: equipmentId,
      is_primary: equipmentId === primaryId,
    }));

    const { data, error } = await supabase
      .from('work_order_equipment')
      .insert(records)
      .select();

    if (error) {
      logger.error('Error adding equipment to work order:', error);
      throw error;
    }

    logger.info(`Added ${data.length} equipment to work order ${workOrderId}`);
    return data;
  } catch (error) {
    logger.error('Error in addEquipmentToWorkOrder:', error);
    throw error;
  }
};

/**
 * Remove equipment from a work order
 * Note: Cannot remove primary equipment if other equipment exists
 */
export const removeEquipmentFromWorkOrder = async ({
  workOrderId,
  equipmentId,
}: RemoveEquipmentFromWorkOrderParams): Promise<void> => {
  try {
    // Check if this is the primary equipment
    const { data: equipmentData } = await supabase
      .from('work_order_equipment')
      .select('is_primary')
      .eq('work_order_id', workOrderId)
      .eq('equipment_id', equipmentId)
      .single();

    // Count total equipment for this work order
    const { count } = await supabase
      .from('work_order_equipment')
      .select('*', { count: 'exact', head: true })
      .eq('work_order_id', workOrderId);

    // Don't allow removing primary equipment if there are other equipment
    if (equipmentData?.is_primary && count && count > 1) {
      throw new Error(
        'Cannot remove primary equipment while other equipment are linked. Please set a new primary equipment first.'
      );
    }

    const { error } = await supabase
      .from('work_order_equipment')
      .delete()
      .eq('work_order_id', workOrderId)
      .eq('equipment_id', equipmentId);

    if (error) {
      logger.error('Error removing equipment from work order:', error);
      throw error;
    }

    logger.info(`Removed equipment ${equipmentId} from work order ${workOrderId}`);
  } catch (error) {
    logger.error('Error in removeEquipmentFromWorkOrder:', error);
    throw error;
  }
};

/**
 * Set primary equipment for a work order
 * This will unset the previous primary and set the new one
 * Trigger will also update work_orders.equipment_id
 */
export const setPrimaryEquipment = async ({
  workOrderId,
  equipmentId,
}: SetPrimaryEquipmentParams): Promise<void> => {
  try {
    // Verify the equipment is linked to this work order
    const { data: existing } = await supabase
      .from('work_order_equipment')
      .select('id')
      .eq('work_order_id', workOrderId)
      .eq('equipment_id', equipmentId)
      .single();

    if (!existing) {
      throw new Error('Equipment is not linked to this work order');
    }

    // Set as primary (trigger will handle unsetting other primary)
    const { error } = await supabase
      .from('work_order_equipment')
      .update({ is_primary: true })
      .eq('id', existing.id);

    if (error) {
      logger.error('Error setting primary equipment:', error);
      throw error;
    }

    logger.info(`Set equipment ${equipmentId} as primary for work order ${workOrderId}`);
  } catch (error) {
    logger.error('Error in setPrimaryEquipment:', error);
    throw error;
  }
};

/**
 * Get equipment from the same team for selection
 * Excludes already linked equipment
 */
export const getTeamEquipmentForWorkOrder = async (
  workOrderId: string,
  teamId: string,
  excludeIds: string[] = []
): Promise<Array<{ id: string; name: string; manufacturer: string; model: string; location: string }>> => {
  try {
    let query = supabase
      .from('equipment')
      .select('id, name, manufacturer, model, location, status')
      .eq('team_id', teamId)
      .eq('status', 'active') // Only show active equipment
      .order('name');

    if (excludeIds.length > 0) {
      query = query.not('id', 'in', `(${excludeIds.join(',')})`);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('Error fetching team equipment:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    logger.error('Error in getTeamEquipmentForWorkOrder:', error);
    throw error;
  }
};

/**
 * Get count of equipment linked to a work order
 */
export const getWorkOrderEquipmentCount = async (
  workOrderId: string
): Promise<number> => {
  try {
    const { count, error } = await supabase
      .from('work_order_equipment')
      .select('*', { count: 'exact', head: true })
      .eq('work_order_id', workOrderId);

    if (error) {
      logger.error('Error counting work order equipment:', error);
      throw error;
    }

    return count || 0;
  } catch (error) {
    logger.error('Error in getWorkOrderEquipmentCount:', error);
    return 0;
  }
};

