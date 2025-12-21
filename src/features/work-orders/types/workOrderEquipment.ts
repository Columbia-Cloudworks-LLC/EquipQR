// Types for work order equipment relationships (multi-equipment support)

import type { Tables } from '@/integrations/supabase/types';

export type WorkOrderEquipment = Tables<'work_order_equipment'>;

export interface WorkOrderEquipmentWithDetails extends WorkOrderEquipment {
  equipment: {
    id: string;
    name: string;
    manufacturer?: string;
    model?: string;
    serial_number?: string;
    team_id?: string | null;
    location?: string;
    status?: string;
  } | null;
}

export interface WorkOrderWithMultipleEquipment {
  work_order_id: string;
  equipment: Array<{
    id: string;
    equipment_id: string;
    name: string;
    manufacturer?: string;
    model?: string;
    serial_number?: string;
    team_id?: string | null;
    is_primary: boolean;
    location?: string;
    status?: string;
  }>;
  primary_equipment_id?: string;
}

export interface CreateWorkOrderEquipmentData {
  work_order_id: string;
  equipment_id: string;
  is_primary: boolean;
}

export interface AddEquipmentToWorkOrderParams {
  workOrderId: string;
  equipmentIds: string[];
  primaryEquipmentId?: string;
}

export interface RemoveEquipmentFromWorkOrderParams {
  workOrderId: string;
  equipmentId: string;
}

export interface SetPrimaryEquipmentParams {
  workOrderId: string;
  equipmentId: string;
}



