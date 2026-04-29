import React from 'react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@/test/utils/test-utils';
import EquipmentQRQuickActions from '@/features/equipment/components/qr/EquipmentQRQuickActions';
import {
  createQRWorkOrder,
  updateQRWorkingHours,
  createQREquipmentNote,
} from '@/features/equipment/services/equipmentQRActionService';
import { fetchQRActionTeamMemberships } from '@/features/equipment/services/equipmentQRPermissions';

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

const mockFetchMemberships = vi.mocked(fetchQRActionTeamMemberships);
const mockCreateWorkOrder = vi.mocked(createQRWorkOrder);
const mockUpdateHours = vi.mocked(updateQRWorkingHours);
const mockCreateNote = vi.mocked(createQREquipmentNote);

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
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('denies work order and note actions when the user is only a team viewer', async () => {
    const user = userEvent.setup();
    mockFetchMemberships.mockResolvedValue([{ teamId: 'team-1', role: 'viewer' }]);
    renderQuickActions();

    await user.click(screen.getByRole('button', { name: /new pm work order/i }));
    expect(await screen.findByText(/need work order access/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /create generic work order/i }));
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

    await user.click(screen.getByRole('button', { name: /new pm work order/i }));
    expect(await screen.findByText(/need work order access/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /create generic work order/i }));
    expect(await screen.findByText(/create a work order/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /update hours/i }));
    expect(await screen.findByText(/only organization admins/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /add note \/ upload image/i }));
    expect(await screen.findByText(/need equipment note access/i)).toBeInTheDocument();

    expect(mockCreateWorkOrder).not.toHaveBeenCalled();
    expect(mockUpdateHours).not.toHaveBeenCalled();
    expect(mockCreateNote).not.toHaveBeenCalled();
  });

  it('opens and creates a PM work order for an allowed team member', async () => {
    const user = userEvent.setup();
    mockFetchMemberships.mockResolvedValue([{ teamId: 'team-1', role: 'technician' }]);
    mockCreateWorkOrder.mockResolvedValue({
      id: 'wo-1',
      title: 'Preventative maintenance - Forklift 17',
    } as Awaited<ReturnType<typeof createQRWorkOrder>>);

    renderQuickActions();

    await user.click(screen.getByRole('button', { name: /new pm work order/i }));
    expect(await screen.findByRole('dialog', undefined, { timeout: 3000 })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /create work order/i }));

    await waitFor(() => {
      expect(mockCreateWorkOrder).toHaveBeenCalledWith(
        expect.objectContaining({ attachPM: true, equipment: baseEquipment })
      );
    });
    expect(await screen.findByText(/work order "preventative maintenance - forklift 17" was created/i)).toBeInTheDocument();
  });

  it('opens and creates a generic work order for an allowed team member', async () => {
    const user = userEvent.setup();
    mockFetchMemberships.mockResolvedValue([{ teamId: 'team-1', role: 'technician' }]);
    mockCreateWorkOrder.mockResolvedValue({
      id: 'wo-2',
      title: 'Work order - Forklift 17',
    } as Awaited<ReturnType<typeof createQRWorkOrder>>);

    renderQuickActions();

    await user.click(screen.getByRole('button', { name: /create generic work order/i }));
    expect(await screen.findByText(/create new generic work order/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /create work order/i }));

    await waitFor(() => {
      expect(mockCreateWorkOrder).toHaveBeenCalledWith(
        expect.objectContaining({ attachPM: false, equipment: baseEquipment })
      );
    });
  });

  it('updates hours for an allowed team manager', async () => {
    const user = userEvent.setup();
    mockFetchMemberships.mockResolvedValue([{ teamId: 'team-1', role: 'manager' }]);
    mockUpdateHours.mockResolvedValue(undefined);

    renderQuickActions();

    await user.click(screen.getByRole('button', { name: /update hours/i }));
    const hoursInput = await screen.findByLabelText(/new total hours/i);
    await user.clear(hoursInput);
    await user.type(hoursInput, '125.5');
    await user.type(screen.getByLabelText(/reason or note/i), 'Meter reading');
    await user.click(screen.getByRole('button', { name: /^update hours$/i }));

    await waitFor(() => {
      expect(mockUpdateHours).toHaveBeenCalledWith({
        equipmentId: 'equipment-1',
        newHours: 125.5,
        notes: 'Meter reading',
      });
    });
    expect(await screen.findByText(/working hours updated to 125.5 hours/i)).toBeInTheDocument();
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

  it('shows a clear PM fallback message when no default PM template is assigned', async () => {
    const user = userEvent.setup();
    mockFetchMemberships.mockResolvedValue([{ teamId: 'team-1', role: 'technician' }]);

    renderQuickActions({
      equipment: {
        ...baseEquipment,
        defaultPmTemplateId: null,
      },
    });

    await user.click(screen.getByRole('button', { name: /new pm work order/i }));

    expect(await screen.findByText(/does not have a default pm template assigned/i)).toBeInTheDocument();
    expect(mockCreateWorkOrder).not.toHaveBeenCalled();
  });
});
