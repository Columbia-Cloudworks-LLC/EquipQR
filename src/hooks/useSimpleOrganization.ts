import { useContext } from 'react';
import { SimpleOrganizationContext } from '@/contexts/SimpleOrganizationContext';
import type { SimpleOrganizationContextType } from '@/contexts/SimpleOrganizationContext';

export const useSimpleOrganization = () => {
  const context = useContext(SimpleOrganizationContext);
  if (context === undefined) {
    throw new Error('useSimpleOrganization must be used within a SimpleOrganizationProvider');
  }
  return context;
};

/**
 * Safe version of useSimpleOrganization that returns null instead of throwing
 * when used outside the provider. Useful for backward compatibility when
 * organizationId can be provided via props.
 */
export const useSimpleOrganizationSafe = (): SimpleOrganizationContextType | null => {
  const context = useContext(SimpleOrganizationContext);
  return context ?? null;
};