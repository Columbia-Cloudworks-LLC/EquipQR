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

  it('assigned shows Start work', () => {
    const onStartWork = vi.fn();
    renderNextAction({
      workOrder: { id: '1', status: 'assigned' },
      onStartWork,
    });
    expect(screen.getByRole('button', { name: /^start work$/i })).toBeInTheDocument();
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
