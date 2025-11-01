
import { Organization } from './organization';

export interface UserOrganization extends Organization {
  userRole: 'owner' | 'admin' | 'member';
  userStatus: 'active' | 'pending' | 'inactive';
}

export interface OrganizationContextType {
  currentOrganization: UserOrganization | null;
  userOrganizations: UserOrganization[];
  switchOrganization: (organizationId: string) => void;
  isLoading: boolean;
  error: string | null;
}
