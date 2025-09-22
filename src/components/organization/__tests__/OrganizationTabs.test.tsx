import React from 'react';
import { screen } from '@testing-library/react';
import { customRender } from '@/test/utils/renderUtils';

// Mock Supabase early with inline factory (avoid hoist issues)
vi.mock('@/integrations/supabase/client', () => {
  const chain: any = {
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
  Object.keys(chain).forEach((k) => {
    if (k !== 'single' && k !== 'then') chain[k].mockReturnValue(chain);
  });
  const supabase = {
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
  } as any;
  return { supabase };
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

// Mock UnifiedMembersList child assertion occurs via button presence
vi.mock('../UnifiedMembersList', async () => {
  const actual = await vi.importActual<any>('../UnifiedMembersList');
  return {
    __esModule: true,
    default: (props: any) => actual.default(props),
  };
});

// Import component after mocks
import OrganizationTabs from '../OrganizationTabs';

describe('OrganizationTabs', () => {
  const members = [
    { id: 'u-1', name: 'Owner', email: 'owner@example.com', role: 'owner', status: 'active', joinedDate: '2024-01-01T00:00:00Z' },
  ];

  it('disables Invite button when seat availability is exhausted', async () => {
    customRender(
      <OrganizationTabs
        members={members as any}
        organizationId="org-1"
        currentUserRole="admin"
        permissions={{ canInviteMembers: true }}
        membersLoading={false}
        fleetMapSubscription={undefined}
      />
    );

    const inviteBtn = await screen.findByRole('button', { name: /invite member/i });
    expect(inviteBtn).toBeDisabled();
  });
});


