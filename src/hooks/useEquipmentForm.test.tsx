
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Create stable mock objects
const mockCreateMutateAsync = vi.fn();
const mockUpdateMutateAsync = vi.fn();

vi.mock('@/hooks/useSupabaseData', () => {
  return {
    useCreateEquipment: vi.fn(() => ({ mutateAsync: mockCreateMutateAsync, isPending: false })),
    useUpdateEquipment: vi.fn(() => ({ mutateAsync: mockUpdateMutateAsync, isPending: false })),
  };
});

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: vi.fn(() => ({
    canManageEquipment: () => true,
    hasRole: () => true,
    isOrganizationAdmin: () => true,
  })),
}));

vi.mock('@/hooks/useSimpleOrganization', () => ({
  useSimpleOrganization: () => ({ currentOrganization: { id: 'org-1', name: 'Org 1' } }),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'user-1', email: 'test@example.com' }
  }),
}));

import { useEquipmentForm } from '@/hooks/useEquipmentForm';
import { EquipmentFormData, EquipmentRecord } from '@/types/equipment';

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
    mockCreateMutateAsync.mockClear();
    mockUpdateMutateAsync.mockClear();
  });

  it('creates equipment successfully', async () => {
    const client = new QueryClient();
    const onSuccess = vi.fn();
    const { result } = renderHook(() =>
      useEquipmentForm(undefined, onSuccess)
    , { wrapper: createWrapper(client) });

    await act(async () => {
      await result.current.form.handleSubmit(result.current.onSubmit)(baseValues as any);
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
});
