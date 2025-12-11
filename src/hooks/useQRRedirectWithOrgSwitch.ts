import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSession } from '@/hooks/useSession';
import { getEquipmentOrganization, checkUserHasMultipleOrganizations, EquipmentOrganizationInfo } from '@/services/equipmentOrganizationService';
import { getInventoryItemOrganization, InventoryOrganizationInfo } from '@/services/inventoryOrganizationService';
import { toast } from 'sonner';

export interface QRRedirectState {
  isLoading: boolean;
  needsAuth: boolean;
  needsOrgSwitch: boolean;
  canProceed: boolean;
  error: string | null;
  equipmentInfo: EquipmentOrganizationInfo | null;
  inventoryInfo: InventoryOrganizationInfo | null;
  targetPath: string | null;
}

interface UseQRRedirectWithOrgSwitchProps {
  equipmentId?: string | undefined;
  inventoryItemId?: string | undefined;
  onComplete?: (targetPath: string) => void;
}

export const useQRRedirectWithOrgSwitch = ({
  equipmentId,
  inventoryItemId,
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
    targetPath: null
  });

  const [isSwitchingOrg, setIsSwitchingOrg] = useState(false);
  const [hasCalledComplete, setHasCalledComplete] = useState(false);

  const checkInventoryItemOrganization = useCallback(async () => {
    if (!inventoryItemId || !user) return;

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      // Get inventory item organization info
      const inventoryInfo = await getInventoryItemOrganization(inventoryItemId);
      
      if (!inventoryInfo) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: 'Inventory item not found or access denied',
          targetPath: '/dashboard/scanner'
        }));
        return;
      }

      if (!inventoryInfo.userHasAccess) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: `You don't have access to inventory items in ${inventoryInfo.organizationName}`,
          targetPath: '/dashboard/scanner'
        }));
        return;
      }

      const currentOrg = getCurrentOrganization();
      const targetPath = `/dashboard/inventory/${inventoryItemId}?qr=true`;

      // Check if we need to switch organizations
      if (!currentOrg || currentOrg.id !== inventoryInfo.organizationId) {
        // Need to switch organization
        const hasMultipleOrgs = await checkUserHasMultipleOrganizations();
        
        if (hasMultipleOrgs) {
          setState(prev => ({
            ...prev,
            isLoading: false,
            needsOrgSwitch: true,
            inventoryInfo,
            targetPath
          }));
        } else {
          await refreshSession();
          setState(prev => ({
            ...prev,
            isLoading: false,
            canProceed: true,
            inventoryInfo,
            targetPath
          }));
        }
      } else {
        // Already in correct organization
        setState(prev => ({
          ...prev,
          isLoading: false,
          canProceed: true,
          inventoryInfo,
          targetPath
        }));
      }
    } catch (error) {
      console.error('❌ Error checking inventory item organization:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Failed to verify inventory item access',
        targetPath: '/dashboard/scanner'
      }));
    }
  }, [inventoryItemId, user, getCurrentOrganization, refreshSession]);

  const checkEquipmentOrganization = useCallback(async () => {
    if (!equipmentId || !user) return;

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      // Get equipment organization info
      const equipmentInfo = await getEquipmentOrganization(equipmentId);
      
      if (!equipmentInfo) {
        setState(prev => ({
          ...prev,
          isLoading: false,
           error: 'Equipment not found or access denied',
           targetPath: '/dashboard/scanner'
        }));
        return;
      }

      if (!equipmentInfo.userHasAccess) {
        setState(prev => ({
          ...prev,
          isLoading: false,
           error: `You don't have access to equipment in ${equipmentInfo.organizationName}`,
           targetPath: '/dashboard/scanner'
        }));
        return;
      }

      const currentOrg = getCurrentOrganization();
      const targetPath = `/dashboard/equipment/${equipmentId}?qr=true`;

      // Check if we need to switch organizations
      if (!currentOrg || currentOrg.id !== equipmentInfo.organizationId) {
        // Need to switch organization
        
        // Check if user has multiple organizations
        const hasMultipleOrgs = await checkUserHasMultipleOrganizations();
        
        if (hasMultipleOrgs) {
          setState(prev => ({
            ...prev,
            isLoading: false,
            needsOrgSwitch: true,
            equipmentInfo,
            targetPath
          }));
        } else {
          // Only one org, refresh session to ensure context is current
          await refreshSession();
          setState(prev => ({
            ...prev,
            isLoading: false,
            canProceed: true,
            equipmentInfo,
            targetPath
          }));
        }
      } else {
        // Already in correct organization
        setState(prev => ({
          ...prev,
          isLoading: false,
          canProceed: true,
          equipmentInfo,
          targetPath
        }));
      }

    } catch (error) {
      console.error('❌ Error checking equipment organization:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
         error: 'Failed to verify equipment access',
         targetPath: '/dashboard/scanner'
      }));
    }
  }, [equipmentId, user, getCurrentOrganization, refreshSession]);

  useEffect(() => {
    // Handle inventory item
    if (inventoryItemId) {
      const targetPath = `/dashboard/inventory/${inventoryItemId}?qr=true`;
      sessionStorage.setItem('pendingRedirect', targetPath);

      if (authLoading) {
        return;
      }

      if (!user) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          needsAuth: true,
          targetPath: '/auth'
        }));
        return;
      }

      checkInventoryItemOrganization();
      return;
    }

    // Handle equipment (existing logic)
    if (!equipmentId) {
      setState(prev => ({
        ...prev,
        isLoading: false,
         error: 'No equipment ID or inventory item ID provided',
         targetPath: '/dashboard/scanner'
      }));
      return;
    }

    // Store the intended destination for post-auth redirect
    const targetPath = `/dashboard/equipment/${equipmentId}?qr=true`;
    sessionStorage.setItem('pendingRedirect', targetPath);

    if (authLoading) {
      return; // Wait for auth to complete
    }

    if (!user) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        needsAuth: true,
        targetPath: '/auth'
      }));
      return;
    }

    // User is authenticated, proceed with organization check
    checkEquipmentOrganization();
  }, [equipmentId, inventoryItemId, user, authLoading, checkEquipmentOrganization, checkInventoryItemOrganization]);

  // Auto-call onComplete when ready to proceed
  useEffect(() => {
    if (state.canProceed && state.targetPath && !state.isLoading && !hasCalledComplete && onComplete) {
      setHasCalledComplete(true);
      onComplete(state.targetPath);
    }
  }, [state.canProceed, state.targetPath, state.isLoading, hasCalledComplete, onComplete]);

  const handleOrgSwitch = async () => {
    const orgInfo = state.equipmentInfo || state.inventoryInfo;
    if (!orgInfo || isSwitchingOrg) return;

    try {
      setIsSwitchingOrg(true);
      
      const orgId = state.equipmentInfo?.organizationId || state.inventoryInfo?.organizationId;
      const orgName = state.equipmentInfo?.organizationName || state.inventoryInfo?.organizationName;
      
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

  const retry = inventoryItemId ? checkInventoryItemOrganization : checkEquipmentOrganization;

  return {
    state,
    isSwitchingOrg,
    handleOrgSwitch,
    retry
  };
};