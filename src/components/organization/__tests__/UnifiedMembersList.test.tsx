import React from 'react';
import { screen, fireEvent } from '@testing-library/react';
import { customRender } from '@/test/utils/renderUtils';

// Mock Supabase client without referencing top-level variables (avoid hoist issue)
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

// Hoisted mocks so they are available inside factory at mock time
const { mockResend, mockCancel } = vi.hoisted(() => ({
  mockResend: vi.fn().mockResolvedValue({}),
  mockCancel: vi.fn().mockResolvedValue({}),
}));
vi.mock('@/hooks/useOrganizationInvitations', () => ({
  useOrganizationInvitations: vi.fn().mockReturnValue({
    data: [
      { id: 'inv-1', email: 'invitee@example.com', role: 'member', status: 'pending', createdAt: '2024-01-01T00:00:00Z' },
    ],
    isLoading: false,
  }),
  useResendInvitation: vi.fn().mockReturnValue({ mutateAsync: mockResend }),
  useCancelInvitation: vi.fn().mockReturnValue({ mutateAsync: mockCancel }),
}));

vi.mock('@/hooks/useTeamMembership', () => ({
  useTeamMembership: vi.fn().mockReturnValue({ teamMemberships: [] }),
}));

const mockUpdateRole = vi.fn().mockResolvedValue({});
const mockRemoveMember = vi.fn().mockResolvedValue({});
vi.mock('@/hooks/useOrganizationMembers', () => ({
  useUpdateMemberRole: vi.fn().mockReturnValue({ mutateAsync: mockUpdateRole, isPending: false }),
  useRemoveMember: vi.fn().mockReturnValue({ mutateAsync: mockRemoveMember, isPending: false }),
}));

// Stub PurchaseLicensesButton to avoid provider dependency in tests
vi.mock('@/components/billing/PurchaseLicensesButton', () => ({
  default: () => null,
}));

// Import component after mocks to ensure they take effect
import UnifiedMembersList from '../UnifiedMembersList';

describe('UnifiedMembersList', () => {
  const baseMembers = [
    {
      id: 'u-1',
      name: 'Alice Admin',
      email: 'alice@example.com',
      role: 'admin' as const,
      status: 'active' as const,
      joinedDate: '2024-01-10T00:00:00Z',
      avatar: undefined,
    },
    {
      id: 'u-2',
      name: 'Bob Member',
      email: 'bob@example.com',
      role: 'member' as const,
      status: 'active' as const,
      joinedDate: '2024-01-11T00:00:00Z',
      avatar: undefined,
    },
  ];

  const seatAvailability = {
    total_purchased: 2,
    used_slots: 2,
    available_slots: 0,
    exempted_slots: 0,
    current_period_start: '2024-01-01T00:00:00Z',
    current_period_end: '2024-02-01T00:00:00Z',
  };

  it('renders active members and pending invitations in a unified list', async () => {
    customRender(
      <UnifiedMembersList
        members={baseMembers as any}
        organizationId="org-1"
        currentUserRole="admin"
        isLoading={false}
        canInviteMembers={true}
        slotAvailability={seatAvailability}
      />
    );

    // Active member
    expect(await screen.findByText('Alice Admin')).toBeInTheDocument();
    // Pending invitation row
    expect(screen.getByText('Pending Invite')).toBeInTheDocument();
    expect(screen.getByText('invitee@example.com')).toBeInTheDocument();
  });

  it('disables Invite button when no seats are available and shows seat badge', async () => {
    customRender(
      <UnifiedMembersList
        members={baseMembers as any}
        organizationId="org-1"
        currentUserRole="admin"
        isLoading={false}
        canInviteMembers={true}
        slotAvailability={seatAvailability}
      />
    );

    const inviteBtn = await screen.findByRole('button', { name: /invite member/i });
    expect(inviteBtn).toBeDisabled();

    // Seat status badge text
    expect(screen.getByText(/Seats: 2\/2/i)).toBeInTheDocument();
    expect(screen.getByText(/Available 0/i)).toBeInTheDocument();
  });

  it('shows role select for editable members and triggers role change', async () => {
    customRender(
      <UnifiedMembersList
        members={baseMembers as any}
        organizationId="org-1"
        currentUserRole="admin"
        isLoading={false}
        canInviteMembers={true}
        slotAvailability={{ ...seatAvailability, available_slots: 1, used_slots: 1, total_purchased: 2 }}
      />
    );

    // Bob Member should have a role select (admin can edit members)
    const roleSelect = await screen.findAllByRole('button', { name: /member/i });
    // The first "Member" text might be badge; ensure at least one trigger exists
    fireEvent.click(roleSelect[0]);
    const adminOption = await screen.findByRole('option', { name: /admin/i });
    fireEvent.click(adminOption);

    expect(mockUpdateRole).toHaveBeenCalled();
  });
});


