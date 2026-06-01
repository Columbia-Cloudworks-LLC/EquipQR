import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { WorkOrder } from '@/features/work-orders/types/workOrder';
import type { QRActionEquipment } from '@/features/equipment/services/equipmentQRPermissions';

const mocks = vi.hoisted(() => ({
  mockCreate: vi.fn(),
  mockDelete: vi.fn(),
  mockCreatePM: vi.fn(),
  mockMaybeSingle: vi.fn(),
  mockRecordScanFollowUpEvent: vi.fn(),
}));

vi.mock('@/lib/authClaims', () => ({
  requireAuthUserIdFromClaims: vi.fn().mockResolvedValue('user-1'),
}));

vi.mock('@/features/work-orders/services/workOrderService', () => ({
  WorkOrderService: class {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    constructor(_organizationId: string) {}
    create(...args: unknown[]) {
      return mocks.mockCreate(...args);
    }
    delete(...args: unknown[]) {
      return mocks.mockDelete(...args);
    }
  },
}));

vi.mock('@/features/pm-templates/services/preventativeMaintenanceService', () => ({
  createPM: (...args: unknown[]) => mocks.mockCreatePM(...args),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          or: vi.fn(() => ({
            maybeSingle: () => mocks.mockMaybeSingle(),
          })),
        })),
      })),
    })),
  },
}));

vi.mock('@/features/work-orders/services/workOrderNotesService', () => ({
  attachWorkOrderCreationImages: vi.fn(),
}));

vi.mock('@/features/equipment/services/scanFollowUpEventService', () => ({
  recordScanFollowUpEvent: (...args: unknown[]) => mocks.mockRecordScanFollowUpEvent(...args),
}));

import { createQRWorkOrder } from '@/features/equipment/services/equipmentQRActionService';

const minimalWorkOrder = { id: 'wo-new', title: 'Test' } as WorkOrder;

function equipment(overrides: Partial<QRActionEquipment> = {}): QRActionEquipment {
  return {
    id: 'eq-1',
    name: 'Forklift',
    organizationId: 'org-1',
    teamId: 'team-1',
    workingHours: 10,
    defaultPmTemplateId: 'default-tpl',
    ...overrides,
  };
}

describe('createQRWorkOrder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mockCreate.mockResolvedValue({ success: true, data: minimalWorkOrder });
    mocks.mockDelete.mockResolvedValue({ success: true });
    mocks.mockCreatePM.mockResolvedValue({ id: 'pm-1' });
    mocks.mockMaybeSingle.mockResolvedValue({
      data: { template_data: [], description: 'notes' },
      error: null,
    });
    mocks.mockRecordScanFollowUpEvent.mockResolvedValue('event-1');
  });

  it('uses equipment default PM template when pmTemplateId is omitted', async () => {
    await createQRWorkOrder({
      equipment: equipment({ defaultPmTemplateId: 'default-tpl' }),
      title: 'PM',
      description: 'D',
      priority: 'medium',
      attachPM: true,
    });

    expect(mocks.mockCreatePM).toHaveBeenCalledWith(
      expect.objectContaining({
        workOrderId: 'wo-new',
        templateId: 'default-tpl',
      })
    );
    expect(mocks.mockDelete).not.toHaveBeenCalled();
  });

  it('uses explicit pmTemplateId when equipment has no default', async () => {
    await createQRWorkOrder({
      equipment: equipment({ defaultPmTemplateId: null }),
      title: 'PM',
      description: 'D',
      priority: 'medium',
      attachPM: true,
      pmTemplateId: 'picked-tpl',
    });

    expect(mocks.mockCreatePM).toHaveBeenCalledWith(
      expect.objectContaining({ templateId: 'picked-tpl' })
    );
  });

  it('prefers explicit pmTemplateId over default when both are set', async () => {
    await createQRWorkOrder({
      equipment: equipment({ defaultPmTemplateId: 'default-tpl' }),
      title: 'PM',
      description: 'D',
      priority: 'medium',
      attachPM: true,
      pmTemplateId: 'override-tpl',
    });

    expect(mocks.mockCreatePM).toHaveBeenCalledWith(
      expect.objectContaining({ templateId: 'override-tpl' })
    );
  });

  it('falls back to equipment default when pmTemplateId is empty string', async () => {
    await createQRWorkOrder({
      equipment: equipment({ defaultPmTemplateId: 'default-tpl' }),
      title: 'PM',
      description: 'D',
      priority: 'medium',
      attachPM: true,
      pmTemplateId: '',
    });

    expect(mocks.mockCreatePM).toHaveBeenCalledWith(
      expect.objectContaining({ templateId: 'default-tpl' })
    );
    expect(mocks.mockDelete).not.toHaveBeenCalled();
  });

  it('falls back to equipment default when pmTemplateId is whitespace-only', async () => {
    await createQRWorkOrder({
      equipment: equipment({ defaultPmTemplateId: 'default-tpl' }),
      title: 'PM',
      description: 'D',
      priority: 'medium',
      attachPM: true,
      pmTemplateId: '   ',
    });

    expect(mocks.mockCreatePM).toHaveBeenCalledWith(
      expect.objectContaining({ templateId: 'default-tpl' })
    );
    expect(mocks.mockDelete).not.toHaveBeenCalled();
  });

  it('rolls back the work order when PM cannot be initialized', async () => {
    mocks.mockCreatePM.mockResolvedValue(null);

    await expect(
      createQRWorkOrder({
        equipment: equipment(),
        title: 'PM',
        description: 'D',
        priority: 'medium',
        attachPM: true,
      })
    ).rejects.toThrow(/PM initialization failed/i);

    expect(mocks.mockDelete).toHaveBeenCalledWith('wo-new');
  });

  it('throws when attachPM is true but no template can be resolved', async () => {
    await expect(
      createQRWorkOrder({
        equipment: equipment({ defaultPmTemplateId: null }),
        title: 'PM',
        description: 'D',
        priority: 'medium',
        attachPM: true,
      })
    ).rejects.toThrow(/select a pm checklist template/i);

    expect(mocks.mockDelete).toHaveBeenCalledWith('wo-new');
  });

  it('records a pm_work_order_created follow-up event when a scanId is provided', async () => {
    await createQRWorkOrder({
      equipment: equipment({ defaultPmTemplateId: 'default-tpl' }),
      title: 'PM',
      description: 'D',
      priority: 'medium',
      attachPM: true,
      scanId: 'scan-1',
    });

    expect(mocks.mockRecordScanFollowUpEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: 'org-1',
        scanId: 'scan-1',
        equipmentId: 'eq-1',
        eventType: 'pm_work_order_created',
        entityType: 'work_order',
        entityId: 'wo-new',
      })
    );
  });

  it('records a generic_work_order_created follow-up event for a generic work order', async () => {
    await createQRWorkOrder({
      equipment: equipment(),
      title: 'WO',
      description: 'D',
      priority: 'medium',
      attachPM: false,
      scanId: 'scan-2',
    });

    expect(mocks.mockRecordScanFollowUpEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: 'org-1',
        scanId: 'scan-2',
        eventType: 'generic_work_order_created',
      })
    );
  });

  it('does not record a follow-up event when no scanId is provided', async () => {
    await createQRWorkOrder({
      equipment: equipment(),
      title: 'WO',
      description: 'D',
      priority: 'medium',
      attachPM: false,
    });

    expect(mocks.mockRecordScanFollowUpEvent).not.toHaveBeenCalled();
  });
});
