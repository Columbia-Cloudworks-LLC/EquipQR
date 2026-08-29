import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';

// Mock useAuth hook
const mockUseAuth = vi.fn();

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock Navigate component
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    Navigate: ({ to, replace }: { to: string; replace?: boolean }) => {
      mockNavigate(to, replace);
      return <div data-testid="navigate">Navigate to {to}</div>;
    },
  };
});

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderProtectedRoute = (children: React.ReactNode = <div>Protected Content</div>) => {
    return render(
      <MemoryRouter>
        <ProtectedRoute>{children}</ProtectedRoute>
      </MemoryRouter>
    );
  };

  it('should show a page skeleton when auth is loading', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: true,
    });

    renderProtectedRoute();

    expect(
      screen.getByRole('status', { name: /checking authentication/i, hidden: true })
    ).toBeInTheDocument();
    expect(screen.getByRole('status', { name: /loading page content/i })).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('should render a custom loading fallback when provided', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: true,
    });

    render(
      <MemoryRouter>
        <ProtectedRoute loadingFallback={<div>Dashboard shell loading</div>}>
          <div>Protected Content</div>
        </ProtectedRoute>
      </MemoryRouter>
    );

    expect(screen.getByText('Dashboard shell loading')).toBeInTheDocument();
    expect(
      screen.queryByRole('status', { name: /checking authentication/i, hidden: true })
    ).not.toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('should redirect to auth when user is not authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: false,
    });

    renderProtectedRoute();

    expect(mockNavigate).toHaveBeenCalledWith('/auth', true);
    expect(screen.getByTestId('navigate')).toHaveTextContent('Navigate to /auth');
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('should render children when user is authenticated', () => {
    const mockUser = {
      id: 'user-1',
      email: 'test@example.com',
    };

    mockUseAuth.mockReturnValue({
      user: mockUser,
      isLoading: false,
    });

    renderProtectedRoute();

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('should render complex children when authenticated', () => {
    const mockUser = {
      id: 'user-1',
      email: 'test@example.com',
    };

    mockUseAuth.mockReturnValue({
      user: mockUser,
      isLoading: false,
    });

    const ComplexChild = () => (
      <div>
        <h1>Dashboard</h1>
        <p>Welcome back, {mockUser.email}!</p>
        <button>Action Button</button>
      </div>
    );

    renderProtectedRoute(<ComplexChild />);

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText(`Welcome back, ${mockUser.email}!`)).toBeInTheDocument();
    expect(screen.getByText('Action Button')).toBeInTheDocument();
  });

  it('should handle user state changes correctly', () => {
    // Initially not authenticated
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: false,
    });

    const { rerender } = renderProtectedRoute();

    expect(mockNavigate).toHaveBeenCalledWith('/auth', true);

    // Simulate user authentication
    mockUseAuth.mockReturnValue({
      user: { id: 'user-1', email: 'test@example.com' },
      isLoading: false,
    });

    rerender(
      <MemoryRouter>
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      </MemoryRouter>
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('should handle loading to authenticated transition', () => {
    // Initially loading
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: true,
    });

    const { rerender } = renderProtectedRoute();

    expect(
      screen.getByRole('status', { name: /checking authentication/i, hidden: true })
    ).toBeInTheDocument();
    expect(screen.getByRole('status', { name: /loading page content/i })).toBeInTheDocument();

    // Transition to authenticated
    mockUseAuth.mockReturnValue({
      user: { id: 'user-1', email: 'test@example.com' },
      isLoading: false,
    });

    rerender(
      <MemoryRouter>
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      </MemoryRouter>
    );

    expect(screen.queryByRole('status', { hidden: true })).not.toBeInTheDocument();
    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('should handle loading to unauthenticated transition', () => {
    // Initially loading
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: true,
    });

    const { rerender } = renderProtectedRoute();

    expect(
      screen.getByRole('status', { name: /checking authentication/i, hidden: true })
    ).toBeInTheDocument();
    expect(screen.getByRole('status', { name: /loading page content/i })).toBeInTheDocument();

    // Transition to unauthenticated
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: false,
    });

    rerender(
      <MemoryRouter>
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      </MemoryRouter>
    );

    expect(screen.queryByRole('status', { hidden: true })).not.toBeInTheDocument();
    expect(mockNavigate).toHaveBeenCalledWith('/auth', true);
  });
});