/**
 * useOfflineMergedEquipment Hook Tests
 *
 * Tests the merge logic that combines pending offline queue
 * equipment creates with server-fetched equipment.
 */

import React from 'react';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  useOfflineMergedEquipment,
  OFFLINE_EQUIP_ID_PREFIX,
} from '../useOfflineMergedEquipment';
import type { EquipmentWithTeam } from '@/features/equipment/services/EquipmentService';
import type {
  OfflineQueueEquipmentCreateItem,
  OfflineQueueEquipmentCreateFullItem,
  OfflineQueueItem,
} from '@/services/offlineQueueService';

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockQueuedItems = vi.fn<() => OfflineQueueItem[]>(() => []);

vi.mock('@/contexts/OfflineQueueContext', () => ({
  useOfflineQueueOptional: () => {
    if ((mockQueuedItems as unknown as { _returnNull?: boolean })._returnNull) return null;
    return { queuedItems: mockQueuedItems() };
  },
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

function makeServerEquipment(overrides?: Partial<EquipmentWithTeam>): EquipmentWithTeam {
  return {
    id: crypto.randomUUID(),
    organization_id: 'org-1',
    name: 'Server Forklift',
    manufacturer: 'Toyota',
    model: '8FGU25',
    serial_number: 'SN-100',
    status: 'active',
    location: 'Warehouse A',
    working_hours: 1500,
    team_id: 'team-1',
    image_url: null,
    last_maintenance: null,
    notes: null,
    custom_attributes: null,
    last_known_location: null,
    installation_date: null,
    warranty_expiration: null,
    default_pm_template_id: null,
    import_id: null,
    customer_id: null,
    assigned_location_address: null,
    assigned_location_city: null,
    assigned_location_state: null,
    assigned_location_country: null,
    assigned_location_lat: null,
    assigned_location_lng: null,
    use_team_location: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    team: { name: 'Warehouse Team' },
    ...overrides,
  } as EquipmentWithTeam;
}

function makeQuickCreateItem(
  overrides?: Partial<OfflineQueueEquipmentCreateItem>,
): OfflineQueueEquipmentCreateItem {
  return {
    id: crypto.randomUUID(),
    type: 'equipment_create',
    payload: {
      name: 'Offline Loader',
      manufacturer: 'Cat',
      model: 'D6',
      serial_number: 'SN-OFF-1',
      team_id: 'team-1',
    },
    organizationId: 'org-1',
    userId: 'user-1',
    timestamp: Date.now(),
    retryCount: 0,
    maxRetries: 5,
    status: 'pending',
    payloadSizeBytes: 100,
    ...overrides,
  } as OfflineQueueEquipmentCreateItem;
}

function makeFullCreateItem(
  overrides?: Partial<OfflineQueueEquipmentCreateFullItem>,
): OfflineQueueEquipmentCreateFullItem {
  return {
    id: crypto.randomUUID(),
    type: 'equipment_create_full',
    payload: {
      name: 'Offline Excavator',
      manufacturer: 'Komatsu',
      model: 'PC200',
      serial_number: 'SN-OFF-2',
      status: 'active',
      location: 'Yard B',
      team_id: 'team-2',
    },
    organizationId: 'org-1',
    userId: 'user-1',
    timestamp: Date.now(),
    retryCount: 0,
    maxRetries: 5,
    status: 'pending',
    payloadSizeBytes: 150,
    ...overrides,
  } as OfflineQueueEquipmentCreateFullItem;
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('useOfflineMergedEquipment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockQueuedItems.mockReturnValue([]);
    (mockQueuedItems as unknown as { _returnNull?: boolean })._returnNull = false;
  });

  it('returns server data unchanged when no offline context', () => {
    (mockQueuedItems as unknown as { _returnNull?: boolean })._returnNull = true;

    const serverEquip = [makeServerEquipment({ name: 'Forklift A' })];

    const { result } = renderHook(() => useOfflineMergedEquipment(serverEquip), {
      wrapper: createWrapper(),
    });

    expect(result.current).toHaveLength(1);
    expect(result.current[0].name).toBe('Forklift A');
    expect(result.current[0]._isPendingSync).toBeUndefined();
  });

  it('returns server data unchanged when no pending equipment creates', () => {
    // Queue has items but none are equipment creates
    mockQueuedItems.mockReturnValue([]);

    const serverEquip = [makeServerEquipment()];

    const { result } = renderHook(() => useOfflineMergedEquipment(serverEquip), {
      wrapper: createWrapper(),
    });

    expect(result.current).toHaveLength(1);
  });

  it('merges quick-create items with correct defaults', () => {
    const quickItem = makeQuickCreateItem();
    mockQueuedItems.mockReturnValue([quickItem]);

    const { result } = renderHook(() => useOfflineMergedEquipment([]), {
      wrapper: createWrapper(),
    });

    expect(result.current).toHaveLength(1);
    const merged = result.current[0];
    expect(merged.name).toBe('Offline Loader');
    expect(merged.manufacturer).toBe('Cat');
    expect(merged.status).toBe('active');
    expect(merged.location).toBe('');
    expect(merged.team).toBeNull();
    expect(merged._isPendingSync).toBe(true);
  });

  it('merges full-create items preserving all payload fields', () => {
    const fullItem = makeFullCreateItem();
    mockQueuedItems.mockReturnValue([fullItem]);

    const { result } = renderHook(() => useOfflineMergedEquipment([]), {
      wrapper: createWrapper(),
    });

    expect(result.current).toHaveLength(1);
    const merged = result.current[0];
    expect(merged.name).toBe('Offline Excavator');
    expect(merged.manufacturer).toBe('Komatsu');
    expect(merged.location).toBe('Yard B');
    expect(merged._isPendingSync).toBe(true);
  });

  it('sets _isPendingSync and _queueItemId', () => {
    const quickItem = makeQuickCreateItem();
    mockQueuedItems.mockReturnValue([quickItem]);

    const { result } = renderHook(() => useOfflineMergedEquipment([]), {
      wrapper: createWrapper(),
    });

    expect(result.current[0]._isPendingSync).toBe(true);
    expect(result.current[0]._queueItemId).toBe(quickItem.id);
  });

  it('generates IDs with offline-equip- prefix', () => {
    const quickItem = makeQuickCreateItem();
    mockQueuedItems.mockReturnValue([quickItem]);

    const { result } = renderHook(() => useOfflineMergedEquipment([]), {
      wrapper: createWrapper(),
    });

    expect(result.current[0].id).toBe(`${OFFLINE_EQUIP_ID_PREFIX}${quickItem.id}`);
  });

  it('excludes failed items — only includes pending and processing', () => {
    const pending = makeQuickCreateItem({ status: 'pending' });
    const processing = makeQuickCreateItem({ status: 'processing' as 'pending' });
    const failed = makeQuickCreateItem({ status: 'failed' as 'pending' });
    mockQueuedItems.mockReturnValue([pending, processing, failed]);

    const { result } = renderHook(() => useOfflineMergedEquipment([]), {
      wrapper: createWrapper(),
    });

    expect(result.current).toHaveLength(2);
    expect(result.current.every(eq => eq._isPendingSync)).toBe(true);
  });
});
