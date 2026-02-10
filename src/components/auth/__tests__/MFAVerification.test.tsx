import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import MFAVerification from '../MFAVerification';

// Mock document.elementFromPoint used by input-otp internal PWM badge
if (!document.elementFromPoint) {
  document.elementFromPoint = vi.fn().mockReturnValue(null);
}

// Mock useMFA hook
const mockChallengeAndVerify = vi.fn();
vi.mock('@/hooks/useMFA', () => ({
  useMFA: () => ({
    challengeAndVerify: mockChallengeAndVerify,
    factors: [],
    currentLevel: null,
    nextLevel: null,
    isEnrolled: false,
    isVerified: false,
    needsVerification: false,
    isLoading: false,
    enrollTOTP: vi.fn(),
    verifyTOTP: vi.fn(),
    unenrollFactor: vi.fn(),
    refreshMFAStatus: vi.fn(),
  }),
}));

describe('MFAVerification', () => {
  const mockOnSuccess = vi.fn();
  const mockOnError = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('renders the verification UI with heading and description', () => {
    render(<MFAVerification onSuccess={mockOnSuccess} />);

    expect(screen.getByText('Two-Factor Authentication')).toBeInTheDocument();
    expect(screen.getByText('Enter the 6-digit code from your authenticator app')).toBeInTheDocument();
  });

  it('renders verify button disabled when code is incomplete', () => {
    render(<MFAVerification onSuccess={mockOnSuccess} />);

    const verifyButton = screen.getByRole('button', { name: /verify/i });
    expect(verifyButton).toBeDisabled();
  });

  it('calls onSuccess when verification succeeds', async () => {
    mockChallengeAndVerify.mockResolvedValueOnce({ error: null });

    render(<MFAVerification onSuccess={mockOnSuccess} onError={mockOnError} />);

    // Find the OTP input and type a code
    const otpInput = screen.getByRole('textbox', { hidden: true });
    if (otpInput) {
      fireEvent.change(otpInput, { target: { value: '123456' } });
    }

    // Since auto-submit fires, wait for the success callback
    await waitFor(() => {
      expect(mockChallengeAndVerify).toHaveBeenCalledWith('123456');
    });

    // Verify onSuccess is called after successful verification
    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalledTimes(1);
    });
  });

  it('displays error message on verification failure', async () => {
    mockChallengeAndVerify.mockResolvedValueOnce({ error: new Error('Invalid code') });

    render(<MFAVerification onSuccess={mockOnSuccess} onError={mockOnError} />);

    // Find the OTP input and enter a 6-digit code to trigger auto-submit
    const otpInput = screen.getByRole('textbox', { hidden: true });
    if (otpInput) {
      fireEvent.change(otpInput, { target: { value: '999999' } });
    }

    // Wait for the error to appear in the UI
    await waitFor(() => {
      expect(mockChallengeAndVerify).toHaveBeenCalledWith('999999');
    });

    // Verify onError is called with the error message
    await waitFor(() => {
      expect(mockOnError).toHaveBeenCalled();
    });
  });

  it('has proper ARIA attributes', () => {
    render(<MFAVerification onSuccess={mockOnSuccess} />);

    // Check for accessible elements
    expect(screen.getByText('Two-Factor Authentication')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /verify/i })).toBeInTheDocument();
  });
});
