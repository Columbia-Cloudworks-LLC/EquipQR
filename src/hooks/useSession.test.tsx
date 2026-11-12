import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { render, screen } from '@vitest-harness/utils/test-utils';
import type { SessionData } from '@/types/session';
import { useSession } from './useSession';

interface SessionDataWithUser extends SessionData {
  user?: { id?: string };
}

const TestComponent = () => {
  const { sessionData, isLoading, error, refreshSession } = useSession();

  return (
    <div>
      <div data-testid="is-loading">{isLoading.toString()}</div>
      <div data-testid="has-error">{(error ? 'true' : 'false')}</div>
        <div data-testid="current-org-id">{sessionData?.currentOrganizationId || 'none'}</div>
        <div data-testid="user-id">{'user' in (sessionData || {}) ? (sessionData as SessionDataWithUser).user?.id : 'none'}</div>
      <button 
        data-testid="refresh-button" 
        onClick={() => refreshSession()}
      >
        Refresh
      </button>
    </div>
  );
};

describe('useSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should provide session data from context successfully', () => {
    // Use the default MockSessionProvider from test utils
    render(<TestComponent />);

    // Verify session data is available
    expect(screen.getByTestId('is-loading')).toHaveTextContent('false');
    expect(screen.getByTestId('has-error')).toHaveTextContent('false');
    expect(screen.getByTestId('current-org-id')).toHaveTextContent('org-1');
    expect(screen.getByTestId('user-id')).toHaveTextContent('none');

    // Verify refresh function is available
    const refreshButton = screen.getByTestId('refresh-button');
    expect(refreshButton).toBeInTheDocument();
  });

  it('should throw error when used without SessionProvider', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    // React 18 does not reliably surface useContext guard throws via rtl render + expect().toThrow();
    // renderHook invokes the hook body synchronously and preserves the contract.
    try {
      expect(() => {
        renderHook(() => useSession());
      }).toThrow('useSession must be used within a SessionProvider');
    } finally {
      consoleSpy.mockRestore();
    }
  });
});