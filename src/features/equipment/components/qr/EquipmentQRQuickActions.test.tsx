import React from 'react';
import { fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@vitest-harness/utils/test-utils';
import EquipmentQRQuickActions from '@/features/equipment/components/qr/EquipmentQRQuickActions';
import {
  createQRWorkOrder,
  updateQRWorkingHours,
  createQREquipmentNote,
} from '@/features/equipment/services/equipmentQRActionService';
import { fetchQRActionTeamMemberships } from '@/features/equipment/services/equipmentQRPermissions';
import type { WorkOrder } from '@/features/work-orders/types/workOrder';

const mockListPmTemplates = vi.hoisted(() => vi.fn());
const mockGetMatchingPmTemplates = vi.hoisted(() => vi.fn());

vi.mock('@/features/pm-templates/services/pmChecklistTemplatesService', async () => {
  const actual = await vi.importActual<typeof import('@/features/pm-templates/services/pmChecklistTemplatesService')>(
    '@/features/pm-templates/services/pmChecklistTemplatesService'
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
    '@/features/equipment/services/equipmentQRActionService'
  );

  return {
    ...actual,
    createQRWorkOrder: vi.fn(),
    updateQRWorkingHours: vi.fn(),
    createQREquipmentNote: vi.fn(),
  };
});

vi.mock('@/features/equipment/services/equipmentQRPermissions', async () => {
  const actual = await vi.importActual<typeof import('@/features/equipment/services/equipmentQRPermissions')>(
    '@/features/equipment/services/equipmentQRPermissions'
  );

  return {
    ...actual,
    fetchQRActionTeamMemberships: vi.fn(),
  };
});

vi.mock('@/lib/authClaims', () => ({
  getAuthClaims: vi.fn().mockResolvedValue({ sub: 'user-1' }),
  requireAuthClaims: vi.fn().mockResolvedValue({ sub: 'user-1' }),
  requireAuthUserIdFromClaims: vi.fn().mockResolvedValue('user-1'),
}));

vi.mock('@/components/common/InlineNoteComposer', () => ({
  default: ({
    onSubmit,
    isSubmitting,
  }: {
    onSubmit: (data: { content: string; images: File[]; isPrivate?: boolean }) => void;
    isSubmitting?: boolean;
  }) => (
    <button
      type="button"
      disabled={isSubmitting}
      onClick={() => onSubmit({ content: 'Field note', images: [], isPrivate: false })}
    >
      Submit note
    </button>
  ),
}));

const mockToggleListening = vi.fn();

vi.mock('@/hooks/useVoiceTextAppender', () => ({
  useVoiceTextAppender: ({
    value,
    onChange,
    disabled,
  }: {
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
  }) => ({
    isSupported: true,
    isListening: false,
    error: null,
    interimTranscript: '',
    toggleListening: () => {
      mockToggleListening();
      if (!disabled) {
        onChange(`${value}${value.trim() ? ' ' : ''}voice reason`);
      }
    },
    canUseVoice: !disabled,
  }),
}));

const mockFetchMemberships = vi.mocked(fetchQRActionTeamMemberships);
const mockCreateWorkOrder = vi.mocked(createQRWorkOrder);
const mockUpdateHours = vi.mocked(updateQRWorkingHours);
const mockCreateNote = vi.mocked(createQREquipmentNote);

const POINTER_CAPTURE_KEYS = ['hasPointerCapture', 'setPointerCapture', 'releasePointerCapture'] as const;

/** Snapshot real jsdom/native descriptors once; restore after each test to avoid pollution. */
const originalPointerCaptureDescriptors: Partial<
  Record<(typeof POINTER_CAPTURE_KEYS)[number], PropertyDescriptor | undefined>
> = {};

const baseEquipment = {
  id: 'equipment-1',
  name: 'Forklift 17',
  organizationId: 'org-1',
  teamId: 'team-1',
  workingHours: 120,
  defaultPmTemplateId: 'pm-template-1',
};

function renderQuickActions(overrides?: Partial<React.ComponentProps<typeof EquipmentQRQuickActions>>) {
  return render(
    <EquipmentQRQuickActions
      equipment={baseEquipment}
      userRole="member"
      userDisplayName="Tech User"
      {...overrides}
    />
  );
}

describe('EquipmentQRQuickActions', () => {
  beforeAll(() => {
    for (const key of POINTER_CAPTURE_KEYS) {
      originalPointerCaptureDescriptors[key] = Object.getOwnPropertyDescriptor(Element.prototype, key);
    }
  });

  beforeEach(() => {
    // Radix Select expects Pointer Capture APIs; jsdom does not implement them.
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
    mockListPmTemplates.mockResolvedValue([
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
    ]);
    mockGetMatchingPmTemplates.mockResolvedValue([]);
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

  it('denies work order and note actions when the user is only a team viewer', async () => {
    const user = userEvent.setup();
    mockFetchMemberships.mockResolvedValue([{ teamId: 'team-1', role: 'viewer' }]);
    renderQuickActions();

    await user.click(screen.getByRole('button', { name: /^new work order$/i }));
    expect(await screen.findByText(/need work order access/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /add note \/ upload image/i }));
    expect(await screen.findByText(/need equipment note access/i)).toBeInTheDocument();

    expect(mockCreateWorkOrder).not.toHaveBeenCalled();
    expect(mockCreateNote).not.toHaveBeenCalled();
  });

  it('shows inline permission denied for every action when a team-scoped user lacks team access', async () => {
    const user = userEvent.setup();
    mockFetchMemberships.mockResolvedValue([]);
    renderQuickActions();

    await user.click(screen.getByRole('button', { name: /^new work order$/i }));
    expect(await screen.findByText(/need work order access/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /update hours/i }));
    expect(await screen.findByText(/only organization admins/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /add note \/ upload image/i }));
    expect(await screen.findByText(/need equipment note access/i)).toBeInTheDocument();

    expect(mockCreateWorkOrder).not.toHaveBeenCalled();
    expect(mockUpdateHours).not.toHaveBeenCalled();
    expect(mockCreateNote).not.toHaveBeenCalled();
  });

  it('opens and creates a work order with the equipment default PM template', async () => {
    const user = userEvent.setup();
    mockFetchMemberships.mockResolvedValue([{ teamId: 'team-1', role: 'technician' }]);
    mockCreateWorkOrder.mockResolvedValue({
      workOrder: {
        id: 'wo-1',
        title: 'Work order - Forklift 17',
      } as WorkOrder,
      creationPhotosAttached: true,
    } as Awaited<ReturnType<typeof createQRWorkOrder>>);

    renderQuickActions();

    await user.click(screen.getByRole('button', { name: /^new work order$/i }));
    expect(await screen.findByRole('dialog', undefined, { timeout: 3000 })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /create work order/i }));

    await waitFor(() => {
      expect(mockCreateWorkOrder).toHaveBeenCalledWith(
        expect.objectContaining({ attachPM: true, equipment: baseEquipment })
      );
    });
    expect(await screen.findByText(/work order "work order - forklift 17" was created/i)).toBeInTheDocument();
    const openWorkOrderLink = screen.getByRole('link', { name: /open work order/i });
    expect(openWorkOrderLink).toHaveAttribute('href', '/dashboard/work-orders/wo-1');
  });

  it('opens and creates a work order without PM when None is selected', async () => {
    const user = userEvent.setup();
    mockFetchMemberships.mockResolvedValue([{ teamId: 'team-1', role: 'technician' }]);
    mockCreateWorkOrder.mockResolvedValue({
      workOrder: {
        id: 'wo-2',
        title: 'Work order - Forklift 17',
      } as WorkOrder,
      creationPhotosAttached: true,
    } as Awaited<ReturnType<typeof createQRWorkOrder>>);

    renderQuickActions();

    await user.click(screen.getByRole('button', { name: /^new work order$/i }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    await user.click(screen.getByRole('combobox', { name: /pm template/i }));
    await user.click(await screen.findByRole('option', { name: /^none$/i }));
    await user.click(screen.getByRole('button', { name: /create work order/i }));

    await waitFor(() => {
      expect(mockCreateWorkOrder).toHaveBeenCalledWith(
        expect.objectContaining({ attachPM: false, equipment: baseEquipment })
      );
    });
    expect(await screen.findByText(/work order "work order - forklift 17" was created/i)).toBeInTheDocument();
    const openWorkOrderLink = screen.getByRole('link', { name: /open work order/i });
    expect(openWorkOrderLink).toHaveAttribute('href', '/dashboard/work-orders/wo-2');
  });

  it('updates hours for an allowed team manager', async () => {
    const user = userEvent.setup();
    mockFetchMemberships.mockResolvedValue([{ teamId: 'team-1', role: 'manager' }]);
    mockUpdateHours.mockResolvedValue(undefined);

    renderQuickActions();

    await user.click(screen.getByRole('button', { name: /update hours/i }));
    const hoursInput = await screen.findByLabelText(/new total hours/i);
    // happy-dom: prefer fireEvent for number inputs + form submit (userEvent.type/click flaky).
    fireEvent.change(hoursInput, { target: { value: '125.5' } });
    fireEvent.change(screen.getByLabelText(/reason or note/i), {
      target: { value: 'Meter reading' },
    });
    const form = hoursInput.closest('form');
    if (!(form instanceof HTMLFormElement)) {
      throw new Error('Expected working-hours dialog to wrap inputs in a form');
    }
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockUpdateHours).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: 'org-1',
          equipmentId: 'equipment-1',
          newHours: 125.5,
          notes: 'Meter reading',
          scanId: undefined,
        })
      );
    });
    expect(await screen.findByText(/working hours updated to 125.5 hours/i)).toBeInTheDocument();
  });

  it('appends voice dictation to the working-hours reason field', async () => {
    const user = userEvent.setup();
    mockFetchMemberships.mockResolvedValue([{ teamId: 'team-1', role: 'manager' }]);
    mockUpdateHours.mockResolvedValue(undefined);

    renderQuickActions();

    await user.click(screen.getByRole('button', { name: /update hours/i }));
    const hoursInput = await screen.findByLabelText(/new total hours/i);
    fireEvent.change(hoursInput, { target: { value: '130' } });
    fireEvent.change(screen.getByLabelText(/reason or note/i), { target: { value: 'Meter' } });
    await user.click(screen.getByRole('button', { name: 'Start voice input' }));
    const form = hoursInput.closest('form');
    if (!(form instanceof HTMLFormElement)) {
      throw new Error('Expected working-hours dialog to wrap inputs in a form');
    }
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockUpdateHours).toHaveBeenCalledWith(
        expect.objectContaining({
          notes: 'Meter voice reason',
        })
      );
    });
    expect(mockToggleListening).toHaveBeenCalled();
  });

  it('adds an equipment note for an allowed team member', async () => {
    const user = userEvent.setup();
    mockFetchMemberships.mockResolvedValue([{ teamId: 'team-1', role: 'technician' }]);
    mockCreateNote.mockResolvedValue(undefined);

    renderQuickActions();

    await user.click(screen.getByRole('button', { name: /add note \/ upload image/i }));
    expect(await screen.findByRole('dialog', undefined, { timeout: 3000 })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /submit note/i }));

    await waitFor(() => {
      expect(mockCreateNote).toHaveBeenCalledWith({
        equipmentId: 'equipment-1',
        organizationId: 'org-1',
        content: 'Field note',
        images: [],
        isPrivate: false,
        machineHours: undefined,
      });
    });
    expect(await screen.findByText(/note added to equipment/i)).toBeInTheDocument();
  });

  it('opens the work order dialog with None selected when equipment has no default template', async () => {
    const user = userEvent.setup();
    mockFetchMemberships.mockResolvedValue([{ teamId: 'team-1', role: 'technician' }]);
    mockCreateWorkOrder.mockResolvedValue({
      workOrder: {
        id: 'wo-pm-pick',
        title: 'Work order - Forklift 17',
      } as WorkOrder,
      creationPhotosAttached: true,
    } as Awaited<ReturnType<typeof createQRWorkOrder>>);

    renderQuickActions({
      equipment: {
        ...baseEquipment,
        defaultPmTemplateId: null,
      },
    });

    await user.click(screen.getByRole('button', { name: /^new work order$/i }));
    await screen.findByRole('dialog', undefined, { timeout: 5000 });

    const createBtn = screen.getByRole('button', { name: /create work order/i });
    expect(createBtn).not.toBeDisabled();

    await user.click(screen.getByRole('combobox', { name: /pm template/i }));
    await user.click(await screen.findByRole('option', { name: /forklift pm/i }));
    await user.click(createBtn);

    await waitFor(() => {
      expect(mockCreateWorkOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          attachPM: true,
          pmTemplateId: 'pm-option-1',
          equipment: expect.objectContaining({
            id: 'equipment-1',
            defaultPmTemplateId: null,
          }),
        })
      );
    });
  });

  it('shows loading state inside the PM template field while templates load', async () => {
    const user = userEvent.setup();
    mockFetchMemberships.mockResolvedValue([{ teamId: 'team-1', role: 'technician' }]);
    mockListPmTemplates.mockImplementation(() => new Promise(() => {}));

    renderQuickActions({
      equipment: {
        ...baseEquipment,
        defaultPmTemplateId: null,
      },
    });

    await user.click(screen.getByRole('button', { name: /^new work order$/i }));
    await screen.findByRole('dialog', undefined, { timeout: 5000 });

    expect(await screen.findByText(/loading templates/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create work order/i })).not.toBeDisabled();
    expect(mockCreateWorkOrder).not.toHaveBeenCalled();
  });

  it('renders PM template control after templates load', async () => {
    const user = userEvent.setup();
    let resolveList: (value: unknown) => void = () => {};
    const listPromise = new Promise(resolve => {
      resolveList = resolve;
    });
    mockFetchMemberships.mockResolvedValue([{ teamId: 'team-1', role: 'technician' }]);
    mockListPmTemplates.mockImplementation(() => listPromise as Promise<unknown>);

    renderQuickActions({
      equipment: {
        ...baseEquipment,
        defaultPmTemplateId: null,
      },
    });

    await user.click(screen.getByRole('button', { name: /^new work order$/i }));
    await screen.findByRole('dialog', undefined, { timeout: 5000 });

    expect(await screen.findByText(/pm template/i)).toBeInTheDocument();
  });

  it('still creates a PM work order when recommendation matching fails but templates load', async () => {
    const user = userEvent.setup();
    mockFetchMemberships.mockResolvedValue([{ teamId: 'team-1', role: 'technician' }]);
    mockGetMatchingPmTemplates.mockRejectedValue(new Error('Access denied'));
    mockCreateWorkOrder.mockResolvedValue({
      workOrder: {
        id: 'wo-pm-no-rec',
        title: 'Work order - Forklift 17',
      } as WorkOrder,
      creationPhotosAttached: true,
    } as Awaited<ReturnType<typeof createQRWorkOrder>>);

    renderQuickActions({
      equipment: {
        ...baseEquipment,
        defaultPmTemplateId: null,
      },
    });

    await user.click(screen.getByRole('button', { name: /^new work order$/i }));
    await screen.findByRole('dialog', undefined, { timeout: 5000 });

    await user.click(screen.getByRole('combobox', { name: /pm template/i }));
    await user.click(await screen.findByRole('option', { name: /forklift pm/i }));
    await user.click(screen.getByRole('button', { name: /create work order/i }));

    await waitFor(() => {
      expect(mockCreateWorkOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          attachPM: true,
          pmTemplateId: 'pm-option-1',
        })
      );
    });
  });

  it('passes attached jpeg files through to createQRWorkOrder', async () => {
    const user = userEvent.setup();
    mockFetchMemberships.mockResolvedValue([{ teamId: 'team-1', role: 'technician' }]);
    mockCreateWorkOrder.mockResolvedValue({
      workOrder: {
        id: 'wo-with-photos',
        title: 'Work order - Forklift 17',
      } as WorkOrder,
      creationPhotosAttached: true,
    } as Awaited<ReturnType<typeof createQRWorkOrder>>);

    renderQuickActions();

    await user.click(screen.getByRole('button', { name: /^new work order$/i }));
    await screen.findByRole('dialog', undefined, { timeout: 3000 });
    await user.click(screen.getByRole('combobox', { name: /pm template/i }));
    await user.click(await screen.findByRole('option', { name: /^none$/i }));

    const file = new File(['fake-bytes'], 'site-photo.jpg', { type: 'image/jpeg' });
    await user.upload(screen.getByLabelText(/attach photos from this request/i), file);

    await user.click(screen.getByRole('button', { name: /create work order/i }));

    await waitFor(() => {
      expect(mockCreateWorkOrder).toHaveBeenCalled();
    });

    const call = mockCreateWorkOrder.mock.calls.at(-1)?.[0] as {
      images?: File[];
      attachPM?: boolean;
    };
    expect(call?.attachPM).toBe(false);
    expect(call?.images?.some((f) => f.name === 'site-photo.jpg')).toBe(true);
  });

  it('forwards the scanId to createQRWorkOrder so the action is attributed to the scan', async () => {
    const user = userEvent.setup();
    mockFetchMemberships.mockResolvedValue([{ teamId: 'team-1', role: 'technician' }]);
    mockCreateWorkOrder.mockResolvedValue({
      workOrder: {
        id: 'wo-scan',
        title: 'Work order - Forklift 17',
      } as WorkOrder,
      creationPhotosAttached: true,
    } as Awaited<ReturnType<typeof createQRWorkOrder>>);

    renderQuickActions({ scanId: 'scan-123' });

    await user.click(screen.getByRole('button', { name: /^new work order$/i }));
    await screen.findByRole('dialog', undefined, { timeout: 3000 });
    await user.click(screen.getByRole('button', { name: /create work order/i }));

    await waitFor(() => {
      expect(mockCreateWorkOrder).toHaveBeenCalledWith(
        expect.objectContaining({ scanId: 'scan-123' })
      );
    });
  });
});
