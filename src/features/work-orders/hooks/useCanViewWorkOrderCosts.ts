import { useWorkOrderPermissionLevels } from '@/features/work-orders/hooks/useWorkOrderPermissionLevels';

/**
 * Client-side gate for any UI that surfaces work order cost data (parts line
 * items, pricing, labor hours). Org owners/admins and team
 * technicians/managers may see costs; team requestors/viewers and plain
 * members must stay oblivious — those roles are customer-facing.
 *
 * RLS on `work_order_costs` (`can_access_work_order_costs`) enforces the same
 * rule server-side per work order; this hook only hides the UI shell.
 */
export function useCanViewWorkOrderCosts(): boolean {
  const { isManager, isTechnician } = useWorkOrderPermissionLevels();
  return isManager || isTechnician;
}
