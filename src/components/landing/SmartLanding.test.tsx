import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
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

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('@/pages/Landing', () => ({
  __esModule: true,
  default: () => <div data-testid="landing-page">Landing Page</div>,
}));

describe('SmartLanding', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockUseAuth.mockReset();
  });

  it('redirects authenticated users to dashboard', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'user-123', email: 'test@example.com' },
      isLoading: false,
    });

    render(<SmartLanding />);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
    });
  });

  it('shows landing page for unauthenticated users', async () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: false,
    });

    render(<SmartLanding />);

    await waitFor(() => {
      expect(screen.getByTestId('landing-page')).toBeInTheDocument();
    });
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('shows nothing while auth is loading', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: true,
    });

    const { container } = render(<SmartLanding />);

    expect(container.firstChild).toBeNull();
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});

