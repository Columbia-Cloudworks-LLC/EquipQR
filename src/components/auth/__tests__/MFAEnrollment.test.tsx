import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MFAEnrollment from '../MFAEnrollment';

// Mock document.elementFromPoint used by input-otp internal PWM badge
if (!document.elementFromPoint) {
  document.elementFromPoint = vi.fn().mockReturnValue(null);
}

// Mock useMFA hook
const mockEnrollTOTP = vi.fn();
const mockVerifyTOTP = vi.fn();

vi.mock('@/hooks/useMFA', () => ({
  useMFA: () => ({
    enrollTOTP: mockEnrollTOTP,
    verifyTOTP: mockVerifyTOTP,
    factors: [],
    currentLevel: null,
    nextLevel: null,
    isEnrolled: false,
    isVerified: false,
    needsVerification: false,
    isLoading: false,
    challengeAndVerify: vi.fn(),
    unenrollFactor: vi.fn(),
    refreshMFAStatus: vi.fn(),
  }),
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

describe('MFAEnrollment', () => {
  const mockOnComplete = vi.fn();
  const mockOnSkip = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockEnrollTOTP.mockResolvedValue({
      qrCode: 'data:image/svg+xml;base64,testqrcode',
      secret: 'JBSWY3DPEHPK3PXP',
      factorId: 'factor-test-123',
    });
  });

  it('shows loading state initially', () => {
    render(<MFAEnrollment onComplete={mockOnComplete} />);

    expect(screen.getByText('Setting up authenticator...')).toBeInTheDocument();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('shows QR code after enrollment initialization', async () => {
    render(<MFAEnrollment onComplete={mockOnComplete} />);

    await waitFor(() => {
      expect(screen.getByAltText(/QR code for authenticator app/)).toBeInTheDocument();
    });

    expect(mockEnrollTOTP).toHaveBeenCalled();
  });

  it('shows the secret for manual entry', async () => {
    render(<MFAEnrollment onComplete={mockOnComplete} />);

    await waitFor(() => {
      expect(screen.getByText('JBSWY3DPEHPK3PXP')).toBeInTheDocument();
    });
  });

  it('shows "I\'ve Scanned the Code" button in scan step', async () => {
    render(<MFAEnrollment onComplete={mockOnComplete} />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /scanned the code/i })).toBeInTheDocument();
    });
  });

  it('transitions to verify step when clicking "I\'ve Scanned the Code"', async () => {
    const user = userEvent.setup();
    render(<MFAEnrollment onComplete={mockOnComplete} />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /scanned the code/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /scanned the code/i }));

    expect(screen.getByText(/enter the 6-digit code/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument();
  });

  it('shows skip button when not required', async () => {
    render(
      <MFAEnrollment
        onComplete={mockOnComplete}
        onSkip={mockOnSkip}
        isRequired={false}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /skip for now/i })).toBeInTheDocument();
    });
  });

  it('hides skip button when isRequired is true', async () => {
    render(
      <MFAEnrollment
        onComplete={mockOnComplete}
        isRequired={true}
      />
    );

    await waitFor(() => {
      expect(screen.getByAltText(/QR code for authenticator app/)).toBeInTheDocument();
    });

    expect(screen.queryByRole('button', { name: /skip for now/i })).not.toBeInTheDocument();
  });

  it('shows required message for admin accounts', async () => {
    render(
      <MFAEnrollment
        onComplete={mockOnComplete}
        isRequired={true}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/your role requires/i)).toBeInTheDocument();
    });
  });

  it('shows error when enrollment fails', async () => {
    mockEnrollTOTP.mockResolvedValueOnce(null);

    render(<MFAEnrollment onComplete={mockOnComplete} />);

    await waitFor(() => {
      expect(screen.getByText(/failed to start mfa enrollment/i)).toBeInTheDocument();
    });
  });
});
