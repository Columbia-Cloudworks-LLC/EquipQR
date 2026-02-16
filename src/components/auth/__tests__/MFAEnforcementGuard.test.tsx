import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import MFAEnforcementGuard from '../MFAEnforcementGuard';

// Mock document.elementFromPoint used by input-otp internal PWM badge
if (!document.elementFromPoint) {
  document.elementFromPoint = vi.fn().mockReturnValue(null);
}

// Mock state
let mockMFAState = {
  isEnrolled: false,
  isVerified: false,
  needsVerification: false,
  isLoading: false,
  factors: [] as Array<{ id: string; status: string; friendly_name: string; factor_type: string; created_at: string; updated_at: string }>,
  currentLevel: null as string | null,
  nextLevel: null as string | null,
  enrollTOTP: vi.fn().mockResolvedValue({
    qrCode: 'data:image/svg+xml;base64,test',
    secret: 'TESTSECRET',
    factorId: 'factor-1',
  }),
  verifyTOTP: vi.fn().mockResolvedValue({ error: null }),
  unenrollFactor: vi.fn().mockResolvedValue({ error: null }),
  challengeAndVerify: vi.fn().mockResolvedValue({ error: null }),
  refreshMFAStatus: vi.fn(),
};

vi.mock('@/hooks/useMFA', () => ({
  useMFA: () => mockMFAState,
}));

let mockOrgContext: { currentOrganization: { userRole: string } | null } | null = null;

vi.mock('@/hooks/useSimpleOrganization', () => ({
  useSimpleOrganizationSafe: () => mockOrgContext,
}));

let mockMFAEnabled = true;
vi.mock('@/lib/flags', () => ({
  isMFAEnabled: () => mockMFAEnabled,
}));

// Mock useAppToast for MFAEnrollment
vi.mock('@/hooks/useAppToast', () => ({
  useAppToast: () => ({
    toast: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  }),
}));

describe('MFAEnforcementGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockMFAEnabled = true;
    mockMFAState = {
      isEnrolled: false,
      isVerified: false,
      needsVerification: false,
      isLoading: false,
      factors: [],
      currentLevel: null,
      nextLevel: null,
      enrollTOTP: vi.fn().mockResolvedValue({
        qrCode: 'data:image/svg+xml;base64,test',
        secret: 'TESTSECRET',
        factorId: 'factor-1',
      }),
      verifyTOTP: vi.fn().mockResolvedValue({ error: null }),
      unenrollFactor: vi.fn().mockResolvedValue({ error: null }),
      challengeAndVerify: vi.fn().mockResolvedValue({ error: null }),
      refreshMFAStatus: vi.fn(),
    };
    mockOrgContext = null;
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('passes through when MFA feature flag is disabled', () => {
    mockMFAEnabled = false;

    render(
      <MFAEnforcementGuard>
        <div>Protected Content</div>
      </MFAEnforcementGuard>
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('passes through for member role', () => {
    mockOrgContext = {
      currentOrganization: { userRole: 'member' },
    };

    render(
      <MFAEnforcementGuard>
        <div>Protected Content</div>
      </MFAEnforcementGuard>
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('passes through when no organization context', () => {
    mockOrgContext = null;

    render(
      <MFAEnforcementGuard>
        <div>Protected Content</div>
      </MFAEnforcementGuard>
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('shows enrollment screen for admin without MFA', () => {
    mockOrgContext = {
      currentOrganization: { userRole: 'admin' },
    };
    mockMFAState.isEnrolled = false;

    render(
      <MFAEnforcementGuard>
        <div>Protected Content</div>
      </MFAEnforcementGuard>
    );

    // Should not show protected content
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    // Should show enrollment (loading state initially)
    expect(screen.getByText(/setting up authenticator/i)).toBeInTheDocument();
  });

  it('shows enrollment screen for owner without MFA', () => {
    mockOrgContext = {
      currentOrganization: { userRole: 'owner' },
    };
    mockMFAState.isEnrolled = false;

    render(
      <MFAEnforcementGuard>
        <div>Protected Content</div>
      </MFAEnforcementGuard>
    );

    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('shows verification screen for admin with MFA enrolled but not verified', () => {
    mockOrgContext = {
      currentOrganization: { userRole: 'admin' },
    };
    mockMFAState.isEnrolled = true;
    mockMFAState.isVerified = false;

    render(
      <MFAEnforcementGuard>
        <div>Protected Content</div>
      </MFAEnforcementGuard>
    );

    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    expect(screen.getByText('Two-Factor Authentication')).toBeInTheDocument();
  });

  it('passes through for admin with MFA enrolled and verified', () => {
    mockOrgContext = {
      currentOrganization: { userRole: 'admin' },
    };
    mockMFAState.isEnrolled = true;
    mockMFAState.isVerified = true;

    render(
      <MFAEnforcementGuard>
        <div>Protected Content</div>
      </MFAEnforcementGuard>
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('passes through for owner with MFA enrolled and verified', () => {
    mockOrgContext = {
      currentOrganization: { userRole: 'owner' },
    };
    mockMFAState.isEnrolled = true;
    mockMFAState.isVerified = true;

    render(
      <MFAEnforcementGuard>
        <div>Protected Content</div>
      </MFAEnforcementGuard>
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('shows loading state while MFA status is loading for admin', () => {
    mockOrgContext = {
      currentOrganization: { userRole: 'admin' },
    };
    mockMFAState.isLoading = true;

    render(
      <MFAEnforcementGuard>
        <div>Protected Content</div>
      </MFAEnforcementGuard>
    );

    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    expect(screen.getByText(/verifying security requirements/i)).toBeInTheDocument();
  });
});
