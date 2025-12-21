
import { Organization, OrganizationMember } from '@/features/organization/types/organization';

export const mockOrganization: Organization = {
  id: 'org-1',
  name: 'Acme Fleet Management',
  plan: 'free',
  memberCount: 4,
  maxMembers: 5,
  features: ['Equipment Management', 'Work Orders', 'Team Management'],
  billingCycle: undefined,
  nextBillingDate: undefined,
};

export const mockMembers: OrganizationMember[] = [
  {
    id: 'member-1',
    name: 'John Smith',
    email: 'john.smith@acme.com',
    role: 'owner',
    joinedDate: '2024-01-15',
    status: 'active',
  },
  {
    id: 'member-2',
    name: 'Sarah Johnson',
    email: 'sarah.johnson@acme.com',
    role: 'admin',
    joinedDate: '2024-02-01',
    status: 'active',
  },
  {
    id: 'member-3',
    name: 'Mike Chen',
    email: 'mike.chen@acme.com',
    role: 'member',
    joinedDate: '2024-02-15',
    status: 'active',
  },
  {
    id: 'member-4',
    name: 'Emily Davis',
    email: 'emily.davis@acme.com',
    role: 'member',
    joinedDate: '2024-03-01',
    status: 'pending',
  },
];

export const premiumFeatures = [
  {
    id: 'fleet-map',
    name: 'Fleet Map',
    description: 'Interactive maps showing equipment locations in real-time',
    included: false,
  },
  {
    id: 'advanced-analytics',
    name: 'Advanced Analytics',
    description: 'Detailed reports and insights on equipment performance',
    included: false,
  },
  {
    id: 'api-access',
    name: 'API Access',
    description: 'Full REST API access for custom integrations',
    included: false,
  },
];
