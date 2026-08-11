import React from 'react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@vitest-harness/utils/test-utils';
import QRWorkOrderDialog from '@/features/equipment/components/qr/QRWorkOrderDialog';
import { createQRWorkOrder } from '@/features/equipment/services/equipmentQRActionService';
import type { WorkOrder } from '@/features/work-orders/types/workOrder';

const mockListPmTemplates = vi.hoisted(() => vi.fn());
const mockGetMatchingPmTemplates = vi.hoisted(() => vi.fn());

vi.mock('@/features/pm-templates/services/pmChecklistTemplatesService', async () => {
  const actual = await vi.importActual<typeof import('@/features/pm-templates/services/pmChecklistTemplatesService')>(
    '@/features/pm-templates/services/pmChecklistTemplatesService',
  );
  return {
    ...actual,
    pmChecklistTemplatesService: {
      ...actual.pmChecklistTemplatesService,
      listTemplates: mockListPmTemplates,
    },
  };
});

vi.mock('@/features/pm-templates/services/pmTemplateCompatibilityRulesService', () => ({
  getMatchingTemplatesForEquipment: mockGetMatchingPmTemplates,
}));

vi.mock('@/features/equipment/services/equipmentQRActionService', async () => {
  const actual = await vi.importActual<typeof import('@/features/equipment/services/equipmentQRActionService')>(
    '@/features/equipment/services/equipmentQRActionService',
  );
  return {
    ...actual,
    createQRWorkOrder: vi.fn(),
  };
});

vi.mock('@/hooks/useVoiceTextAppender', () => ({
  useVoiceTextAppender: () => ({
    isSupported: true,
    isListening: false,
    error: null,
    interimTranscript: '',
    toggleListening: vi.fn(),
    canUseVoice: true,
  }),
}));

const mockCreateWorkOrder = vi.mocked(createQRWorkOrder);

const POINTER_CAPTURE_KEYS = ['hasPointerCapture', 'setPointerCapture', 'releasePointerCapture'] as const;
const originalPointerCaptureDescriptors: Partial<
  Record<(typeof POINTER_CAPTURE_KEYS)[number], PropertyDescriptor | undefined>
> = {};

const equipment = {
  id: 'equipment-1',
  name: 'Forklift 17',
  organizationId: 'org-1',
  teamId: 'team-1',
  workingHours: 120,
  defaultPmTemplateId: null as string | null,
};

const permissionContext = {
  userId: 'user-1',
  organizationId: 'org-1',
  userRole: 'member' as const,
  teamMemberships: [{ teamId: 'team-1', role: 'technician' as const }],
};

const pmTemplates = [
  {
    id: 'pm-option-1',
    organization_id: null,
    name: 'Forklift PM',
    description: null,
    is_protected: false,
    template_data: [],
    interval_value: null,
    interval_type: null,
    created_by: 'user-1',
    updated_by: null,
    created_at: '2020-01-01T00:00:00Z',
    updated_at: '2020-01-01T00:00:00Z',
  },
];

describe('QRWorkOrderDialog', () => {
  beforeAll(() => {
    for (const key of POINTER_CAPTURE_KEYS) {
      originalPointerCaptureDescriptors[key] = Object.getOwnPropertyDescriptor(Element.prototype, key);
    }
  });

  beforeEach(() => {
    Object.defineProperty(Element.prototype, 'hasPointerCapture', {
      configurable: true,
      value: vi.fn(() => false),
    });
    Object.defineProperty(Element.prototype, 'setPointerCapture', {
      configurable: true,
      value: vi.fn(),
    });
    Object.defineProperty(Element.prototype, 'releasePointerCapture', {
      configurable: true,
      value: vi.fn(),
    });

    vi.clearAllMocks();
    mockListPmTemplates.mockResolvedValue(pmTemplates);
    mockGetMatchingPmTemplates.mockResolvedValue([]);
    mockCreateWorkOrder.mockResolvedValue({
      workOrder: {
        id: 'wo-dialog-1',
        title: 'Work order - Forklift 17',
      } as WorkOrder,
      creationPhotosAttached: true,
    } as Awaited<ReturnType<typeof createQRWorkOrder>>);
  });

  afterEach(() => {
    const proto = Element.prototype as unknown as Record<string, unknown>;
    for (const key of POINTER_CAPTURE_KEYS) {
      const descriptor = originalPointerCaptureDescriptors[key];
      if (descriptor) {
        Object.defineProperty(Element.prototype, key, descriptor);
      } else {
        delete proto[key];
      }
    }
  });

  it('selects a PM template through the real Radix Select and creates the work order', async () => {
    const user = userEvent.setup({ delay: null });
    const onCreated = vi.fn();
    const onOpenChange = vi.fn();

    render(
      <QRWorkOrderDialog
        open
        onOpenChange={onOpenChange}
        equipment={equipment}
        permissionContext={permissionContext}
        onCreated={onCreated}
      />,
    );

    const combobox = await screen.findByRole('combobox', { name: /pm template/i });
    await user.click(combobox);
    await user.click(await screen.findByRole('option', { name: /forklift pm/i }));
    await user.click(screen.getByRole('button', { name: /create work order/i }));

    await waitFor(() => {
      expect(mockCreateWorkOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          attachPM: true,
          pmTemplateId: 'pm-option-1',
          equipment,
        }),
      );
    });
    expect(onCreated).toHaveBeenCalled();
  });

  it('passes photos through the real WorkOrderCreationPhotoPicker into createQRWorkOrder', async () => {
    const user = userEvent.setup({ delay: null });

    render(
      <QRWorkOrderDialog
        open
        onOpenChange={vi.fn()}
        equipment={equipment}
        permissionContext={permissionContext}
        onCreated={vi.fn()}
      />,
    );

    await screen.findByRole('combobox', { name: /pm template/i });
    const file = new File(['fake-bytes'], 'site-photo.jpg', { type: 'image/jpeg' });
    await user.upload(screen.getByLabelText(/attach photos from this request/i), file);
    await user.click(screen.getByRole('button', { name: /create work order/i }));

    await waitFor(() => {
      expect(mockCreateWorkOrder).toHaveBeenCalled();
    });

    const call = mockCreateWorkOrder.mock.calls.at(-1)?.[0] as { images?: File[] };
    expect(call?.images?.some((entry) => entry.name === 'site-photo.jpg')).toBe(true);
  });
});
