
// Compatibility layer for usePermissions hook
import { useUnifiedPermissions } from './useUnifiedPermissions';
import { createLegacyPermissions } from './permissionCompatibility';

export const usePermissions = () => {
  const permissions = useUnifiedPermissions();

  return createLegacyPermissions(permissions);
};
