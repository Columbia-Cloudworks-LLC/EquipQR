import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MobileWorkOrderActionFooter } from '../MobileWorkOrderActionFooter';
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

  it('shows Saved when online and queue is empty', () => {
    render(
      <MobileWorkOrderActionFooter
        workOrder={{
          id: 'wo',
          status: 'in_progress',
          assignee_id: 'u1',
        }}
        organizationId="org"
        canCompletePm
        showContinueChecklist={false}
        canAddNotes
        syncState={{
          isOnline: true,
          isSyncing: false,
          pendingCount: 0,
          failedCount: 0,
        }}
        onAddNote={vi.fn()}
        onAddPhoto={vi.fn()}
        onStartWork={vi.fn()}
        onAssignedPutOnHold={vi.fn()}
        onPauseResume={vi.fn()}
        onOpenCompleteDialog={vi.fn()}
        onScrollToChecklist={vi.fn()}
        onRequestAccept={vi.fn()}
      />,
    );
    expect(screen.getByText('Saved')).toBeInTheDocument();
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
        canCompletePm
        showContinueChecklist={false}
        canAddNotes
        syncState={{
          isOnline: true,
          isSyncing: false,
          pendingCount: 0,
          failedCount: 2,
        }}
        onRetrySync={vi.fn()}
        onAddNote={vi.fn()}
        onAddPhoto={vi.fn()}
        onStartWork={vi.fn()}
        onAssignedPutOnHold={vi.fn()}
        onPauseResume={vi.fn()}
        onOpenCompleteDialog={vi.fn()}
        onScrollToChecklist={vi.fn()}
        onRequestAccept={vi.fn()}
      />,
    );
    expect(screen.getByText('Sync failed')).toBeInTheDocument();
  });

  it('calls onStartWork instead of internal status hook', async () => {
    const onStartWork = vi.fn();
    const user = (await import('@testing-library/user-event')).default;
    render(
      <MobileWorkOrderActionFooter
        workOrder={{
          id: 'wo',
          status: 'assigned',
          assignee_id: 'u1',
        }}
        organizationId="org"
        canCompletePm
        showContinueChecklist={false}
        canAddNotes
        syncState={{
          isOnline: true,
          isSyncing: false,
          pendingCount: 0,
          failedCount: 0,
        }}
        onAddNote={vi.fn()}
        onAddPhoto={vi.fn()}
        onStartWork={onStartWork}
        onAssignedPutOnHold={vi.fn()}
        onPauseResume={vi.fn()}
        onOpenCompleteDialog={vi.fn()}
        onScrollToChecklist={vi.fn()}
        onRequestAccept={vi.fn()}
      />,
    );
    await user.click(screen.getByRole('button', { name: /start work/i }));
    expect(onStartWork).toHaveBeenCalled();
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
        canCompletePm
        showContinueChecklist={false}
        canAddNotes
        syncState={{
          isOnline: true,
          isSyncing: false,
          pendingCount: 0,
          failedCount: 0,
        }}
        onAddNote={vi.fn()}
        onAddPhoto={vi.fn()}
        onStartWork={vi.fn()}
        onAssignedPutOnHold={vi.fn()}
        onPauseResume={vi.fn()}
        onOpenCompleteDialog={vi.fn()}
        onScrollToChecklist={vi.fn()}
        onRequestAccept={vi.fn()}
      />,
    );
    expect(container.firstChild).toBeNull();
  });
});
