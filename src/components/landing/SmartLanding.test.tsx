import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import SmartLanding from './SmartLanding';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const mockUseAuth = vi.fn();
const mockUseWorkspaceOnboardingState = vi.fn();

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('@/hooks/useWorkspaceOnboarding', () => ({
  useWorkspaceOnboardingState: () => mockUseWorkspaceOnboardingState(),
}));

vi.mock('@/pages/Landing', () => ({
  __esModule: true,
  default: () => null,
}));

describe('SmartLanding', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it('redirects Google Workspace users to onboarding when domain is unclaimed', async () => {
    mockUseAuth.mockReturnValue({
      user: { app_metadata: { provider: 'google' } },
      isLoading: false,
    });
    mockUseWorkspaceOnboardingState.mockReturnValue({
      data: {
        domain: 'acme.com',
        domain_status: 'unclaimed',
        is_workspace_connected: false,
      },
      isLoading: false,
    });

    render(<SmartLanding />);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard/onboarding/workspace', { replace: true });
    });
  });

  it('redirects to dashboard when onboarding is complete', async () => {
    mockUseAuth.mockReturnValue({
      user: { app_metadata: { provider: 'google' } },
      isLoading: false,
    });
    mockUseWorkspaceOnboardingState.mockReturnValue({
      data: {
        domain: 'acme.com',
        domain_status: 'claimed',
        is_workspace_connected: true,
      },
      isLoading: false,
    });

    render(<SmartLanding />);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
    });
  });
});

