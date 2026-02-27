/**
 * useOfflineMergedNotes Hook Tests
 *
 * Tests the merge logic that combines pending offline queue
 * notes (both work order and equipment) with server-fetched notes.
 */

import React from 'react';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  useOfflineMergedNotes,
  OFFLINE_NOTE_ID_PREFIX,
} from '../useOfflineMergedNotes';
import type {
  OfflineQueueWorkOrderNoteItem,
  OfflineQueueEquipmentNoteItem,
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

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'user-1', user_metadata: { full_name: 'Jane Doe' } },
  }),
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

interface ServerNote {
  id: string;
  content: string;
  hours_worked: number;
  is_private: boolean;
  created_at: string;
  updated_at: string;
  author_id: string;
}

function makeServerNote(overrides?: Partial<ServerNote>): ServerNote {
  return {
    id: crypto.randomUUID(),
    content: 'Server note content',
    hours_worked: 1,
    is_private: false,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    author_id: 'user-1',
    ...overrides,
  };
}

function makeWONoteQueueItem(
  overrides?: Partial<OfflineQueueWorkOrderNoteItem>,
): OfflineQueueWorkOrderNoteItem {
  return {
    id: crypto.randomUUID(),
    type: 'work_order_note',
    payload: {
      workOrderId: 'wo-1',
      content: 'Offline WO note',
      hoursWorked: 2,
      isPrivate: false,
    },
    organizationId: 'org-1',
    userId: 'user-1',
    timestamp: Date.now(),
    retryCount: 0,
    maxRetries: 5,
    status: 'pending',
    payloadSizeBytes: 80,
    ...overrides,
  } as OfflineQueueWorkOrderNoteItem;
}

function makeEquipNoteQueueItem(
  overrides?: Partial<OfflineQueueEquipmentNoteItem>,
): OfflineQueueEquipmentNoteItem {
  return {
    id: crypto.randomUUID(),
    type: 'equipment_note',
    payload: {
      equipmentId: 'eq-1',
      content: 'Offline equipment note',
      hoursWorked: 0,
      isPrivate: true,
    },
    organizationId: 'org-1',
    userId: 'user-1',
    timestamp: Date.now(),
    retryCount: 0,
    maxRetries: 5,
    status: 'pending',
    payloadSizeBytes: 80,
    ...overrides,
  } as OfflineQueueEquipmentNoteItem;
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('useOfflineMergedNotes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockQueuedItems.mockReturnValue([]);
    (mockQueuedItems as unknown as { _returnNull?: boolean })._returnNull = false;
  });

  it('returns server notes unchanged when no offline context', () => {
    (mockQueuedItems as unknown as { _returnNull?: boolean })._returnNull = true;

    const serverNotes = [makeServerNote({ content: 'Note A' }), makeServerNote({ content: 'Note B' })];

    const { result } = renderHook(
      () => useOfflineMergedNotes(serverNotes, 'work_order', 'wo-1'),
      { wrapper: createWrapper() },
    );

    expect(result.current).toHaveLength(2);
    expect(result.current[0].content).toBe('Note A');
  });

  it('merges pending work_order_note items for matching workOrderId', () => {
    const queueItem = makeWONoteQueueItem();
    queueItem.payload.workOrderId = 'wo-1';
    mockQueuedItems.mockReturnValue([queueItem]);

    const serverNotes = [makeServerNote()];

    const { result } = renderHook(
      () => useOfflineMergedNotes(serverNotes, 'work_order', 'wo-1'),
      { wrapper: createWrapper() },
    );

    expect(result.current).toHaveLength(2);
    expect(result.current[0]._isPendingSync).toBe(true);
    expect(result.current[0].content).toBe('Offline WO note');
  });

  it('merges pending equipment_note items for matching equipmentId', () => {
    const queueItem = makeEquipNoteQueueItem();
    queueItem.payload.equipmentId = 'eq-1';
    mockQueuedItems.mockReturnValue([queueItem]);

    const serverNotes = [makeServerNote()];

    const { result } = renderHook(
      () => useOfflineMergedNotes(serverNotes, 'equipment', 'eq-1'),
      { wrapper: createWrapper() },
    );

    expect(result.current).toHaveLength(2);
    expect(result.current[0]._isPendingSync).toBe(true);
    expect(result.current[0].content).toBe('Offline equipment note');
  });

  it('does NOT merge notes for a different entityId', () => {
    const queueItem = makeWONoteQueueItem();
    queueItem.payload.workOrderId = 'wo-999'; // different WO
    mockQueuedItems.mockReturnValue([queueItem]);

    const serverNotes = [makeServerNote()];

    const { result } = renderHook(
      () => useOfflineMergedNotes(serverNotes, 'work_order', 'wo-1'),
      { wrapper: createWrapper() },
    );

    // Only server note, the queue item doesn't match
    expect(result.current).toHaveLength(1);
    expect(result.current[0]._isPendingSync).toBeUndefined();
  });

  it('sets _isPendingSync on offline notes', () => {
    const queueItem = makeWONoteQueueItem();
    mockQueuedItems.mockReturnValue([queueItem]);

    const { result } = renderHook(
      () => useOfflineMergedNotes([], 'work_order', 'wo-1'),
      { wrapper: createWrapper() },
    );

    expect(result.current).toHaveLength(1);
    expect(result.current[0]._isPendingSync).toBe(true);
  });

  it('generates IDs with offline-note- prefix', () => {
    const queueItem = makeWONoteQueueItem();
    mockQueuedItems.mockReturnValue([queueItem]);

    const { result } = renderHook(
      () => useOfflineMergedNotes([], 'work_order', 'wo-1'),
      { wrapper: createWrapper() },
    );

    expect(result.current[0].id).toBe(`${OFFLINE_NOTE_ID_PREFIX}${queueItem.id}`);
  });

  it('places offline notes before server notes', () => {
    const queueItem = makeWONoteQueueItem();
    mockQueuedItems.mockReturnValue([queueItem]);

    const serverNotes = [
      makeServerNote({ content: 'Server A' }),
      makeServerNote({ content: 'Server B' }),
    ];

    const { result } = renderHook(
      () => useOfflineMergedNotes(serverNotes, 'work_order', 'wo-1'),
      { wrapper: createWrapper() },
    );

    expect(result.current).toHaveLength(3);
    // Offline note is at index 0
    expect(result.current[0]._isPendingSync).toBe(true);
    expect(result.current[0].content).toBe('Offline WO note');
    // Server notes follow
    expect(result.current[1].content).toBe('Server A');
    expect(result.current[2].content).toBe('Server B');
  });
});
