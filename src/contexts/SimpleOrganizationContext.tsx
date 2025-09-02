import { createContext } from 'react';

export interface SimpleOrganization {
  id: string;
  name: string;
  plan: 'free' | 'premium';
  memberCount: number;
  maxMembers: number;
  features: string[];
  billingCycle?: 'monthly' | 'yearly';
  nextBillingDate?: string;
  logo?: string;
  backgroundColor?: string;
  userRole: 'owner' | 'admin' | 'member';
  userStatus: 'active' | 'pending' | 'inactive';
}

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