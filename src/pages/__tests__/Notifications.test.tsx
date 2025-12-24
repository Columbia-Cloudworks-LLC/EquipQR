import React from 'react';
import { render, screen, fireEvent } from '@/test/utils/test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Notifications from '../Notifications';

// Mock hooks
vi.mock('@/contexts/OrganizationContext', () => ({
  useOrganization: vi.fn(() => ({
    organizationId: 'org-1',
    currentOrganization: { id: 'org-1', name: 'Test Org' }
  }))
}));

vi.mock('@/hooks/useNotificationSettings', () => ({
  useRealTimeNotifications: vi.fn(() => ({
    data: [],
    isLoading: false
  })),
  useNotificationSubscription: vi.fn(),
  useMarkAllNotificationsAsRead: vi.fn(() => ({
    mutateAsync: vi.fn()
  }))
}));

vi.mock('@/features/work-orders/hooks/useWorkOrderData', () => ({
  useMarkNotificationAsRead: vi.fn(() => ({
    mutateAsync: vi.fn()
  }))
}));

vi.mock('@/utils/logger', () => ({
  logger: {
    error: vi.fn()
  }
}));

describe('Notifications Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Core Rendering', () => {
    it('renders notifications heading', () => {
      render(<Notifications />);

      expect(screen.getByText('Notifications')).toBeInTheDocument();
    });

    it('renders search input', () => {
      render(<Notifications />);

      expect(screen.getByPlaceholderText(/search notifications/i)).toBeInTheDocument();
    });

    it('renders filter select elements', () => {
      render(<Notifications />);

      // Type filter and read status filter should be present
      expect(screen.getAllByRole('combobox').length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Empty State', () => {
    it('shows no notifications message when list is empty', () => {
      render(<Notifications />);

      expect(screen.getByText(/no notifications/i)).toBeInTheDocument();
    });
  });

  describe('Search and Filter', () => {
    it('allows entering search text', () => {
      render(<Notifications />);

      const searchInput = screen.getByPlaceholderText(/search notifications/i);
      fireEvent.change(searchInput, { target: { value: 'test search' } });

      expect(searchInput).toHaveValue('test search');
    });
  });

  describe('With Notifications', () => {
    beforeEach(async () => {
      const { useRealTimeNotifications } = await import('@/hooks/useNotificationSettings');
      vi.mocked(useRealTimeNotifications).mockReturnValue({
        data: [
          {
            id: 'notif-1',
            title: 'Work Order Created',
            message: 'A new work order has been created',
            type: 'work_order',
            read: false,
            created_at: new Date().toISOString(),
            user_id: 'user-1'
          },
          {
            id: 'notif-2',
            title: 'Equipment Updated',
            message: 'Equipment details have been updated',
            type: 'equipment',
            read: true,
            created_at: new Date().toISOString(),
            user_id: 'user-1'
          }
        ],
        isLoading: false,
        error: null,
        refetch: vi.fn()
      } as never);
    });

    it('renders notification items', () => {
      render(<Notifications />);

      expect(screen.getByText('Work Order Created')).toBeInTheDocument();
      expect(screen.getByText('Equipment Updated')).toBeInTheDocument();
    });

    it('shows unread badge for unread notifications', () => {
      render(<Notifications />);

      // The badge showing unread count
      expect(screen.getByText('1 unread')).toBeInTheDocument();
    });

    it('renders mark all read button', () => {
      render(<Notifications />);

      expect(screen.getByRole('button', { name: /mark all read/i })).toBeInTheDocument();
    });
  });
});

