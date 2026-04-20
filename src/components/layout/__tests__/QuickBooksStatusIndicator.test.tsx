import React from 'react';
import { render, screen } from '@/test/utils/test-utils';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the flag and connection hook BEFORE importing the component under test.
const isQuickBooksEnabledMock = vi.fn<[], boolean>();
const useQuickBooksConnectionMock = vi.fn();

vi.mock('@/lib/flags', async () => {
  const actual = await vi.importActual<typeof import('@/lib/flags')>('@/lib/flags');
  return {
    ...actual,
    isQuickBooksEnabled: () => isQuickBooksEnabledMock(),
  };
});

vi.mock('@/hooks/useQuickBooksConnection', () => ({
  useQuickBooksConnection: (...args: unknown[]) => useQuickBooksConnectionMock(...args),
}));

import QuickBooksStatusIndicator from '../QuickBooksStatusIndicator';

const ORG_ID = 'org-test-123';

describe('QuickBooksStatusIndicator', () => {
  beforeEach(() => {
    isQuickBooksEnabledMock.mockReset();
    useQuickBooksConnectionMock.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const expectNoIndicator = () => {
    expect(screen.queryByRole('link', { name: /quickbooks/i })).not.toBeInTheDocument();
  };

  it('renders nothing when QuickBooks feature flag is disabled', () => {
    isQuickBooksEnabledMock.mockReturnValue(false);
    useQuickBooksConnectionMock.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
    });

    render(<QuickBooksStatusIndicator organizationId={ORG_ID} />);
    expectNoIndicator();
  });

  it('renders nothing when query is loading', () => {
    isQuickBooksEnabledMock.mockReturnValue(true);
    useQuickBooksConnectionMock.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    });

    render(<QuickBooksStatusIndicator organizationId={ORG_ID} />);
    expectNoIndicator();
  });

  it('renders nothing when QuickBooks is not connected', () => {
    isQuickBooksEnabledMock.mockReturnValue(true);
    useQuickBooksConnectionMock.mockReturnValue({
      data: { isConnected: false },
      isLoading: false,
      isError: false,
    });

    render(<QuickBooksStatusIndicator organizationId={ORG_ID} />);
    expectNoIndicator();
  });

  it('renders a green-dot connected pill when token is valid', () => {
    isQuickBooksEnabledMock.mockReturnValue(true);
    useQuickBooksConnectionMock.mockReturnValue({
      data: { isConnected: true, isAccessTokenValid: true },
      isLoading: false,
      isError: false,
    });

    render(<QuickBooksStatusIndicator organizationId={ORG_ID} />);

    const link = screen.getByRole('link', { name: /quickbooks integration connected/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/dashboard/organization#integrations');

    const dot = link.querySelector('span[aria-hidden="true"].bg-success');
    expect(dot).toBeInTheDocument();
  });

  it('renders a red-dot expired pill when token is invalid', () => {
    isQuickBooksEnabledMock.mockReturnValue(true);
    useQuickBooksConnectionMock.mockReturnValue({
      data: { isConnected: true, isAccessTokenValid: false },
      isLoading: false,
      isError: false,
    });

    render(<QuickBooksStatusIndicator organizationId={ORG_ID} />);

    const link = screen.getByRole('link', { name: /quickbooks integration token expired/i });
    expect(link).toBeInTheDocument();

    const dot = link.querySelector('span[aria-hidden="true"].bg-destructive');
    expect(dot).toBeInTheDocument();
  });

  it('renders nothing when the query errors', () => {
    isQuickBooksEnabledMock.mockReturnValue(true);
    useQuickBooksConnectionMock.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    });

    render(<QuickBooksStatusIndicator organizationId={ORG_ID} />);
    expectNoIndicator();
  });
});
