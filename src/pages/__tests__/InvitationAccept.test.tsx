import React from 'react';
import { render, screen, fireEvent, waitFor } from '@/test/utils/test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import InvitationAccept from '../InvitationAccept';
import * as useAuthModule from '@/hooks/useAuth';

// Mock router hooks
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ token: 'valid-token' })
  };
});

// Mock hooks
vi.mock('@/hooks/useSession', () => ({
  useSession: vi.fn(() => ({
    isLoading: false,
    refreshSession: vi.fn()
  }))
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'user-1', email: 'test@test.com' }
  }))
}));

// Mock Supabase client
const mockRpc = vi.fn();
const mockUpdate = vi.fn(() => ({
  eq: vi.fn(() => Promise.resolve({ error: null }))
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
    from: () => ({
      update: mockUpdate
    })
  }
}));

// Mock toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn()
  }
}));

// Mock logger
vi.mock('@/utils/logger', () => ({
  logger: {
    error: vi.fn()
  }
}));

const mockInvitation = {
  id: 'inv-1',
  email: 'test@test.com',
  role: 'member',
  status: 'pending',
  organization_id: 'org-1',
  organization_name: 'Test Organization',
  invited_by_name: 'John Admin',
  message: 'Welcome to the team!',
  expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days from now
};

describe('InvitationAccept Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  describe('Loading State', () => {
    it('shows loading state while fetching invitation', () => {
      mockRpc.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<InvitationAccept />);

      expect(screen.getByText('Loading invitation...')).toBeInTheDocument();
    });
  });

  describe('Error States', () => {
    it('shows error when invitation is not found', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null });

      render(<InvitationAccept />);

      await waitFor(() => {
        expect(screen.getByText('Invalid Invitation')).toBeInTheDocument();
      });
      expect(screen.getByText(/Invitation not found/)).toBeInTheDocument();
    });

    it('shows error when supabase returns an error', async () => {
      mockRpc.mockResolvedValue({ data: null, error: { message: 'Database error' } });

      render(<InvitationAccept />);

      await waitFor(() => {
        expect(screen.getByText('Invalid Invitation')).toBeInTheDocument();
      });
    });
  });

  describe('Valid Invitation Display', () => {
    beforeEach(() => {
      mockRpc.mockImplementation((fnName: string) => {
        if (fnName === 'get_invitation_by_token_secure') {
          return Promise.resolve({ data: [mockInvitation], error: null });
        }
        return Promise.resolve({ data: null, error: null });
      });
    });

    it('displays organization name', async () => {
      render(<InvitationAccept />);

      await waitFor(() => {
        expect(screen.getByText('Test Organization')).toBeInTheDocument();
      });
    });

    it('displays role badge', async () => {
      render(<InvitationAccept />);

      await waitFor(() => {
        expect(screen.getByText('member')).toBeInTheDocument();
      });
    });

    it('displays inviter name', async () => {
      render(<InvitationAccept />);

      await waitFor(() => {
        expect(screen.getByText('John Admin')).toBeInTheDocument();
      });
    });

    it('displays personal message when present', async () => {
      render(<InvitationAccept />);

      await waitFor(() => {
        expect(screen.getByText(/"Welcome to the team!"/)).toBeInTheDocument();
      });
    });

    it('displays accept and decline buttons', async () => {
      render(<InvitationAccept />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /accept invitation/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /decline/i })).toBeInTheDocument();
      });
    });

    it('displays what you get access to section', async () => {
      render(<InvitationAccept />);

      await waitFor(() => {
        expect(screen.getByText("What you'll get access to:")).toBeInTheDocument();
        expect(screen.getByText(/Equipment tracking and management/)).toBeInTheDocument();
      });
    });
  });

  describe('Expired Invitation', () => {
    it('shows expired message for expired invitations', async () => {
      const expiredInvitation = {
        ...mockInvitation,
        expires_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // Yesterday
      };

      mockRpc.mockResolvedValue({ data: [expiredInvitation], error: null });

      render(<InvitationAccept />);

      await waitFor(() => {
        expect(screen.getByText('Invitation Expired')).toBeInTheDocument();
      });
    });
  });

  describe('Already Processed Invitation', () => {
    it('shows message for already accepted invitations', async () => {
      const acceptedInvitation = {
        ...mockInvitation,
        status: 'accepted'
      };

      mockRpc.mockResolvedValue({ data: [acceptedInvitation], error: null });

      render(<InvitationAccept />);

      await waitFor(() => {
        expect(screen.getByText('Invitation Already Processed')).toBeInTheDocument();
      });
    });
  });

  describe('Accept Invitation Flow', () => {
    it('calls accept RPC when accept button is clicked', async () => {
      mockRpc.mockImplementation((fnName: string) => {
        if (fnName === 'get_invitation_by_token_secure') {
          return Promise.resolve({ data: [mockInvitation], error: null });
        }
        if (fnName === 'accept_invitation_atomic') {
          return Promise.resolve({
            data: { success: true, organization_name: 'Test Organization' },
            error: null
          });
        }
        return Promise.resolve({ data: null, error: null });
      });

      render(<InvitationAccept />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /accept invitation/i })).toBeInTheDocument();
      });

      const acceptButton = screen.getByRole('button', { name: /accept invitation/i });
      fireEvent.click(acceptButton);

      await waitFor(() => {
        expect(mockRpc).toHaveBeenCalledWith('accept_invitation_atomic', {
          p_invitation_token: 'valid-token'
        });
      });
    });
  });

  describe('Decline Invitation Flow', () => {
    it('declines invitation and navigates to home', async () => {
      mockRpc.mockResolvedValue({ data: [mockInvitation], error: null });

      render(<InvitationAccept />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /decline/i })).toBeInTheDocument();
      });

      const declineButton = screen.getByRole('button', { name: /decline/i });
      fireEvent.click(declineButton);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/');
      });
    });
  });

  describe('Unauthenticated User', () => {
    it('redirects to auth page with invitation params when not logged in', async () => {
      vi.mocked(useAuthModule.useAuth).mockReturnValue({
        user: null
      } as ReturnType<typeof useAuthModule.useAuth>);

      mockRpc.mockResolvedValue({ data: [mockInvitation], error: null });

      render(<InvitationAccept />);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalled();
      });

      const navigateCall = mockNavigate.mock.calls[0][0];
      expect(navigateCall).toContain('/auth');
      expect(navigateCall).toContain('tab=signup');
    });

    it('stores pending redirect in session storage', async () => {
      vi.mocked(useAuthModule.useAuth).mockReturnValue({
        user: null
      } as ReturnType<typeof useAuthModule.useAuth>);

      mockRpc.mockResolvedValue({ data: [mockInvitation], error: null });

      render(<InvitationAccept />);

      await waitFor(() => {
        expect(sessionStorage.getItem('pendingRedirect')).toBeDefined();
      });
    });
  });
});

