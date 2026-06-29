import { useOrganization } from '@/contexts/OrganizationContext';
import { usePermissions } from '@/hooks/usePermissions';
import { useIsPartsManager } from '@/features/inventory/hooks/usePartsManagers';
import { useIsPartsConsumer } from '@/features/inventory/hooks/usePartsConsumers';

export function useInventoryAccess() {
  const { currentOrganization } = useOrganization();
  const { canViewInventory, canManageInventory } = usePermissions();
  const orgId = currentOrganization?.id;
  const { data: isPartsManager = false, isLoading: partsManagerLoading } =
    useIsPartsManager(orgId);
  const { data: isPartsConsumer = false, isLoading: partsConsumerLoading } =
    useIsPartsConsumer(orgId);

  const canView = canViewInventory(isPartsManager, isPartsConsumer);
  const canEdit = canManageInventory(isPartsManager);

  return {
    currentOrganization,
    canView,
    canEdit,
    isPartsManager,
    isPartsConsumer,
    isLoading: partsManagerLoading || partsConsumerLoading,
  };
}

