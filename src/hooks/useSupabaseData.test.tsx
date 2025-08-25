
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEquipmentByOrganization } from './useSupabaseData';
import { createClient } from '@supabase/supabase-js';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({
            data: [
              {
                id: 'test-id',
                name: 'Test Equipment',
                manufacturer: 'Test Manufacturer',
                model: 'Test Model',
                serial_number: 'TEST123',
                status: 'active',
                location: 'Test Location',
                installation_date: '2023-01-01',
                working_hours: 100,
                notes: 'Test notes',
                custom_attributes: {},
                warranty_expiration: null,
                last_maintenance: null,
                image_url: null,
                last_known_location: null,
                team_id: null,
                default_pm_template_id: null,
                customer_id: null, // Add customer_id as null
                organization_id: 'org-1',
                import_id: null
              }
            ],
            error: null
          }))
        }))
      }))
    }))
  }
}));

// Mock organization context
vi.mock('@/hooks/useSimpleOrganization', () => ({
  useSimpleOrganization: () => ({
    currentOrganization: { id: 'org-1', name: 'Test Org' }
  })
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('useEquipment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch equipment data successfully', async () => {
    const { result } = renderHook(() => useEquipmentByOrganization('org-1'), {
      wrapper: createWrapper()
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0]).toMatchObject({
      id: 'test-id',
      name: 'Test Equipment',
      manufacturer: 'Test Manufacturer',
      customer_id: null
    });
  });

  it('should handle loading state', () => {
    const { result } = renderHook(() => useEquipmentByOrganization('org-1'), {
      wrapper: createWrapper()
    });

    expect(result.current.isLoading).toBe(true);
  });
});
