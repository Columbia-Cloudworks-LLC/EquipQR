import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@vitest-harness/utils/test-utils';
import { PMTemplateEquipmentAssignmentMenu } from '@/features/pm-templates/components/PMTemplateEquipmentAssignmentMenu';
import type { EquipmentSummary } from '@/features/equipment/services/EquipmentService';

const mockUseEquipmentSummaries = vi.fn();
const mockUseBulkAssignTemplate = vi.fn();
const mockUseSelectedTeam = vi.fn();

vi.mock('@/contexts/OrganizationContext', () => ({
  useOrganization: () => ({ currentOrganization: { id: 'org-1' } }),
}));

vi.mock('@/hooks/useSelectedTeam', () => ({
  useSelectedTeam: () => mockUseSelectedTeam(),
}));

vi.mock('@/features/equipment/hooks/useEquipment', () => ({
  useEquipmentSummaries: (...args: unknown[]) => mockUseEquipmentSummaries(...args),
}));

vi.mock('@/features/equipment/hooks/useEquipmentTemplateManagement', () => ({
  useBulkAssignTemplate: () => mockUseBulkAssignTemplate(),
}));

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
    default_pm_template_id: overrides.default_pm_template_id ?? null,
  };
}

describe('PMTemplateEquipmentAssignmentMenu', () => {
  beforeEach(() => {
    mockUseSelectedTeam.mockReturnValue({ selectedTeamId: null });
    mockUseBulkAssignTemplate.mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn().mockResolvedValue(undefined),
    });
  });

  it('uses outline styling and Apply to Equipment when nothing is assigned in scope', () => {
    mockUseEquipmentSummaries.mockReturnValue({
      data: [makeEquipment({ id: 'eq-1', name: 'Truck 101' })],
      isLoading: false,
    });

    render(
      <PMTemplateEquipmentAssignmentMenu templateId="template-1" templateName="Forklift PM" />,
    );

    const trigger = screen.getByRole('button', { name: /Apply to Equipment/i });
    expect(trigger).toHaveClass('border');
    expect(trigger).not.toHaveClass('bg-primary');
  });

  it('shows scoped assignment count on the trigger when equipment already uses the template', () => {
    mockUseEquipmentSummaries.mockReturnValue({
      data: [
        makeEquipment({ id: 'eq-1', name: 'Truck 101', default_pm_template_id: 'template-1' }),
        makeEquipment({ id: 'eq-2', name: 'Truck 202', default_pm_template_id: 'template-1' }),
        makeEquipment({ id: 'eq-3', name: 'Truck 303', default_pm_template_id: 'template-2' }),
      ],
      isLoading: false,
    });

    render(
      <PMTemplateEquipmentAssignmentMenu templateId="template-1" templateName="Forklift PM" />,
    );

    expect(screen.getByRole('button', { name: /Assigned Equipment \(2\)/i })).toBeInTheDocument();
  });

  it('counts only equipment in the selected team scope', () => {
    mockUseSelectedTeam.mockReturnValue({ selectedTeamId: 'team-1' });
    mockUseEquipmentSummaries.mockReturnValue({
      data: [
        makeEquipment({
          id: 'eq-1',
          team_id: 'team-1',
          default_pm_template_id: 'template-1',
        }),
        makeEquipment({
          id: 'eq-2',
          team_id: 'team-2',
          default_pm_template_id: 'template-1',
        }),
      ],
      isLoading: false,
    });

    render(
      <PMTemplateEquipmentAssignmentMenu templateId="template-1" templateName="Forklift PM" />,
    );

    expect(screen.getByRole('button', { name: /Assigned Equipment \(1\)/i })).toBeInTheDocument();
  });

  it('opens the picker with current-default markers for assigned equipment', async () => {
    mockUseEquipmentSummaries.mockReturnValue({
      data: [
        makeEquipment({
          id: 'eq-1',
          name: 'Truck 101',
          default_pm_template_id: 'template-1',
        }),
      ],
      isLoading: false,
    });

    render(
      <PMTemplateEquipmentAssignmentMenu templateId="template-1" templateName="Forklift PM" />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Assigned Equipment \(1\)/i }));

    await waitFor(() => {
      expect(screen.getByText(/Apply Forklift PM/i)).toBeInTheDocument();
    });
    expect(screen.getByText('Current default')).toBeInTheDocument();
  });
});
