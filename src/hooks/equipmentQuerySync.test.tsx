import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useEquipmentOrgBackgroundSync } from './equipmentQuerySync';

const subscribeToOrganization = vi.fn();
const unsubscribeFromOrganization = vi.fn();

vi.mock('@/hooks/useCacheInvalidation', () => ({
  useBackgroundSync: () => ({
    subscribeToOrganization,
    unsubscribeFromOrganization,
  }),
}));

vi.mock('@/utils/performanceMonitoring', () => ({
  performanceMonitor: {
    recordMetric: vi.fn(),
  },
}));

describe('useEquipmentOrgBackgroundSync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('subscribes on mount and unsubscribes on unmount', () => {
    const { unmount } = renderHook(() =>
      useEquipmentOrgBackgroundSync('org-1', true),
    );

    expect(subscribeToOrganization).toHaveBeenCalledWith('org-1');

    unmount();

    expect(unsubscribeFromOrganization).toHaveBeenCalledWith('org-1');
  });

  it('unsubscribes the previous org when the organization changes', () => {
    const { rerender } = renderHook(
      ({ organizationId, enableSync }) =>
        useEquipmentOrgBackgroundSync(organizationId, enableSync),
      {
        initialProps: { organizationId: 'org-1', enableSync: true },
      },
    );

    rerender({ organizationId: 'org-2', enableSync: true });

    expect(unsubscribeFromOrganization).toHaveBeenCalledWith('org-1');
    expect(subscribeToOrganization).toHaveBeenCalledWith('org-2');
  });

  it('does not subscribe when background sync is disabled', () => {
    renderHook(() => useEquipmentOrgBackgroundSync('org-1', false));

    expect(subscribeToOrganization).not.toHaveBeenCalled();
    expect(unsubscribeFromOrganization).not.toHaveBeenCalled();
  });
});
