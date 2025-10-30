import React from 'react';
import { screen } from '@testing-library/react';
import { customRender } from '@/test/utils/renderUtils';

// Mock Supabase client directly in factory to avoid import hoisting issues
vi.mock('@/integrations/supabase/client', () => {
  const chain = {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    eq: vi.fn(),
    or: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
    nullsFirst: vi.fn(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    then: vi.fn().mockResolvedValue({ data: null, error: null }),
  };
  
  Object.keys(chain).forEach(k => {
    if (k !== 'single' && k !== 'then') {
      chain[k].mockReturnValue(chain);
    }
  });
  
  return {
    supabase: {
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user' } }, error: null }),
        signInWithPassword: vi.fn(),
        signUp: vi.fn(),
        signOut: vi.fn(),
        onAuthStateChange: vi.fn(),
      },
      from: vi.fn(() => chain),
      rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
      storage: {
        from: vi.fn(() => ({
          upload: vi.fn(),
          download: vi.fn(),
          remove: vi.fn(),
          list: vi.fn(),
        })),
      },
    },
  };
});

// Mock seat availability hook used inside OrganizationTabs
vi.mock('@/hooks/useOrganizationSlots', () => ({
  useSlotAvailability: vi.fn().mockReturnValue({
    data: {
      total_purchased: 2,
      used_slots: 2,
      available_slots: 0,
      exempted_slots: 0,
      current_period_start: '2024-01-01T00:00:00Z',
      current_period_end: '2024-02-01T00:00:00Z',
    },
  }),
}));

// Stub PurchaseLicensesButton to avoid provider dependency in tests
vi.mock('@/components/billing/PurchaseLicensesButton', () => ({
  default: () => null,
}));

// Stub SimplifiedInvitationDialog to avoid provider dependency in tests
vi.mock('@/components/organization/SimplifiedInvitationDialog', () => ({
  SimplifiedInvitationDialog: () => null,
  default: () => null,
}));

// Import component after mocks
import OrganizationTabs from '../OrganizationTabs';

describe('OrganizationTabs', () => {
  type MinimalMember = {
    id: string;
    name: string;
    email: string;
    role: 'owner' | 'admin' | 'member';
    status: 'active' | 'pending' | 'inactive';
    joinedDate: string;
  };

  const members: MinimalMember[] = [
    { id: 'u-1', name: 'Owner', email: 'owner@example.com', role: 'owner', status: 'active', joinedDate: '2024-01-01T00:00:00Z' },
  ];

  it('does not disable Invite button when billing is disabled (billing disabled by default)', async () => {
    customRender(
      <OrganizationTabs
        members={members}
        organizationId="org-1"
        currentUserRole="admin"
        permissions={{ canInviteMembers: true }}
        membersLoading={false}
      />
    );

    const inviteBtn = await screen.findByRole('button', { name: /invite member/i });
    // With billing disabled by default, invitations are never blocked
    expect(inviteBtn).not.toBeDisabled();
  });
});


