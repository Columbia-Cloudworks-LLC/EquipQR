import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type WorkOrderStatus = Database['public']['Enums']['work_order_status'];
type WorkOrderPriority = Database['public']['Enums']['work_order_priority'];

export interface EquipmentOpenWorkOrder {
  id: string;
  title: string;
  status: WorkOrderStatus;
  priority: WorkOrderPriority;
  created_date: string;
  has_pm: boolean;
}

export interface EquipmentOpenWorkOrders {
  /** Most recent open work orders (capped). */
  items: EquipmentOpenWorkOrder[];
  /** Total open work orders on the machine, which may exceed `items.length`. */
  total: number;
}

const OPEN_WORK_ORDER_LIMIT = 5;

export const equipmentOpenWorkOrdersKey = (organizationId: string, equipmentId: string) =>
  ['equipment', equipmentId, 'open-work-orders', organizationId] as const;

async function fetchEquipmentOpenWorkOrders(
  organizationId: string,
  equipmentId: string,
): Promise<EquipmentOpenWorkOrders> {
  const { data, error, count } = await supabase
    .from('work_orders')
    .select('id, title, status, priority, created_date, has_pm', { count: 'exact' })
    .eq('organization_id', organizationId)
    .eq('equipment_id', equipmentId)
    .not('status', 'in', '(completed,cancelled)')
    .order('created_date', { ascending: false })
    .limit(OPEN_WORK_ORDER_LIMIT);

  if (error) throw error;

  const items = data ?? [];
  return { items, total: count ?? items.length };
}

/**
 * Work orders still open on one machine. Shown where new work is reported (QR
 * landing) so the same problem is not written up twice.
 */
export function useEquipmentOpenWorkOrders(
  organizationId: string | undefined,
  equipmentId: string | undefined,
) {
  const enabled = Boolean(organizationId && equipmentId);
  return useQuery({
    queryKey: enabled
      ? equipmentOpenWorkOrdersKey(organizationId!, equipmentId!)
      : (['equipment', 'open-work-orders', 'idle'] as const),
    queryFn: () => fetchEquipmentOpenWorkOrders(organizationId!, equipmentId!),
    enabled,
    staleTime: 30 * 1000,
    retry: 1,
  });
}
