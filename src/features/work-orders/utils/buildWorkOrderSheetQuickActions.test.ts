import { describe, it, expect, vi } from 'vitest';
import { buildWorkOrderSheetQuickActions } from './buildWorkOrderSheetQuickActions';

const noop = vi.fn();

const baseInput = {
  showMobileActionFooter: true,
  canAddNotes: true,
  canCaptureCosts: false,
  canCompletePmGate: true,
  isActionPending: false,
  onRequestAccept: noop,
  onStartMobileWorkOrder: noop,
  onPutAssignedMobileWorkOrderOnHold: noop,
  onPauseResumeMobileWorkOrder: noop,
  onOpenCompleteDialog: noop,
  onScrollToChecklist: noop,
  onOpenNotesComposer: noop,
  onScrollToCosts: noop,
  onShowWorkOrderQr: noop,
};

describe('buildWorkOrderSheetQuickActions', () => {
  it('includes accept, note, and QR for submitted work orders', () => {
    const actions = buildWorkOrderSheetQuickActions({
      ...baseInput,
      workOrderStatus: 'submitted',
    });
    expect(actions.map((a) => a.id)).toEqual(['accept', 'add-note-or-photo', 'wo-qr']);
  });

  it('includes start, hold, note, photo, and QR for assigned work orders', () => {
    const actions = buildWorkOrderSheetQuickActions({
      ...baseInput,
      workOrderStatus: 'assigned',
    });
    expect(actions.map((a) => a.id)).toEqual([
      'start',
      'hold-assigned',
      'add-note-or-photo',
      'wo-qr',
    ]);
  });

  it('shows checklist and hold when PM gate is incomplete', () => {
    const actions = buildWorkOrderSheetQuickActions({
      ...baseInput,
      workOrderStatus: 'in_progress',
      canCompletePmGate: false,
    });
    expect(actions.map((a) => a.id)).toEqual([
      'checklist',
      'hold-progress',
      'add-note-or-photo',
      'wo-qr',
    ]);
  });

  it('shows complete and hold when PM gate passes', () => {
    const actions = buildWorkOrderSheetQuickActions({
      ...baseInput,
      workOrderStatus: 'in_progress',
      canCompletePmGate: true,
    });
    expect(actions.map((a) => a.id)).toEqual([
      'complete',
      'hold-progress',
      'add-note-or-photo',
      'wo-qr',
    ]);
  });

  it('omits workflow actions when the field footer is hidden', () => {
    const actions = buildWorkOrderSheetQuickActions({
      ...baseInput,
      showMobileActionFooter: false,
      workOrderStatus: 'completed',
    });
    expect(actions.map((a) => a.id)).toEqual(['add-note-or-photo', 'wo-qr']);
  });

  it('includes parts and labor capture when cost access is granted', () => {
    const actions = buildWorkOrderSheetQuickActions({
      ...baseInput,
      workOrderStatus: 'in_progress',
      canCaptureCosts: true,
    });
    expect(actions.map((a) => a.id)).toEqual([
      'complete',
      'hold-progress',
      'add-note-or-photo',
      'add-parts-or-labor',
      'wo-qr',
    ]);
  });
});
