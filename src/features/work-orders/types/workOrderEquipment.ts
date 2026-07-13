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

/**
 * EquipmentSelectorItem - Common type for equipment items in selector components.
 * 
 * Used by WorkOrderEquipmentSelector for both preSelectedEquipment and allEquipment props.
 * Contains the minimal fields needed for equipment selection and display.
 */
export interface EquipmentSelectorItem {
  id: string;
  name: string;
  manufacturer?: string | null;
  model?: string | null;
  serial_number?: string | null;
  location?: string | null;
  last_known_location?: { name?: string } | null;
  team?: { id: string; name: string } | null;
  working_hours?: number | null;
}


