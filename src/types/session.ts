export interface SessionOrganization {
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
  scanLocationCollectionEnabled: boolean;
  userRole: 'owner' | 'admin' | 'member';
  userStatus: 'active' | 'pending' | 'inactive';
}

export interface SessionTeamMembership {
  teamId: string;
  teamName: string;
  role: 'manager' | 'technician' | 'requestor' | 'viewer';
  joinedDate: string;
}

export interface SessionData {
  organizations: SessionOrganization[];
  currentOrganizationId: string | null;
  teamMemberships: SessionTeamMembership[];
  lastUpdated: string;
  version: number;
}
