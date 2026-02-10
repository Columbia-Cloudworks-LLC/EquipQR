import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MFASettings from '../MFASettings';

// Mock document.elementFromPoint used by input-otp internal PWM badge
if (!document.elementFromPoint) {
  document.elementFromPoint = vi.fn().mockReturnValue(null);
}

// Mock data
const mockUnenrollFactor = vi.fn();
const mockRefreshMFAStatus = vi.fn();

let mockMFAState = {
  factors: [] as Array<{ id: string; status: string; friendly_name: string; created_at: string; factor_type: string; updated_at: string }>,
  isEnrolled: false,
  isVerified: false,
  needsVerification: false,
  isLoading: false,
  currentLevel: null as string | null,
  nextLevel: null as string | null,
  enrollTOTP: vi.fn(),
  verifyTOTP: vi.fn(),
  unenrollFactor: mockUnenrollFactor,
  challengeAndVerify: vi.fn(),
  refreshMFAStatus: mockRefreshMFAStatus,
};

vi.mock('@/hooks/useMFA', () => ({
  useMFA: () => mockMFAState,
}));

// Mock organization context
let mockOrgContext: { currentOrganization: { userRole: string } | null } | null = {
  currentOrganization: { userRole: 'member' },
};

vi.mock('@/hooks/useSimpleOrganization', () => ({
  useSimpleOrganizationSafe: () => mockOrgContext,
}));

// Mock useAppToast
vi.mock('@/hooks/useAppToast', () => ({
  useAppToast: () => ({
    toast: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  }),
}));

describe('MFASettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMFAState = {
      factors: [],
      isEnrolled: false,
      isVerified: false,
      needsVerification: false,
      isLoading: false,
      currentLevel: null,
      nextLevel: null,
      enrollTOTP: vi.fn(),
      verifyTOTP: vi.fn(),
      unenrollFactor: mockUnenrollFactor,
      challengeAndVerify: vi.fn(),
      refreshMFAStatus: mockRefreshMFAStatus,
    };
    mockOrgContext = {
      currentOrganization: { userRole: 'member' },
    };
  });

  it('shows "Disabled" badge when MFA is not enrolled', () => {
    render(<MFASettings />);

    expect(screen.getByText('Disabled')).toBeInTheDocument();
    expect(screen.getByText('Two-Factor Authentication')).toBeInTheDocument();
  });

  it('shows setup button when MFA is not enrolled', () => {
    render(<MFASettings />);

    expect(screen.getByRole('button', { name: /set up two-factor authentication/i })).toBeInTheDocument();
  });

  it('shows "Enabled" badge when MFA is enrolled', () => {
    mockMFAState.isEnrolled = true;
    mockMFAState.factors = [{
      id: 'factor-1',
      status: 'verified',
      friendly_name: 'Authenticator App',
      created_at: '2026-01-15T10:00:00Z',
      factor_type: 'totp',
      updated_at: '2026-01-15T10:00:00Z',
    }];

    render(<MFASettings />);

    expect(screen.getByText('Enabled')).toBeInTheDocument();
    expect(screen.getByText('Authenticator App')).toBeInTheDocument();
  });

  it('shows enrolled date for verified factors', () => {
    mockMFAState.isEnrolled = true;
    mockMFAState.factors = [{
      id: 'factor-1',
      status: 'verified',
      friendly_name: 'Authenticator App',
      created_at: '2026-01-15T10:00:00Z',
      factor_type: 'totp',
      updated_at: '2026-01-15T10:00:00Z',
    }];

    render(<MFASettings />);

    // Should show formatted date
    expect(screen.getByText(/Added/)).toBeInTheDocument();
  });

  it('shows "Required for your role" notice for admin users', () => {
    mockOrgContext = {
      currentOrganization: { userRole: 'admin' },
    };

    render(<MFASettings />);

    expect(screen.getByText(/required for your role/i)).toBeInTheDocument();
  });

  it('shows "Required for your role" notice for owner users', () => {
    mockOrgContext = {
      currentOrganization: { userRole: 'owner' },
    };

    render(<MFASettings />);

    expect(screen.getByText(/required for your role/i)).toBeInTheDocument();
  });

  it('does not show required notice for member users', () => {
    mockOrgContext = {
      currentOrganization: { userRole: 'member' },
    };

    render(<MFASettings />);

    expect(screen.queryByText(/required for your role/i)).not.toBeInTheDocument();
  });

  it('disables remove button for admin users with MFA enrolled', () => {
    mockOrgContext = {
      currentOrganization: { userRole: 'admin' },
    };
    mockMFAState.isEnrolled = true;
    mockMFAState.factors = [{
      id: 'factor-1',
      status: 'verified',
      friendly_name: 'Authenticator App',
      created_at: '2026-01-15T10:00:00Z',
      factor_type: 'totp',
      updated_at: '2026-01-15T10:00:00Z',
    }];

    render(<MFASettings />);

    const removeButton = screen.getByRole('button', { name: /remove authenticator/i });
    expect(removeButton).toBeDisabled();
  });

  it('shows enrollment flow when setup button is clicked', async () => {
    const user = userEvent.setup();

    // Mock enrollTOTP for the enrollment flow
    mockMFAState.enrollTOTP = vi.fn().mockResolvedValue({
      qrCode: 'data:image/svg+xml;base64,test',
      secret: 'TESTSECRET',
      factorId: 'factor-new',
    });

    render(<MFASettings />);

    await user.click(screen.getByRole('button', { name: /set up two-factor authentication/i }));

    // Should show enrollment component — either loading or the scan step with QR code
    await waitFor(() => {
      const hasLoading = screen.queryByText(/setting up authenticator/i);
      const hasQR = screen.queryByText(/set up two-factor authentication/i);
      expect(hasLoading || hasQR).toBeTruthy();
    });
  });

  it('shows loading spinner while MFA status is loading', () => {
    mockMFAState.isLoading = true;

    render(<MFASettings />);

    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});
