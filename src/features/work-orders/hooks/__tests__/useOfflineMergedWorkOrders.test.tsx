/**
 * useOfflineMergedWorkOrders Hook Tests
 *
 * Tests the merge logic that combines pending offline queue
 * work order creates with server-fetched work orders.
 */

import React from 'react';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  useOfflineMergedWorkOrders,
  OFFLINE_ID_PREFIX,
} from '../useOfflineMergedWorkOrders';
import type { WorkOrder } from '@/features/work-orders/types/workOrder';
import type { OfflineQueueCreateItem } from '@/services/offlineQueueService';

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockQueuedItems = vi.fn<() => OfflineQueueCreateItem[]>(() => []);

vi.mock('@/contexts/OfflineQueueContext', () => ({
  useOfflineQueueOptional: () => {
    const items = mockQueuedItems();
    // Return null when we want "no context" — signaled by a special sentinel
    if ((mockQueuedItems as unknown as { _returnNull?: boolean })._returnNull) return null;
    return { queuedItems: items };
  },
}));

vi.mock('@/contexts/OrganizationContext', () => ({
  useOrganization: () => ({
    currentOrganization: { id: 'org-1', name: 'Test Org' },
  }),
}));

const mockUser = {
  id: 'user-1',
  user_metadata: { full_name: 'Jane Doe' },
};

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: mockUser }),
}));

const mockEquipmentData = [
  { id: 'equip-1', name: 'Forklift #1', team: { name: 'Warehouse Team' } },
  { id: 'equip-2', name: 'Crane #3', team: null },
];

vi.mock('@/features/equipment/hooks/useEquipment', () => ({
  useEquipment: () => ({ data: mockEquipmentData }),
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), warning: vi.fn(), success: vi.fn(), info: vi.fn() },
}));

vi.mock('@/utils/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

// ── Helpers ────────────────────────────────────────────────────────────────

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });

const createWrapper = () => {
  const queryClient = createTestQueryClient();
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

function makeServerWorkOrder(overrides?: Partial<WorkOrder>): WorkOrder {
  return {
    id: crypto.randomUUID(),
    organization_id: 'org-1',
    equipment_id: 'equip-1',
    title: 'Server WO',
    description: 'From server',
    priority: 'medium',
    status: 'submitted',
    assignee_id: null,
    assignee_name: null,
    team_id: null,
    created_by: 'user-1',
    created_by_admin: false,
    created_by_name: 'Jane Doe',
    created_date: '2026-01-01T00:00:00Z',
    due_date: null,
    estimated_hours: null,
    completed_date: null,
    acceptance_date: null,
    updated_at: '2026-01-01T00:00:00Z',
    has_pm: false,
    pm_required: false,
    is_historical: false,
    historical_start_date: null,
    historical_notes: null,
    equipment_working_hours_at_creation: null,
    ...overrides,
  } as WorkOrder;
}

function makeQueueItem(overrides?: Partial<OfflineQueueCreateItem>): OfflineQueueCreateItem {
  return {
    id: crypto.randomUUID(),
    type: 'work_order_create',
    payload: {
      title: 'Offline WO',
      description: 'Created offline',
      equipmentId: 'equip-1',
      priority: 'high' as const,
    },
    organizationId: 'org-1',
    userId: 'user-1',
    timestamp: Date.now(),
    retryCount: 0,
    maxRetries: 5,
    status: 'pending',
    payloadSizeBytes: 100,
    ...overrides,
  } as OfflineQueueCreateItem;
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('useOfflineMergedWorkOrders', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockQueuedItems.mockReturnValue([]);
    (mockQueuedItems as unknown as { _returnNull?: boolean })._returnNull = false;
  });

  it('returns server data unchanged when no offline context', () => {
    (mockQueuedItems as unknown as { _returnNull?: boolean })._returnNull = true;

    const serverWOs = [makeServerWorkOrder({ title: 'WO-1' }), makeServerWorkOrder({ title: 'WO-2' })];

    const { result } = renderHook(() => useOfflineMergedWorkOrders(serverWOs), {
      wrapper: createWrapper(),
    });

    expect(result.current).toHaveLength(2);
    expect(result.current[0].title).toBe('WO-1');
    expect(result.current[1].title).toBe('WO-2');
  });

  it('returns server data unchanged when context has no pending creates', () => {
    mockQueuedItems.mockReturnValue([]);

    const serverWOs = [makeServerWorkOrder()];

    const { result } = renderHook(() => useOfflineMergedWorkOrders(serverWOs), {
      wrapper: createWrapper(),
    });

    expect(result.current).toHaveLength(1);
    expect(result.current[0]._isPendingSync).toBeUndefined();
  });

  it('merges pending creates at the beginning of the list', () => {
    const queueItem = makeQueueItem({ status: 'pending' });
    mockQueuedItems.mockReturnValue([queueItem]);

    const serverWOs = [makeServerWorkOrder({ title: 'Server-1' }), makeServerWorkOrder({ title: 'Server-2' })];

    const { result } = renderHook(() => useOfflineMergedWorkOrders(serverWOs), {
      wrapper: createWrapper(),
    });

    expect(result.current).toHaveLength(3);
    expect(result.current[0]._isPendingSync).toBe(true);
    expect(result.current[0].title).toBe('Offline WO');
    expect(result.current[1].title).toBe('Server-1');
    expect(result.current[2].title).toBe('Server-2');
  });

  it('sets _isPendingSync and _queueItemId on offline items', () => {
    const queueItem = makeQueueItem();
    mockQueuedItems.mockReturnValue([queueItem]);

    const { result } = renderHook(() => useOfflineMergedWorkOrders([]), {
      wrapper: createWrapper(),
    });

    expect(result.current).toHaveLength(1);
    expect(result.current[0]._isPendingSync).toBe(true);
    expect(result.current[0]._queueItemId).toBe(queueItem.id);
  });

  it('resolves equipment name from cache', () => {
    const queueItem = makeQueueItem();
    queueItem.payload = { ...queueItem.payload, equipmentId: 'equip-1' };
    mockQueuedItems.mockReturnValue([queueItem]);

    const { result } = renderHook(() => useOfflineMergedWorkOrders([]), {
      wrapper: createWrapper(),
    });

    expect(result.current[0].equipmentName).toBe('Forklift #1');
  });

  it('generates IDs with offline- prefix', () => {
    const queueItem = makeQueueItem();
    mockQueuedItems.mockReturnValue([queueItem]);

    const { result } = renderHook(() => useOfflineMergedWorkOrders([]), {
      wrapper: createWrapper(),
    });

    expect(result.current[0].id).toBe(`${OFFLINE_ID_PREFIX}${queueItem.id}`);
  });

  it('excludes failed items — only includes pending and processing', () => {
    const pending = makeQueueItem({ status: 'pending' });
    const processing = makeQueueItem({ status: 'processing' as 'pending' });
    const failed = makeQueueItem({ status: 'failed' as 'pending' });
    mockQueuedItems.mockReturnValue([pending, processing, failed]);

    const { result } = renderHook(() => useOfflineMergedWorkOrders([]), {
      wrapper: createWrapper(),
    });

    // Only pending + processing should be merged (not failed)
    expect(result.current).toHaveLength(2);
    expect(result.current.every(wo => wo._isPendingSync)).toBe(true);
  });
});
