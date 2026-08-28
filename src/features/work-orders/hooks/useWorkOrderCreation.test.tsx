import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { toast } from 'sonner';
import { createRouterQueryClientWrapper } from '@vitest-harness/utils/query-client-wrapper';
import { useCreateWorkOrder, type CreateWorkOrderData } from './useWorkOrderCreation';

const {
  mockCreateWorkOrder,
  mockNavigate,
  mockRpc,
  mockSupabaseFrom,
  mockCreatePM,
  mockAttachWorkOrderCreationImages,
} = vi.hoisted(() => ({
  mockCreateWorkOrder: vi.fn(),
  mockNavigate: vi.fn(),
  mockRpc: vi.fn(),
  mockSupabaseFrom: vi.fn(),
  mockCreatePM: vi.fn(),
  mockAttachWorkOrderCreationImages: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    warning: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock('@/contexts/OrganizationContext', () => ({
  useOrganization: () => ({
    currentOrganization: {
      id: 'org-1',
      memberCount: 2,
    },
  }),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: {
      id: 'user-1',
    },
  }),
}));

vi.mock('@/contexts/OfflineQueueContext', () => ({
  useOfflineQueueOptional: () => null,
}));

vi.mock('@/services/offlineAwareService', () => ({
  OfflineAwareWorkOrderService: vi.fn(function OfflineAwareWorkOrderServiceMock() {
    return {
      createWorkOrder: (...args: unknown[]) => mockCreateWorkOrder(...args),
    };
  }),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
    from: (...args: unknown[]) => mockSupabaseFrom(...args),
  },
}));

vi.mock('@/features/pm-templates/services/preventativeMaintenanceService', () => ({
  createPM: (...args: unknown[]) => mockCreatePM(...args),
  defaultForkliftChecklist: [],
}));

vi.mock('@/features/work-orders/services/workOrderNotesService', () => ({
  attachWorkOrderCreationImages: (...args: unknown[]) => mockAttachWorkOrderCreationImages(...args),
}));

vi.mock('@/utils/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

function makeCreateData(overrides: Partial<CreateWorkOrderData> = {}): CreateWorkOrderData {
  return {
    title: 'QA 1481 Accepted assignee',
    description: 'Check accepted assignee flow',
    equipmentId: 'equipment-cat-320',
    priority: 'medium',
    assigneeId: 'user-tom',
    ...overrides,
  };
}

describe('useCreateWorkOrder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRpc.mockResolvedValue({ error: null });
    mockSupabaseFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null }),
    });
    mockCreatePM.mockResolvedValue(null);
    mockAttachWorkOrderCreationImages.mockResolvedValue({ primaryImageId: null });
  });

  it('surfaces the real PostgREST-style create error message', async () => {
    const createError = {
      message: 'new row for relation "work_orders" violates check constraint "uzvt_work_orders_team_scope"',
    };
    mockCreateWorkOrder.mockRejectedValueOnce(createError);

    const { result } = renderHook(() => useCreateWorkOrder(), {
      wrapper: createRouterQueryClientWrapper(),
    });

    await result.current.mutateAsync(makeCreateData()).catch(() => undefined);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        'Work Order Creation Failed',
        expect.objectContaining({
          description: expect.stringContaining(createError.message),
        }),
      );
    });

    expect(toast.error).not.toHaveBeenCalledWith('Failed to create work order');
  });

  it('keeps the success toast for a successful create with an empty description', async () => {
    const createdWorkOrder = {
      id: 'wo-1',
      title: 'QA 1481 Accepted assignee',
      description: '',
      status: 'assigned',
    };
    mockCreateWorkOrder.mockResolvedValueOnce({
      data: createdWorkOrder,
      queuedOffline: false,
    });

    const { result } = renderHook(() => useCreateWorkOrder(), {
      wrapper: createRouterQueryClientWrapper(),
    });

    const createData = makeCreateData({ description: '' });

    await expect(result.current.mutateAsync(createData)).resolves.toMatchObject({
      queuedOffline: false,
      workOrder: createdWorkOrder,
    });

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Work order created successfully');
    });

    expect(mockCreateWorkOrder).toHaveBeenCalledWith(createData, 'user-tom');
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard/work-orders/wo-1');
    expect(toast.error).not.toHaveBeenCalled();
  });
});
