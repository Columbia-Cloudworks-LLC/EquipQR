import { createContext } from 'react';
import type { SessionOrganization } from '@/types/session';

/** Session org shape plus personal-workspace flag used by SimpleOrganizationProvider. */
export type SimpleOrganization = SessionOrganization & {
  /** True if this is the user's personal (default) organization */
  isPersonal?: boolean;
};

export interface SimpleOrganizationContextType {
  organizations: SimpleOrganization[];
  userOrganizations: SimpleOrganization[]; // Backward compatibility alias
  currentOrganization: SimpleOrganization | null;
  organizationId: string | null; // Convenience property for current organization ID
  setCurrentOrganization: (organizationId: string) => void;
  switchOrganization: (organizationId: string) => void;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const SimpleOrganizationContext = createContext<SimpleOrganizationContextType | undefined>(undefined);