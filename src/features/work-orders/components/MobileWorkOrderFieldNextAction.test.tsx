import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MobileWorkOrderFieldNextAction } from './MobileWorkOrderFieldNextAction';

const baseSync = {
  isOnline: true,
  isSyncing: false,
  pendingCount: 0,
  failedCount: 0,
};

const basePermissions = {
  canAddNotes: true,
  canUpload: true,
  canWork: true,
};

const noopActionHandlers = {
  onAcceptWorkOrder: vi.fn(),
  onStartWork: vi.fn(),
  onResumeWork: vi.fn(),
  onContinueChecklist: vi.fn(),
  onAddNote: vi.fn(),
  onAddPhoto: vi.fn(),
  onComplete: vi.fn(),
};

function renderNextAction(
  overrides: Partial<React.ComponentProps<typeof MobileWorkOrderFieldNextAction>> = {},
) {
  render(
    <MobileWorkOrderFieldNextAction
      workOrder={{ id: '1', status: 'submitted' }}
      pm={{ status: null, progress: 0, total: 0 }}
      permissions={basePermissions}
      sync={baseSync}
      {...noopActionHandlers}
      {...overrides}
    />,
  );
}

describe('MobileWorkOrderFieldNextAction', () => {
  it('submitted shows Accept work order', () => {
    const onAcceptWorkOrder = vi.fn();
    renderNextAction({
      workOrder: { id: '1', status: 'submitted' },
      onAcceptWorkOrder,
    });
    expect(screen.getByRole('button', { name: /accept work order/i })).toBeInTheDocument();
  });

  it('assigned shows Start work enabled when an assignee is present', () => {
    const onStartWork = vi.fn();
    renderNextAction({
      workOrder: { id: '1', status: 'assigned', assignee_id: 'user-1' },
      onStartWork,
    });
    expect(screen.getByRole('button', { name: /^start work$/i })).toBeEnabled();
  });

  it('accepted keeps Start work visible but disabled when no assignee is set', () => {
    renderNextAction({
      workOrder: { id: '1', status: 'accepted', assignee_id: null },
    });

    expect(screen.getByRole('button', { name: /^start work$/i })).toBeDisabled();
    expect(screen.getByText('Select an assignee to enable starting work')).toBeInTheDocument();
  });

  it('accepted enables Start work when an assignee is set', () => {
    renderNextAction({
      workOrder: { id: '1', status: 'accepted', assignee_id: 'user-1' },
    });

    expect(screen.getByRole('button', { name: /^start work$/i })).toBeEnabled();
    expect(screen.queryByText('Select an assignee to enable starting work')).not.toBeInTheDocument();
  });

  it('in_progress with incomplete PM shows Continue checklist', () => {
    renderNextAction({
      workOrder: { id: '1', status: 'in_progress', has_pm: true },
      pm: { status: 'in_progress', progress: 1, total: 3 },
    });
    expect(screen.getByRole('button', { name: /continue checklist/i })).toBeInTheDocument();
  });

  it('in_progress with PM complete shows Complete work order', () => {
    renderNextAction({
      workOrder: { id: '1', status: 'in_progress', has_pm: true },
      pm: { status: 'completed', progress: 3, total: 3 },
    });
    expect(screen.getByRole('button', { name: /complete work order/i })).toBeInTheDocument();
  });

  it('on_hold shows Resume work', () => {
    renderNextAction({
      workOrder: { id: '1', status: 'on_hold' },
    });
    expect(screen.getByRole('button', { name: /resume work/i })).toBeInTheDocument();
  });

  it('field mode hides capture actions and keeps the next job CTA', () => {
    renderNextAction({
      workOrder: { id: '1', status: 'accepted', assignee_id: 'user-1' },
      hideCaptureActions: true,
    });
    expect(screen.getByRole('button', { name: /^start work$/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /add note/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^photo$/i })).not.toBeInTheDocument();
  });

  it('keeps the card visible but moves workflow CTAs into Quick actions when requested', () => {
    renderNextAction({
      workOrder: { id: '1', status: 'accepted', assignee_id: 'user-1' },
      hideCaptureActions: true,
      hideWorkflowActions: true,
    });

    expect(screen.getByRole('heading', { name: /next step/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^start work$/i })).not.toBeInTheDocument();
    expect(screen.getByText('Use Quick actions for tappable work-order actions on phone layouts.')).toBeInTheDocument();
  });

  it('keeps capture actions when the FAB is hidden', () => {
    renderNextAction({
      workOrder: { id: '1', status: 'accepted', assignee_id: 'user-1' },
    });
    expect(screen.getByRole('button', { name: /add note/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^photo$/i })).toBeInTheDocument();
  });

  it('failed queue shows retry when onRetrySync provided', async () => {
    const onRetrySync = vi.fn();
    render(
      <MobileWorkOrderFieldNextAction
        workOrder={{ id: '1', status: 'in_progress' }}
        pm={{ status: 'completed', progress: 1, total: 1 }}
        permissions={basePermissions}
        sync={{ ...baseSync, failedCount: 1 }}
        onAcceptWorkOrder={vi.fn()}
        onStartWork={vi.fn()}
        onResumeWork={vi.fn()}
        onContinueChecklist={vi.fn()}
        onAddNote={vi.fn()}
        onAddPhoto={vi.fn()}
        onComplete={vi.fn()}
        onRetrySync={onRetrySync}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /retry sync/i }));
    expect(onRetrySync).toHaveBeenCalled();
  });
});
