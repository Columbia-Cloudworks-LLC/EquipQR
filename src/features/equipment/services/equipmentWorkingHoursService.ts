import { logger } from '@/utils/logger';
import { supabase } from '@/integrations/supabase/client';

export interface WorkingHoursHistoryEntry {
  id: string;
  equipment_id: string;
  old_hours: number | null;
  new_hours: number;
  hours_added: number;
  updated_by: string;
  updated_by_name: string | null;
  update_source: 'manual' | 'work_order';
  work_order_id: string | null;
  notes: string | null;
  created_at: string;
}

export interface UpdateWorkingHoursData {
  equipmentId: string;
  newHours: number;
  updateSource?: 'manual' | 'work_order';
  workOrderId?: string;
  notes?: string;
}

export const updateEquipmentWorkingHours = async (data: UpdateWorkingHoursData) => {
  const { data: result, error } = await supabase.rpc('update_equipment_working_hours', {
    p_equipment_id: data.equipmentId,
    p_new_hours: data.newHours,
    p_update_source: data.updateSource || 'manual',
    p_work_order_id: data.workOrderId || null,
    p_notes: data.notes || null
  });

  if (error) {
    logger.error('Error updating equipment working hours:', error);
    throw error;
  }

  return result;
};

export interface PaginatedHistoryResult {
  data: WorkingHoursHistoryEntry[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export const getEquipmentWorkingHoursHistory = async (
  equipmentId: string,
  page: number = 1,
  pageSize: number = 10
): Promise<PaginatedHistoryResult> => {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  // Get total count
  const { count, error: countError } = await supabase
    .from('equipment_working_hours_history')
    .select('*', { count: 'exact', head: true })
    .eq('equipment_id', equipmentId);

  if (countError) {
    logger.error('Error fetching working hours history count:', countError);
    throw countError;
  }

  // Get paginated data
  const { data, error } = await supabase
    .from('equipment_working_hours_history')
    .select('*')
    .eq('equipment_id', equipmentId)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) {
    logger.error('Error fetching working hours history:', error);
    throw error;
  }

  const total = count || 0;
  const totalPages = Math.ceil(total / pageSize);

  return {
    data: (data || []) as WorkingHoursHistoryEntry[],
    total,
    page,
    pageSize,
    totalPages
  };
};

export const getEquipmentCurrentWorkingHours = async (equipmentId: string): Promise<number> => {
  const { data, error } = await supabase
    .from('equipment')
    .select('working_hours')
    .eq('id', equipmentId)
    .single();

  if (error) {
    logger.error('Error fetching current working hours:', error);
    throw error;
  }

  return data?.working_hours || 0;
};