import { logger } from '../utils/logger';

import { supabase } from '@/integrations/supabase/client';

export interface EnhancedWorkOrder {
  id: string;
  title: string;
  description: string;
  equipment_id: string;
  organization_id: string;
  priority: 'low' | 'medium' | 'high';
  status: 'submitted' | 'accepted' | 'assigned' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled';
  assignee_id?: string;
  assigneeName?: string;
  team_id?: string;
  teamName?: string;
  created_date: string;
  created_by: string;
  due_date?: string;
  estimated_hours?: number;
  completed_date?: string;
  acceptance_date?: string;
  equipmentName?: string;
  createdByName?: string;
  has_pm: boolean;
  pm_required: boolean;
  equipment_working_hours_at_creation?: number;
  updated_at: string;
}

export const getWorkOrderByIdWithAssignee = async (
  organizationId: string, 
  workOrderId: string
): Promise<EnhancedWorkOrder | null> => {
  try {
    const { data, error } = await supabase
      .from('work_orders')
      .select(`
        *,
        assignee:profiles!work_orders_assignee_id_fkey (
          id,
          name
        ),
        equipment:equipment!work_orders_equipment_id_fkey (
          id,
          name,
          team_id,
          teams:team_id (
            id,
            name
          )
        ),
        creator:profiles!work_orders_created_by_fkey (
          id,
          name
        )
      `)
      .eq('id', workOrderId)
      .eq('organization_id', organizationId)
      .single();

    if (error || !data) {
      logger.error('Error fetching work order with assignee:', error);
      return null;
    }

    return {
      id: data.id,
      title: data.title,
      description: data.description,
      equipment_id: data.equipment_id,
      organization_id: data.organization_id,
      priority: data.priority,
      status: data.status,
      assignee_id: data.assignee_id,
      assigneeName: (data.assignee as { name?: string } | null | undefined)?.name,
      team_id: (data.equipment as { team_id?: string } | null | undefined)?.team_id,
      teamName: (data.equipment as { teams?: { name?: string } } | null | undefined)?.teams?.name,
      created_date: data.created_date,
      created_by: data.created_by,
      due_date: data.due_date,
      estimated_hours: data.estimated_hours,
      completed_date: data.completed_date,
      acceptance_date: data.acceptance_date,
      equipmentName: (data.equipment as { name?: string } | null | undefined)?.name,
      createdByName: (data.creator as { name?: string } | null | undefined)?.name,
      has_pm: data.has_pm,
      pm_required: data.pm_required,
      updated_at: data.updated_at
    };
  } catch (error) {
    logger.error('Error in getWorkOrderByIdWithAssignee:', error);
    return null;
  }
};
