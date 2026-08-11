import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@vitest-harness/utils/test-utils';
import { EquipmentOperatorCheckinTemplateAssignmentMenu } from '@/features/operator-check-ins/components/EquipmentOperatorCheckinTemplateAssignmentMenu';
import type { OperatorChecklistTemplate } from '@/features/operator-check-ins/services/operatorChecklistTemplatesService';
import type { EquipmentOperatorCheckinAssignment } from '@/features/operator-check-ins/services/operatorCheckinSettingsService';

function makeTemplate(overrides: Partial<OperatorChecklistTemplate>): OperatorChecklistTemplate {
  return {
    id: overrides.id ?? 'template-1',
    organization_id: 'org-1',
    name: overrides.name ?? 'Safety Walk',
    description: overrides.description ?? null,
    template_data: overrides.template_data ?? {
      checklistItems: [{ id: 'item-1', title: 'Brakes', required: true, section: 'Walk' }],
      dataFields: [{ id: 'field-1', label: 'Operator', source: 'operator_input', required: true }],
    },
    is_active: overrides.is_active ?? true,
    created_by: 'user-1',
    updated_by: null,
    created_at: '2026-07-04T00:00:00.000Z',
    updated_at: '2026-07-04T00:00:00.000Z',
  };
}

function makeAssignment(
  overrides: Partial<EquipmentOperatorCheckinAssignment>,
): EquipmentOperatorCheckinAssignment {
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

describe('EquipmentOperatorCheckinTemplateAssignmentMenu', () => {
  const templates = [
    makeTemplate({ id: 'template-1', name: 'DVIR Starter' }),
    makeTemplate({ id: 'template-2', name: 'Yard Safety' }),
  ];

  it('shows assigned count on the trigger', () => {
    render(
      <EquipmentOperatorCheckinTemplateAssignmentMenu
        equipmentId="eq-1"
        equipmentName="Truck 101"
        templates={templates}
        assignments={[makeAssignment({ template_id: 'template-1' })]}
        assignedCount={1}
        isTemplatesLoading={false}
        isAssignmentsLoading={false}
        isAssigning={false}
        onAssignTemplateIds={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: /Assign checklists/i })).toBeInTheDocument();
    expect(screen.getByText('1 assigned')).toBeInTheDocument();
  });

  it('renders template rows with search and bulk selection controls', async () => {
    const onAssignTemplateIds = vi.fn();

    render(
      <EquipmentOperatorCheckinTemplateAssignmentMenu
        equipmentId="eq-1"
        equipmentName="Truck 101"
        templates={templates}
        assignments={[]}
        assignedCount={0}
        isTemplatesLoading={false}
        isAssignmentsLoading={false}
        isAssigning={false}
        onAssignTemplateIds={onAssignTemplateIds}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Assign checklists/i }));

    await waitFor(() => {
      expect(screen.getByText(/Assign checklists to Truck 101/i)).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /Select all/i })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /^DVIR Starter/i })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /^Yard Safety/i })).toBeInTheDocument();
  });

  it('locks already-assigned templates and assigns newly selected templates', async () => {
    const onAssignTemplateIds = vi.fn();

    render(
      <EquipmentOperatorCheckinTemplateAssignmentMenu
        equipmentId="eq-1"
        equipmentName="Truck 101"
        templates={templates}
        assignments={[makeAssignment({ template_id: 'template-1' })]}
        assignedCount={1}
        isTemplatesLoading={false}
        isAssignmentsLoading={false}
        isAssigning={false}
        onAssignTemplateIds={onAssignTemplateIds}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Assign checklists/i }));

    const assignedCheckbox = await screen.findByRole('checkbox', { name: /^DVIR Starter/i });
    expect(assignedCheckbox).toBeDisabled();
    expect(screen.getByText('Assigned')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('checkbox', { name: /^Yard Safety/i }));
    fireEvent.click(screen.getByRole('button', { name: /Assign checklist$/i }));

    await waitFor(() => {
      expect(onAssignTemplateIds).toHaveBeenCalledWith(['template-2']);
    });
  });

  it('counts only active unassigned templates when inactive templates remain assigned', async () => {
    const inactiveAssignedTemplate = makeTemplate({
      id: 'template-inactive',
      name: 'Retired Checklist',
      is_active: false,
    });

    render(
      <EquipmentOperatorCheckinTemplateAssignmentMenu
        equipmentId="eq-1"
        equipmentName="Truck 101"
        templates={[...templates, inactiveAssignedTemplate]}
        assignments={[makeAssignment({ template_id: 'template-inactive' })]}
        assignedCount={1}
        isTemplatesLoading={false}
        isAssignmentsLoading={false}
        isAssigning={false}
        onAssignTemplateIds={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Assign checklists/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/2 unassigned templates available/i),
      ).toBeInTheDocument();
    });
  });
});
