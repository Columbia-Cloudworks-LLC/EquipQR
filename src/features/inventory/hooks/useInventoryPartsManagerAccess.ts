import { useInventoryAccess } from './useInventoryAccess';

/** @deprecated Use useInventoryAccess instead */
export function useInventoryPartsManagerAccess() {
  const access = useInventoryAccess();
  return {
    currentOrganization: access.currentOrganization,
    canEdit: access.canEdit,
  };
}
