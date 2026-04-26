import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSession } from '@/hooks/useSession';
import { getEquipmentOrganization, checkUserHasMultipleOrganizations, EquipmentOrganizationInfo } from '@/features/equipment/services/equipmentOrganizationService';
import { getInventoryItemOrganization, InventoryOrganizationInfo } from '@/features/inventory/services/inventoryOrganizationService';
import { getWorkOrderOrganization, WorkOrderOrganizationInfo } from '@/features/work-orders/services/workOrderOrganizationService';
import { toast } from 'sonner';

type QRItemType = 'equipment' | 'inventory' | 'work-order';

const ITEM_LABELS: Record<QRItemType, string> = {
  'equipment': 'Equipment',
  'inventory': 'Inventory item',
  'work-order': 'Work order',
};

export interface QRRedirectState {
  isLoading: boolean;
  needsAuth: boolean;
  needsOrgSwitch: boolean;
  canProceed: boolean;
  error: string | null;
  equipmentInfo: EquipmentOrganizationInfo | null;
  inventoryInfo: InventoryOrganizationInfo | null;
  workOrderInfo: WorkOrderOrganizationInfo | null;
  targetPath: string | null;
}

interface UseQRRedirectWithOrgSwitchProps {
  equipmentId?: string | undefined;
  inventoryItemId?: string | undefined;
  workOrderId?: string | undefined;
  onComplete?: (targetPath: string) => void;
}

export const useQRRedirectWithOrgSwitch = ({
  equipmentId,
  inventoryItemId,
  workOrderId,
  onComplete
}: UseQRRedirectWithOrgSwitchProps) => {
  const { user, isLoading: authLoading } = useAuth();
  const { getCurrentOrganization, switchOrganization, refreshSession } = useSession();
  
  const [state, setState] = useState<QRRedirectState>({
    isLoading: true,
    needsAuth: false,
    needsOrgSwitch: false,
    canProceed: false,
    error: null,
    equipmentInfo: null,
    inventoryInfo: null,
    workOrderInfo: null,
    targetPath: null
  });

  const [isSwitchingOrg, setIsSwitchingOrg] = useState(false);
  const [hasCalledComplete, setHasCalledComplete] = useState(false);

  /**
   * Shared logic for verifying organization access and determining if a switch is needed
   * Returns an object with the updated state properties to ensure type safety
   */
  const verifyOrganizationAccess = useCallback(async (
    orgInfo: EquipmentOrganizationInfo | InventoryOrganizationInfo | WorkOrderOrganizationInfo | null,
    targetPath: string,
    itemType: QRItemType
  ): Promise<Partial<QRRedirectState>> => {
    const label = ITEM_LABELS[itemType];

    if (!orgInfo) {
      return {
        isLoading: false,
        error: `${label} not found or access denied`,
        targetPath: '/dashboard'
      };
    }

    if (!orgInfo.userHasAccess) {
      return {
        isLoading: false,
        error: `You don't have access to this ${label.toLowerCase()} in ${orgInfo.organizationName}`,
        targetPath: '/dashboard'
      };
    }

    const infoField: Partial<QRRedirectState> =
      itemType === 'equipment' ? { equipmentInfo: orgInfo as EquipmentOrganizationInfo }
      : itemType === 'inventory' ? { inventoryInfo: orgInfo as InventoryOrganizationInfo }
      : { workOrderInfo: orgInfo as WorkOrderOrganizationInfo };

    const currentOrg = getCurrentOrganization();

    if (!currentOrg || currentOrg.id !== orgInfo.organizationId) {
      if (!user?.id) {
        return { isLoading: false, needsAuth: true, targetPath: '/auth', ...infoField };
      }

      const hasMultipleOrgs = await checkUserHasMultipleOrganizations(user.id);
      
      if (hasMultipleOrgs) {
        return { isLoading: false, needsOrgSwitch: true, targetPath, ...infoField };
      } else {
        await refreshSession();
        return { isLoading: false, canProceed: true, targetPath, ...infoField };
      }
    }

    return { isLoading: false, canProceed: true, targetPath, ...infoField };
  }, [getCurrentOrganization, refreshSession, user?.id]);

  const checkInventoryItemOrganization = useCallback(async () => {
    if (!inventoryItemId || !user) return;

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const inventoryInfo = await getInventoryItemOrganization(inventoryItemId);
      const targetPath = `/dashboard/inventory/${inventoryItemId}?qr=true`;
      
      const stateUpdate = await verifyOrganizationAccess(
        inventoryInfo,
        targetPath,
        'inventory'
      );

      setState(prev => ({ ...prev, ...stateUpdate }));
    } catch (error) {
      console.error('❌ Error checking inventory item organization:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Failed to verify inventory item access',
        targetPath: '/dashboard'
      }));
    }
  }, [inventoryItemId, user, verifyOrganizationAccess]);

  const checkEquipmentOrganization = useCallback(async () => {
    if (!equipmentId || !user) return;

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const equipmentInfo = await getEquipmentOrganization(equipmentId, user.id);
      const targetPath = `/dashboard/equipment/${equipmentId}?qr=true`;

      const stateUpdate = await verifyOrganizationAccess(
        equipmentInfo,
        targetPath,
        'equipment'
      );

      setState(prev => ({ ...prev, ...stateUpdate }));
    } catch (error) {
      console.error('❌ Error checking equipment organization:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Failed to verify equipment access',
        targetPath: '/dashboard'
      }));
    }
  }, [equipmentId, user, verifyOrganizationAccess]);

  const checkWorkOrderOrganization = useCallback(async () => {
    if (!workOrderId || !user) return;

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const woInfo = await getWorkOrderOrganization(workOrderId);
      const targetPath = `/dashboard/work-orders/${workOrderId}?qr=true`;

      const stateUpdate = await verifyOrganizationAccess(woInfo, targetPath, 'work-order');
      setState(prev => ({ ...prev, ...stateUpdate }));
    } catch (error) {
      console.error('❌ Error checking work order organization:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Failed to verify work order access',
        targetPath: '/dashboard'
      }));
    }
  }, [workOrderId, user, verifyOrganizationAccess]);

  useEffect(() => {
    // Determine which item type we're handling and set up auth redirect
    const resolveTarget = (): { targetPath: string; check: () => void } | null => {
      if (workOrderId) {
        return {
          targetPath: `/dashboard/work-orders/${workOrderId}?qr=true`,
          check: checkWorkOrderOrganization,
        };
      }
      if (inventoryItemId) {
        return {
          targetPath: `/dashboard/inventory/${inventoryItemId}?qr=true`,
          check: checkInventoryItemOrganization,
        };
      }
      if (equipmentId) {
        return {
          targetPath: `/dashboard/equipment/${equipmentId}?qr=true`,
          check: checkEquipmentOrganization,
        };
      }
      return null;
    };

    const target = resolveTarget();

    if (!target) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'No item ID provided',
        targetPath: '/dashboard'
      }));
      return;
    }

    sessionStorage.setItem('pendingRedirect', target.targetPath);

    if (authLoading) return;

    if (!user) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        needsAuth: true,
        targetPath: '/auth'
      }));
      return;
    }

    target.check();
  }, [equipmentId, inventoryItemId, workOrderId, user, authLoading, checkEquipmentOrganization, checkInventoryItemOrganization, checkWorkOrderOrganization]);

  // Auto-call onComplete when ready to proceed
  useEffect(() => {
    if (state.canProceed && state.targetPath && !state.isLoading && !hasCalledComplete && onComplete) {
      setHasCalledComplete(true);
      onComplete(state.targetPath);
    }
  }, [state.canProceed, state.targetPath, state.isLoading, hasCalledComplete, onComplete]);

  const handleOrgSwitch = async () => {
    const orgInfo = state.equipmentInfo || state.inventoryInfo || state.workOrderInfo;
    if (!orgInfo || isSwitchingOrg) return;

    try {
      setIsSwitchingOrg(true);
      
      const orgId = orgInfo.organizationId;
      const orgName = orgInfo.organizationName;
      
      if (!orgId) {
        throw new Error('Organization ID not found');
      }
      
      await switchOrganization(orgId);
      
      toast.success(`Switched to ${orgName}`);
      
      setState(prev => ({
        ...prev,
        needsOrgSwitch: false,
        canProceed: true
      }));

    } catch (error) {
      console.error('❌ Error switching organization:', error);
      toast.error('Failed to switch organization');
      setState(prev => ({
        ...prev,
        error: 'Failed to switch organization'
      }));
    } finally {
      setIsSwitchingOrg(false);
    }
  };

  const retry = workOrderId
    ? checkWorkOrderOrganization
    : inventoryItemId
      ? checkInventoryItemOrganization
      : checkEquipmentOrganization;

  return {
    state,
    isSwitchingOrg,
    handleOrgSwitch,
    retry
  };
};