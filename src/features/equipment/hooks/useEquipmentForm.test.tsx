
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Vitest 3 requires a real `function` (constructable) mock implementation for
// classes instantiated with `new` (#1148).
vi.mock('@/services/offlineAwareService', () => ({
  OfflineAwareWorkOrderService: vi.fn(function OfflineAwareWorkOrderServiceMock() {
    return {
      createEquipmentFull: vi.fn().mockResolvedValue({ data: { id: 'eq-new' }, queuedOffline: false }),
      updateEquipment: vi.fn().mockResolvedValue({ data: { id: 'eq-1' }, queuedOffline: false }),
    };
  }),
}));

vi.mock('@/features/equipment/services/equipmentLocationHistoryService', () => ({
  logEquipmentLocationChange: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}));

vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: vi.fn(() => ({
    canManageEquipment: () => true,
    hasRole: () => true,
    isOrganizationAdmin: () => true,
  })),
}));

vi.mock('@/contexts/OrganizationContext', () => ({
  useOrganization: () => ({
    currentOrganization: { id: 'org-1', name: 'Org 1', userRole: 'owner' },
  }),
}));

vi.mock('@/hooks/useSession', () => ({
  useSession: () => ({
    sessionData: {
      teamMemberships: [
        { teamId: 'team-1', teamName: 'Team 1', role: 'manager', joinedDate: '2025-01-01' },
      ],
    },
  }),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'user-1', email: 'test@example.com' }
  }),
}));

import { useEquipmentForm } from '@/features/equipment/hooks/useEquipmentForm';
import { EquipmentFormData, EquipmentRecord } from '@/features/equipment/types/equipment';
import { toast } from 'sonner';
import { createEquipmentNoteWithImages } from '@/features/equipment/services/equipmentNotesService';

vi.mock('@/features/equipment/services/equipmentNotesService', () => ({
  createEquipmentNoteWithImages: vi.fn(),
  updateEquipmentDisplayImage: vi.fn(),
}));

const createWrapper = (client: QueryClient) =>
  ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );

// Helper to create mock equipment
const createMockEquipment = (overrides: Partial<EquipmentRecord> = {}): EquipmentRecord => ({
  id: 'eq-1',
  name: 'Test Equipment',
  manufacturer: 'Test Manufacturer',
  model: 'Test Model',
  serial_number: 'TEST123',
  status: 'active',
  location: 'Test Location',
  installation_date: '2025-01-01',
  warranty_expiration: null,
  last_maintenance: null,
  notes: null,
  custom_attributes: {},
  image_url: null,
  last_known_location: null,
  team_id: null,
  organization_id: 'org-1',
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
  working_hours: 0,
  
  default_pm_template_id: null,
  
  ...overrides,
});

const baseValues: EquipmentFormData = {
  name: 'Eq Name',
  manufacturer: 'Acme',
  model: 'X1',
  serial_number: 'SN',
  status: 'active',
  location: 'NY',
  installation_date: '2025-01-01',
  warranty_expiration: '',
  last_maintenance: '',
  notes: '',
  custom_attributes: {},
  image_url: '',
  last_known_location: null,
  team_id: 'team-1',
  default_pm_template_id: ''
};

describe('useEquipmentForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates equipment successfully', async () => {
    const client = new QueryClient();
    const onSuccess = vi.fn();
    const { result } = renderHook(() =>
      useEquipmentForm(undefined, onSuccess)
    , { wrapper: createWrapper(client) });

      await act(async () => {
        await result.current.onSubmit(baseValues);
      });

    expect(result.current.isEdit).toBe(false);
  });

  it('updates equipment successfully', async () => {
    const client = new QueryClient();
    const onSuccess = vi.fn();
    const mockEquipment = createMockEquipment({ id: 'eq-1' });

    const { result } = renderHook(() =>
      useEquipmentForm(mockEquipment, onSuccess)
    , { wrapper: createWrapper(client) });

    expect(result.current.isEdit).toBe(true);
  });

  it('succeeds when post-create media upload fails', async () => {
    vi.mocked(createEquipmentNoteWithImages).mockRejectedValueOnce(new Error('upload failed'));

    const client = new QueryClient();
    const onSuccess = vi.fn();
    const pendingMediaRef = { current: { files: [new File(['x'], 'a.jpg', { type: 'image/jpeg' })], displayIndex: 0 } };
    const { result } = renderHook(() =>
      useEquipmentForm(undefined, onSuccess, pendingMediaRef)
    , { wrapper: createWrapper(client) });

    await act(async () => {
      await result.current.onSubmit(baseValues);
    });

    expect(onSuccess).toHaveBeenCalled();
    expect(toast.warning).toHaveBeenCalledWith(
      'Equipment created, but media upload failed. Add photos from the equipment details page.',
    );
    expect(toast.error).not.toHaveBeenCalled();
  });
});
