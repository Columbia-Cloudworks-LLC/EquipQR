
// Compatibility layer for usePermissions hook
import { useUnifiedPermissions } from './useUnifiedPermissions';
import type { WorkOrderData } from '@/features/work-orders/types/workOrder';
import { createLegacyPermissions } from './permissionCompatibility';

export const usePermissions = () => {
  const permissions = useUnifiedPermissions();

  return createLegacyPermissions(permissions);
};

// Add the specific hook that's being imported
export const useWorkOrderPermissions = (workOrder?: WorkOrderData) => {
  const permissions = useUnifiedPermissions();
  return permissions.workOrders.getPermissions(workOrder);
};
