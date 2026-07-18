import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@vitest-harness/utils/test-utils';
import { OperatorTemplateEquipmentAssignmentMenu } from '@/features/operator-check-ins/components/OperatorTemplateEquipmentAssignmentMenu';
import type { EquipmentSummary } from '@/features/equipment/services/EquipmentService';
import type { EquipmentOperatorCheckinAssignment } from '@/features/operator-check-ins/services/operatorCheckinSettingsService';

function makeEquipment(overrides: Partial<EquipmentSummary>): EquipmentSummary {
  return {
    id: overrides.id ?? 'eq-1',
    organization_id: 'org-1',
    name: overrides.name ?? 'Equipment',
    manufacturer: null,
    model: null,
    serial_number: overrides.serial_number ?? null,
    status: 'active',
    team_id: overrides.team_id ?? null,
    location: null,
    image_url: null,
    working_hours: null,
    last_maintenance: null,
    last_known_location: null,
    team: null,
    team_name: overrides.team_name,
  };
}

function makeAssignment(overrides: Partial<EquipmentOperatorCheckinAssignment>): EquipmentOperatorCheckinAssignment {
  return {
    id: overrides.id ?? 'assignment-1',
    organization_id: 'org-1',
    equipment_id: overrides.equipment_id ?? 'eq-1',
    template_id: overrides.template_id ?? 'template-1',
    enabled: true,
    public_token_hash: 'hash',
    token_rotated_at: '2026-07-04T00:00:00.000Z',
    token_rotated_by: null,
    created_at: '2026-07-04T00:00:00.000Z',
    updated_at: '2026-07-04T00:00:00.000Z',
  };
}

describe('OperatorTemplateEquipmentAssignmentMenu', () => {
  const equipment = [
    makeEquipment({ id: 'eq-1', name: 'Truck 101', serial_number: 'SN-1', team_name: 'Fleet' }),
    makeEquipment({ id: 'eq-2', name: 'Truck 202', serial_number: 'SN-2', team_name: 'Yard' }),
  ];

  it('renders assign action and equipment rows', async () => {
    render(
      <OperatorTemplateEquipmentAssignmentMenu
        templateId="template-1"
        templateName="Odometer Log"
        equipment={equipment}
        assignments={[]}
        isEquipmentLoading={false}
        isAssignmentsLoading={false}
        isAssigning={false}
        onAssignEquipmentIds={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Assign to equipment/i }));
    expect(await screen.findByText('Truck 101')).toBeInTheDocument();
    expect(screen.getByText('Truck 202')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Assign checklist' })).toBeInTheDocument();
    expect(screen.queryByText('Use template')).not.toBeInTheDocument();
  });

  it('shows empty state when no equipment is available in scope', async () => {
    render(
      <OperatorTemplateEquipmentAssignmentMenu
        templateId="template-1"
        templateName="Odometer Log"
        equipment={[]}
        assignments={[]}
        isEquipmentLoading={false}
        isAssignmentsLoading={false}
        isAssigning={false}
        onAssignEquipmentIds={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Assign to equipment/i }));
    expect(await screen.findByText('No equipment in the current team scope.')).toBeInTheDocument();
  });

  it('disables already-assigned equipment rows', async () => {
    render(
      <OperatorTemplateEquipmentAssignmentMenu
        templateId="template-1"
        templateName="Odometer Log"
        equipment={equipment}
        assignments={[makeAssignment({ equipment_id: 'eq-1', template_id: 'template-1' })]}
        isEquipmentLoading={false}
        isAssignmentsLoading={false}
        isAssigning={false}
        onAssignEquipmentIds={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Assign to equipment/i }));
    expect(await screen.findByText('Assigned')).toBeInTheDocument();
    expect(screen.getByLabelText(/Truck 101/i)).toBeDisabled();
  });

  it('calls onAssignEquipmentIds with selected equipment ids', async () => {
    const onAssignEquipmentIds = vi.fn().mockResolvedValue(undefined);
    render(
      <OperatorTemplateEquipmentAssignmentMenu
        templateId="template-1"
        templateName="Odometer Log"
        equipment={equipment}
        assignments={[]}
        isEquipmentLoading={false}
        isAssignmentsLoading={false}
        isAssigning={false}
        onAssignEquipmentIds={onAssignEquipmentIds}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Assign to equipment/i }));
    fireEvent.click(await screen.findByLabelText(/Truck 202/i));
    fireEvent.click(screen.getByRole('button', { name: 'Assign checklist' }));

    await waitFor(() => {
      expect(onAssignEquipmentIds).toHaveBeenCalledWith(['eq-2']);
    });
  });

  it('select all chooses every assignable visible equipment row', async () => {
    const onAssignEquipmentIds = vi.fn().mockResolvedValue(undefined);
    render(
      <OperatorTemplateEquipmentAssignmentMenu
        templateId="template-1"
        templateName="Odometer Log"
        equipment={equipment}
        assignments={[makeAssignment({ equipment_id: 'eq-1', template_id: 'template-1' })]}
        isEquipmentLoading={false}
        isAssignmentsLoading={false}
        isAssigning={false}
        onAssignEquipmentIds={onAssignEquipmentIds}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Assign to equipment/i }));
    fireEvent.click(await screen.findByRole('button', { name: 'Select all' }));
    fireEvent.click(screen.getByRole('button', { name: 'Assign checklist' }));

    await waitFor(() => {
      expect(onAssignEquipmentIds).toHaveBeenCalledWith(['eq-2']);
    });
  });

  it('select none clears the current selection', async () => {
    render(
      <OperatorTemplateEquipmentAssignmentMenu
        templateId="template-1"
        templateName="Odometer Log"
        equipment={equipment}
        assignments={[]}
        isEquipmentLoading={false}
        isAssignmentsLoading={false}
        isAssigning={false}
        onAssignEquipmentIds={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Assign to equipment/i }));
    fireEvent.click(await screen.findByLabelText(/Truck 101/i));
    fireEvent.click(screen.getByRole('button', { name: 'Select none' }));

    expect(screen.getByRole('button', { name: 'Assign checklist' })).toBeDisabled();
    expect(screen.getByText('0 selected')).toBeInTheDocument();
  });

  it('inverse toggles selection for visible assignable equipment', async () => {
    const onAssignEquipmentIds = vi.fn().mockResolvedValue(undefined);
    render(
      <OperatorTemplateEquipmentAssignmentMenu
        templateId="template-1"
        templateName="Odometer Log"
        equipment={equipment}
        assignments={[]}
        isEquipmentLoading={false}
        isAssignmentsLoading={false}
        isAssigning={false}
        onAssignEquipmentIds={onAssignEquipmentIds}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Assign to equipment/i }));
    fireEvent.click(await screen.findByLabelText(/Truck 101/i));
    fireEvent.click(screen.getByRole('button', { name: 'Inverse' }));
    fireEvent.click(screen.getByRole('button', { name: 'Assign checklist' }));

    await waitFor(() => {
      expect(onAssignEquipmentIds).toHaveBeenCalledWith(['eq-2']);
    });
  });
});
