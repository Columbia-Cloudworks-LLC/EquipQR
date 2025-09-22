import React from 'react';
import { screen } from '@testing-library/react';
import { customRender } from '@/test/utils/renderUtils';
import OrganizationTabs from '../OrganizationTabs';
import { createMockSupabaseClient } from '@/test/utils/mock-supabase';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: createMockSupabaseClient(),
}));

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


