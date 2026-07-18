import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MobileWorkOrderActionFooter } from './MobileWorkOrderActionFooter';
import * as useAuthModule from '@/hooks/useAuth';
import * as permModule from '@/features/work-orders/hooks/useWorkOrderPermissionLevels';

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({ user: { id: 'u1' } })),
}));

vi.mock('@/features/work-orders/hooks/useWorkOrderPermissionLevels', () => ({
  useWorkOrderPermissionLevels: vi.fn(() => ({ isManager: true, isTechnician: false })),
}));

describe('MobileWorkOrderActionFooter', () => {
  beforeEach(() => {
    vi.mocked(useAuthModule.useAuth).mockReturnValue({ user: { id: 'u1' } } as never);
    vi.mocked(permModule.useWorkOrderPermissionLevels).mockReturnValue({
      isManager: true,
      isTechnician: false,
    } as never);
  });

  it('renders nothing when online and queue is empty', () => {
    const { container } = render(
      <MobileWorkOrderActionFooter
        workOrder={{
          id: 'wo',
          status: 'in_progress',
          assignee_id: 'u1',
        }}
        organizationId="org"
        syncState={{
          isOnline: true,
          isSyncing: false,
          pendingCount: 0,
          failedCount: 0,
        }}
      />,
    );
    expect(container.firstChild).toBeNull();
    expect(screen.queryByText('Submitted')).not.toBeInTheDocument();
    expect(screen.queryByText('In Progress')).not.toBeInTheDocument();
  });

  it('shows Syncing banner while queue is processing', () => {
    render(
      <MobileWorkOrderActionFooter
        workOrder={{
          id: 'wo',
          status: 'in_progress',
          assignee_id: 'u1',
        }}
        organizationId="org"
        syncState={{
          isOnline: true,
          isSyncing: true,
          pendingCount: 0,
          failedCount: 0,
        }}
      />,
    );
    expect(screen.getByText('Syncing...')).toBeInTheDocument();
    expect(screen.queryByText('In Progress')).not.toBeInTheDocument();
  });

  it('shows Sync failed when failedCount > 0', () => {
    render(
      <MobileWorkOrderActionFooter
        workOrder={{
          id: 'wo',
          status: 'in_progress',
          assignee_id: 'u1',
        }}
        organizationId="org"
        syncState={{
          isOnline: true,
          isSyncing: false,
          pendingCount: 0,
          failedCount: 2,
        }}
        onRetrySync={vi.fn()}
      />,
    );
    expect(screen.getByText('Sync failed')).toBeInTheDocument();
  });

  it('does not render workflow action buttons', () => {
    render(
      <MobileWorkOrderActionFooter
        workOrder={{
          id: 'wo',
          status: 'submitted',
          assignee_id: null,
          created_by: 'u1',
        }}
        organizationId="org"
        syncState={{
          isOnline: false,
          isSyncing: false,
          pendingCount: 0,
          failedCount: 0,
        }}
      />,
    );
    expect(screen.queryByRole('button', { name: /^note$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /accept/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /quick actions/i })).not.toBeInTheDocument();
  });

  it('renders null when user cannot perform workflow', () => {
    vi.mocked(useAuthModule.useAuth).mockReturnValue({ user: { id: 'other' } } as never);
    vi.mocked(permModule.useWorkOrderPermissionLevels).mockReturnValue({
      isManager: false,
      isTechnician: true,
    } as never);
    const { container } = render(
      <MobileWorkOrderActionFooter
        workOrder={{
          id: 'wo',
          status: 'in_progress',
          assignee_id: 'u1',
        }}
        organizationId="org"
        syncState={{
          isOnline: true,
          isSyncing: false,
          pendingCount: 0,
          failedCount: 0,
        }}
      />,
    );
    expect(container.firstChild).toBeNull();
  });
});
