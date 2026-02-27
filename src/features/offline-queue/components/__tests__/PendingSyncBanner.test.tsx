import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { PendingSyncBanner } from '../PendingSyncBanner';

// Mock the offline queue context
const mockSyncNow = vi.fn().mockResolvedValue({ succeeded: 1, failed: 0, remaining: 0 });
const mockRetryFailed = vi.fn().mockResolvedValue({ succeeded: 1, failed: 0, remaining: 0 });
const mockClearQueue = vi.fn();

let mockContextValue = {
  queuedItems: [],
  pendingCount: 0,
  failedCount: 0,
  isOnline: true,
  isSyncing: false,
  enqueue: vi.fn(),
  syncNow: mockSyncNow,
  removeItem: vi.fn(),
  clearQueue: mockClearQueue,
  retryFailed: mockRetryFailed,
};

vi.mock('@/contexts/OfflineQueueContext', () => ({
  useOfflineQueue: () => mockContextValue,
}));

describe('PendingSyncBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockContextValue = {
      queuedItems: [],
      pendingCount: 0,
      failedCount: 0,
      isOnline: true,
      isSyncing: false,
      enqueue: vi.fn(),
      syncNow: mockSyncNow,
      removeItem: vi.fn(),
      clearQueue: mockClearQueue,
      retryFailed: mockRetryFailed,
    };
  });

  it('renders nothing when online with no pending items', () => {
    const { container } = render(<PendingSyncBanner />);
    expect(container.innerHTML).toBe('');
  });

  it('shows offline indicator when offline with no items', () => {
    mockContextValue.isOnline = false;
    render(<PendingSyncBanner />);

    expect(screen.getByText(/you are currently offline/i)).toBeInTheDocument();
  });

  it('shows offline with queued items count', () => {
    mockContextValue.isOnline = false;
    mockContextValue.pendingCount = 3;
    render(<PendingSyncBanner />);

    expect(screen.getByText(/you are offline/i)).toBeInTheDocument();
    expect(screen.getByText(/3 items saved locally/i)).toBeInTheDocument();
  });

  it('shows online with pending items and Sync Now button', () => {
    mockContextValue.pendingCount = 2;
    render(<PendingSyncBanner />);

    expect(screen.getByText(/back online/i)).toBeInTheDocument();
    expect(screen.getByText(/2 items pending sync/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sync now/i })).toBeInTheDocument();
  });

  it('calls syncNow when Sync Now button is clicked', async () => {
    mockContextValue.pendingCount = 1;
    render(<PendingSyncBanner />);

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /sync now/i }));

    expect(mockSyncNow).toHaveBeenCalledOnce();
  });

  it('shows syncing state with spinner', () => {
    mockContextValue.isSyncing = true;
    mockContextValue.pendingCount = 3;
    render(<PendingSyncBanner />);

    // Title "Syncing" and description both contain the word
    const matches = screen.getAllByText(/syncing/i);
    expect(matches.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/3 offline item/i)).toBeInTheDocument();
  });

  it('shows failed items with Retry and Dismiss buttons', () => {
    mockContextValue.failedCount = 2;
    render(<PendingSyncBanner />);

    expect(screen.getByText(/sync issue/i)).toBeInTheDocument();
    expect(screen.getByText(/2 items failed to sync/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /dismiss/i })).toBeInTheDocument();
  });

  it('calls retryFailed when Retry is clicked', async () => {
    mockContextValue.failedCount = 1;
    render(<PendingSyncBanner />);

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /retry/i }));

    expect(mockRetryFailed).toHaveBeenCalledOnce();
  });

  it('calls clearQueue when Dismiss is clicked', async () => {
    mockContextValue.failedCount = 1;
    render(<PendingSyncBanner />);

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /dismiss/i }));

    expect(mockClearQueue).toHaveBeenCalledOnce();
  });

  it('shows singular text for 1 item', () => {
    mockContextValue.pendingCount = 1;
    render(<PendingSyncBanner />);

    expect(screen.getByText(/1 item pending sync/i)).toBeInTheDocument();
  });
});
