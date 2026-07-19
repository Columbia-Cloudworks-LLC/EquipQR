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
    updateQRWorkingHours: vi.fn(),
    createQREquipmentNote: vi.fn(),
  };
});

vi.mock('@/features/equipment/services/equipmentQRPermissions', async () => {
  const actual = await vi.importActual<typeof import('@/features/equipment/services/equipmentQRPermissions')>(
    '@/features/equipment/services/equipmentQRPermissions',
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

const defaultPmTemplates = [
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

function renderQuickActions(overrides?: Partial<React.ComponentProps<typeof EquipmentQRQuickActions>>) {
  return render(
    <EquipmentQRQuickActions
      equipment={baseEquipment}
      userRole="member"
      userDisplayName="Tech User"
      {...overrides}
    />,
  );
}

async function openWorkOrderDialog() {
  fireEvent.click(screen.getByRole('button', { name: /^new work order$/i }));
  await waitFor(() => {
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
}

/** Radix Select needs pointer sequencing from userEvent. */
async function selectPmTemplateOption(optionName: RegExp) {
  const user = userEvent.setup();
  const combobox = await screen.findByRole('combobox', { name: /pm template/i });
  await user.click(combobox);
  await user.click(await screen.findByRole('option', { name: optionName }));
}

function mockCreatedWorkOrder(id: string) {
  mockCreateWorkOrder.mockResolvedValue({
    workOrder: {
      id,
      title: 'Work order - Forklift 17',
    } as WorkOrder,
    creationPhotosAttached: true,
  } as Awaited<ReturnType<typeof createQRWorkOrder>>);
}

describe('EquipmentQRQuickActions', () => {
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
    mockListPmTemplates.mockResolvedValue(defaultPmTemplates);
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
    mockFetchMemberships.mockResolvedValue([{ teamId: 'team-1', role: 'viewer' }]);
    renderQuickActions();

    fireEvent.click(screen.getByRole('button', { name: /^new work order$/i }));
    await waitFor(() => {
      expect(screen.getByText(/need work order access/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /add note \/ upload image/i }));
    await waitFor(() => {
      expect(screen.getByText(/need equipment note access/i)).toBeInTheDocument();
    });

    expect(mockCreateWorkOrder).not.toHaveBeenCalled();
    expect(mockCreateNote).not.toHaveBeenCalled();
  });

  it('shows inline permission denied for every action when a team-scoped user lacks team access', async () => {
    mockFetchMemberships.mockResolvedValue([]);
    renderQuickActions();

    fireEvent.click(screen.getByRole('button', { name: /^new work order$/i }));
    await waitFor(() => {
      expect(screen.getByText(/need work order access/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /update hours/i }));
    await waitFor(() => {
      expect(screen.getByText(/only organization admins/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /add note \/ upload image/i }));
    await waitFor(() => {
      expect(screen.getByText(/need equipment note access/i)).toBeInTheDocument();
    });

    expect(mockCreateWorkOrder).not.toHaveBeenCalled();
    expect(mockUpdateHours).not.toHaveBeenCalled();
    expect(mockCreateNote).not.toHaveBeenCalled();
  });

  it('opens and creates a work order with the equipment default PM template', async () => {
    mockFetchMemberships.mockResolvedValue([{ teamId: 'team-1', role: 'technician' }]);
    mockCreatedWorkOrder('wo-1');

    renderQuickActions();
    await openWorkOrderDialog();
    fireEvent.click(screen.getByRole('button', { name: /create work order/i }));

    await waitFor(() => {
      expect(mockCreateWorkOrder).toHaveBeenCalledWith(
        expect.objectContaining({ attachPM: true, equipment: baseEquipment }),
      );
    });
    await waitFor(() => {
      expect(screen.getByText(/work order "work order - forklift 17" was created/i)).toBeInTheDocument();
    });
    expect(screen.getByRole('link', { name: /open work order/i })).toHaveAttribute(
      'href',
      '/dashboard/work-orders/wo-1',
    );
  });

  it('opens and creates a work order without PM when None is selected', async () => {
    mockFetchMemberships.mockResolvedValue([{ teamId: 'team-1', role: 'technician' }]);
    mockCreatedWorkOrder('wo-2');

    renderQuickActions();
    await openWorkOrderDialog();
    await selectPmTemplateOption(/^none$/i);
    fireEvent.click(screen.getByRole('button', { name: /create work order/i }));

    await waitFor(() => {
      expect(mockCreateWorkOrder).toHaveBeenCalledWith(
        expect.objectContaining({ attachPM: false, equipment: baseEquipment }),
      );
    });
    await waitFor(() => {
      expect(screen.getByText(/work order "work order - forklift 17" was created/i)).toBeInTheDocument();
    });
    expect(screen.getByRole('link', { name: /open work order/i })).toHaveAttribute(
      'href',
      '/dashboard/work-orders/wo-2',
    );
  });

  it('updates hours for an allowed team manager', async () => {
    mockFetchMemberships.mockResolvedValue([{ teamId: 'team-1', role: 'manager' }]);
    mockUpdateHours.mockResolvedValue(undefined);

    renderQuickActions();
    fireEvent.click(screen.getByRole('button', { name: /update hours/i }));
    const hoursInput = await screen.findByLabelText(/new total hours/i);
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
        }),
      );
    });
    await waitFor(() => {
      expect(screen.getByText(/working hours updated to 125.5 hours/i)).toBeInTheDocument();
    });
  });

  it('appends voice dictation to the working-hours reason field', async () => {
    mockFetchMemberships.mockResolvedValue([{ teamId: 'team-1', role: 'manager' }]);
    mockUpdateHours.mockResolvedValue(undefined);

    renderQuickActions();
    fireEvent.click(screen.getByRole('button', { name: /update hours/i }));
    const hoursInput = await screen.findByLabelText(/new total hours/i);
    fireEvent.change(hoursInput, { target: { value: '130' } });
    fireEvent.change(screen.getByLabelText(/reason or note/i), { target: { value: 'Meter' } });
    fireEvent.click(screen.getByRole('button', { name: 'Start voice input' }));
    const form = hoursInput.closest('form');
    if (!(form instanceof HTMLFormElement)) {
      throw new Error('Expected working-hours dialog to wrap inputs in a form');
    }
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockUpdateHours).toHaveBeenCalledWith(
        expect.objectContaining({
          notes: 'Meter voice reason',
        }),
      );
    });
    expect(mockToggleListening).toHaveBeenCalled();
  });

  it('adds an equipment note for an allowed team member', async () => {
    mockFetchMemberships.mockResolvedValue([{ teamId: 'team-1', role: 'technician' }]);
    mockCreateNote.mockResolvedValue(undefined);

    renderQuickActions();
    fireEvent.click(screen.getByRole('button', { name: /add note \/ upload image/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: /submit note/i }));

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
    await waitFor(() => {
      expect(screen.getByText(/note added to equipment/i)).toBeInTheDocument();
    });
  });

  it('opens the work order dialog with None selected when equipment has no default template', async () => {
    mockFetchMemberships.mockResolvedValue([{ teamId: 'team-1', role: 'technician' }]);
    mockCreatedWorkOrder('wo-pm-pick');

    renderQuickActions({
      equipment: {
        ...baseEquipment,
        defaultPmTemplateId: null,
      },
    });

    await openWorkOrderDialog();
    const createBtn = screen.getByRole('button', { name: /create work order/i });
    expect(createBtn).not.toBeDisabled();

    await selectPmTemplateOption(/forklift pm/i);
    fireEvent.click(createBtn);

    await waitFor(() => {
      expect(mockCreateWorkOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          attachPM: true,
          pmTemplateId: 'pm-option-1',
          equipment: expect.objectContaining({
            id: 'equipment-1',
            defaultPmTemplateId: null,
          }),
        }),
      );
    });
  });

  it('shows loading state inside the PM template field while templates load', async () => {
    mockFetchMemberships.mockResolvedValue([{ teamId: 'team-1', role: 'technician' }]);
    mockListPmTemplates.mockImplementation(() => new Promise(() => {}));

    renderQuickActions({
      equipment: {
        ...baseEquipment,
        defaultPmTemplateId: null,
      },
    });

    await openWorkOrderDialog();
    expect(screen.getByText(/loading templates/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create work order/i })).not.toBeDisabled();
    expect(mockCreateWorkOrder).not.toHaveBeenCalled();
  });

  it('renders PM template control after templates load', async () => {
    const listPromise = new Promise(() => {});
    mockFetchMemberships.mockResolvedValue([{ teamId: 'team-1', role: 'technician' }]);
    mockListPmTemplates.mockImplementation(() => listPromise as Promise<unknown>);

    renderQuickActions({
      equipment: {
        ...baseEquipment,
        defaultPmTemplateId: null,
      },
    });

    await openWorkOrderDialog();
    expect(screen.getByText(/pm template/i)).toBeInTheDocument();
  });

  it('still creates a PM work order when recommendation matching fails but templates load', async () => {
    mockFetchMemberships.mockResolvedValue([{ teamId: 'team-1', role: 'technician' }]);
    mockGetMatchingPmTemplates.mockRejectedValue(new Error('Access denied'));
    mockCreatedWorkOrder('wo-pm-no-rec');

    renderQuickActions({
      equipment: {
        ...baseEquipment,
        defaultPmTemplateId: null,
      },
    });

    await openWorkOrderDialog();
    await selectPmTemplateOption(/forklift pm/i);
    fireEvent.click(screen.getByRole('button', { name: /create work order/i }));

    await waitFor(() => {
      expect(mockCreateWorkOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          attachPM: true,
          pmTemplateId: 'pm-option-1',
        }),
      );
    });
  });

  it('passes attached jpeg files through to createQRWorkOrder', async () => {
    const user = userEvent.setup();
    mockFetchMemberships.mockResolvedValue([{ teamId: 'team-1', role: 'technician' }]);
    mockCreatedWorkOrder('wo-with-photos');

    renderQuickActions();
    await openWorkOrderDialog();
    await selectPmTemplateOption(/^none$/i);

    const file = new File(['fake-bytes'], 'site-photo.jpg', { type: 'image/jpeg' });
    await user.upload(screen.getByLabelText(/attach photos from this request/i), file);
    fireEvent.click(screen.getByRole('button', { name: /create work order/i }));

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
    mockFetchMemberships.mockResolvedValue([{ teamId: 'team-1', role: 'technician' }]);
    mockCreatedWorkOrder('wo-scan');

    renderQuickActions({ scanId: 'scan-123' });
    await openWorkOrderDialog();
    fireEvent.click(screen.getByRole('button', { name: /create work order/i }));

    await waitFor(() => {
      expect(mockCreateWorkOrder).toHaveBeenCalledWith(expect.objectContaining({ scanId: 'scan-123' }));
    });
  });
});
