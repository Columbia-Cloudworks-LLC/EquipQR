import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useLogCompletedChecklist } from './useLogCompletedChecklist';

const templateQuery = vi.hoisted(() => ({
  current: { data: undefined as unknown, isLoading: false, isError: false },
}));

vi.mock('@/features/pm-templates/hooks/usePMTemplates', () => ({
  usePMTemplate: () => templateQuery.current,
}));

const templateItems = [
  { id: 'a', title: 'Check oil', description: '', section: 'Engine', required: true, condition: null },
  { id: 'b', title: 'Check tyres', description: '', section: 'Chassis', required: true, condition: null },
];

describe('useLogCompletedChecklist', () => {
  beforeEach(() => {
    templateQuery.current = { data: undefined, isLoading: false, isError: false };
  });

  it('is ready when Include PM is off', () => {
    const { result } = renderHook(() => useLogCompletedChecklist({ enabled: false, templateId: 'tpl-1' }));
    expect(result.current.isReady).toBe(true);
  });

  it('is not ready while the selected template is loading', () => {
    templateQuery.current = { data: undefined, isLoading: true, isError: false };
    const { result } = renderHook(() => useLogCompletedChecklist({ enabled: true, templateId: 'tpl-1' }));
    expect(result.current.isLoading).toBe(true);
    expect(result.current.isReady).toBe(false);
    expect(result.current.getItems()).toEqual([]);
  });

  it('is not ready, and reports the error, when the template fetch failed', () => {
    templateQuery.current = { data: undefined, isLoading: false, isError: true };
    const { result } = renderHook(() => useLogCompletedChecklist({ enabled: true, templateId: 'tpl-1' }));
    expect(result.current.isError).toBe(true);
    expect(result.current.isReady).toBe(false);
  });

  it('is ready with the template items, all rated OK, once the template has loaded', () => {
    templateQuery.current = { data: { template_data: templateItems }, isLoading: false, isError: false };
    const { result } = renderHook(() => useLogCompletedChecklist({ enabled: true, templateId: 'tpl-1' }));
    expect(result.current.isReady).toBe(true);
    expect(result.current.getItems().map((item) => [item.id, item.condition])).toEqual([
      ['a', 1],
      ['b', 1],
    ]);
  });
});
