import { useOrganization } from '@/contexts/OrganizationContext';
import { usePermissions } from '@/hooks/usePermissions';
import { useIsPartsManager } from '@/features/inventory/hooks/usePartsManagers';

export function useInventoryPartsManagerAccess() {
  const { currentOrganization } = useOrganization();
  const { canManageInventory } = usePermissions();
  const { data: isPartsManager = false } = useIsPartsManager(currentOrganization?.id);
  const canEdit = canManageInventory(isPartsManager);

  return { currentOrganization, canEdit };
}
