import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';
import { MFAProvider } from '../MFAContext';
import { useMFA } from '@/hooks/useMFA';
import { supabase } from '@/integrations/supabase/client';

// Mock the auth hook
const mockUser = { id: 'user-123', email: 'test@example.com' };
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: mockUser,
    session: { user: mockUser },
    isLoading: false,
  }),
}));

// Mock isMFAEnabled to return true for these tests
vi.mock('@/lib/flags', () => ({
  isMFAEnabled: () => true,
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <MFAProvider>{children}</MFAProvider>
);

describe('MFAContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('provides default state when no factors are enrolled', async () => {
    const { result } = renderHook(() => useMFA(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isEnrolled).toBe(false);
    expect(result.current.isVerified).toBe(false);
    expect(result.current.needsVerification).toBe(false);
    expect(result.current.factors).toEqual([]);
  });

  it('derives isEnrolled=true when a verified factor exists', async () => {
    const mockFactor = {
      id: 'factor-1',
      status: 'verified',
      friendly_name: 'Authenticator App',
      factor_type: 'totp',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    };

    vi.mocked(supabase.auth.mfa.listFactors).mockResolvedValueOnce({
      data: { totp: [mockFactor], phone: [] },
      error: null,
    } as unknown as ReturnType<typeof supabase.auth.mfa.listFactors>);

    const { result } = renderHook(() => useMFA(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isEnrolled).toBe(true);
    expect(result.current.factors).toHaveLength(1);
  });

  it('derives isVerified=true when currentLevel is aal2', async () => {
    vi.mocked(supabase.auth.mfa.getAuthenticatorAssuranceLevel).mockResolvedValueOnce({
      data: { currentLevel: 'aal2', nextLevel: 'aal2', currentAuthenticationMethods: [] },
      error: null,
    } as unknown as ReturnType<typeof supabase.auth.mfa.getAuthenticatorAssuranceLevel>);

    const { result } = renderHook(() => useMFA(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isVerified).toBe(true);
  });

  it('derives needsVerification when enrolled but at aal1', async () => {
    const mockFactor = {
      id: 'factor-1',
      status: 'verified',
      friendly_name: 'Authenticator App',
      factor_type: 'totp',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    };

    vi.mocked(supabase.auth.mfa.listFactors).mockResolvedValueOnce({
      data: { totp: [mockFactor], phone: [] },
      error: null,
    } as unknown as ReturnType<typeof supabase.auth.mfa.listFactors>);

    vi.mocked(supabase.auth.mfa.getAuthenticatorAssuranceLevel).mockResolvedValueOnce({
      data: { currentLevel: 'aal1', nextLevel: 'aal2', currentAuthenticationMethods: [] },
      error: null,
    } as unknown as ReturnType<typeof supabase.auth.mfa.getAuthenticatorAssuranceLevel>);

    const { result } = renderHook(() => useMFA(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.needsVerification).toBe(true);
    expect(result.current.isEnrolled).toBe(true);
    expect(result.current.isVerified).toBe(false);
  });

  it('enrollTOTP calls mfa.enroll and returns QR data', async () => {
    const { result } = renderHook(() => useMFA(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    let enrollResult: Awaited<ReturnType<typeof result.current.enrollTOTP>>;
    await act(async () => {
      enrollResult = await result.current.enrollTOTP();
    });

    expect(supabase.auth.mfa.enroll).toHaveBeenCalledWith({
      factorType: 'totp',
      friendlyName: 'Authenticator App',
    });
    expect(enrollResult!).toMatchObject({
      qrCode: expect.any(String),
      secret: expect.any(String),
      factorId: expect.any(String),
    });
  });

  it('verifyTOTP calls challenge then verify', async () => {
    const { result } = renderHook(() => useMFA(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.verifyTOTP('factor-1', '123456');
    });

    expect(supabase.auth.mfa.challenge).toHaveBeenCalledWith({ factorId: 'factor-1' });
    expect(supabase.auth.mfa.verify).toHaveBeenCalledWith({
      factorId: 'factor-1',
      challengeId: 'challenge-1',
      code: '123456',
    });
  });

  it('unenrollFactor calls mfa.unenroll', async () => {
    const { result } = renderHook(() => useMFA(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      const { error } = await result.current.unenrollFactor('factor-1');
      expect(error).toBeNull();
    });

    expect(supabase.auth.mfa.unenroll).toHaveBeenCalledWith({ factorId: 'factor-1' });
  });

  it('uses Promise.all for parallel MFA status fetch', async () => {
    renderHook(() => useMFA(), { wrapper });

    // Both should be called (via refreshMFAStatus which uses Promise.all)
    await waitFor(() => {
      expect(supabase.auth.mfa.getAuthenticatorAssuranceLevel).toHaveBeenCalled();
      expect(supabase.auth.mfa.listFactors).toHaveBeenCalled();
    });
  });
});
