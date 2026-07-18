import { describe, expect, it } from 'vitest';
import {
  getWorkOrderSheetQuickActionButtonProps,
  groupWorkOrderSheetQuickActions,
} from './workOrderSheetQuickActionStyles';

describe('workOrderSheetQuickActionStyles', () => {
  it('uses primary styling for workflow advance actions', () => {
    const props = getWorkOrderSheetQuickActionButtonProps('primary');
    expect(props.variant).toBe('default');
    expect(props.className).toContain('font-semibold');
  });

  it('uses success styling for completion actions', () => {
    const props = getWorkOrderSheetQuickActionButtonProps('success');
    expect(props.className).toContain('bg-success');
  });

  it('groups actions by hierarchy bucket', () => {
    const grouped = groupWorkOrderSheetQuickActions([
      { id: 'accept', tone: 'primary' },
      { id: 'hold', tone: 'warning' },
      { id: 'note', tone: 'capture' },
      { id: 'qr', tone: 'utility' },
    ]);

    expect(grouped.workflow.map((action) => action.id)).toEqual(['accept', 'hold']);
    expect(grouped.capture.map((action) => action.id)).toEqual(['note']);
    expect(grouped.utility.map((action) => action.id)).toEqual(['qr']);
  });
});
