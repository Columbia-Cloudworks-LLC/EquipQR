import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@vitest-harness/utils/test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Tables } from '@/integrations/supabase/types';
import EquipmentPMTemplateCard from './EquipmentPMTemplateCard';
import * as useUnifiedPermissionsModule from '@/hooks/useUnifiedPermissions';
import * as assignmentModule from '@/features/equipment/hooks/useEquipmentPMTemplateAssignment';

vi.mock('@/hooks/useUnifiedPermissions', () => ({
  useUnifiedPermissions: vi.fn(),
}));

vi.mock('@/features/equipment/hooks/useEquipmentPMTemplateAssignment', () => ({
  useEquipmentPMTemplateAssignment: vi.fn(),
}));

const mockEquipment = {
  id: 'eq-1',
  organization_id: 'org-1',
  team_id: null,
  default_pm_template_id: 'pm-forklift',
} as Tables<'equipment'>;

const mockHandleAssignment = vi.fn();

function setup({ canEdit = true } = {}) {
  vi.mocked(useUnifiedPermissionsModule.useUnifiedPermissions).mockReturnValue({
    equipment: {
      getPermissions: vi.fn(() => ({ canEdit, canDelete: canEdit })),
    },
  } as unknown as ReturnType<typeof useUnifiedPermissionsModule.useUnifiedPermissions>);

  vi.mocked(assignmentModule.useEquipmentPMTemplateAssignment).mockReturnValue({
    pmTemplateOptions: [
      { value: 'none', label: 'None' },
      { value: 'pm-forklift', label: 'Forklift PM' },
      { value: 'pm-crane', label: 'Crane PM' },
    ],
    currentPMTemplateDisplay: 'Forklift PM',
    handlePMTemplateAssignment: mockHandleAssignment,
    isSaving: false,
  });
}

describe('EquipmentPMTemplateCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHandleAssignment.mockResolvedValue(undefined);
  });

  it('renders the current PM template in a locked dropdown', () => {
    setup();
    render(<EquipmentPMTemplateCard equipment={mockEquipment} />);

    const trigger = screen.getByRole('combobox', { name: /pm template/i });
    expect(trigger).toBeDisabled();
    expect(trigger).toHaveTextContent('Forklift PM');
    expect(screen.getByRole('button', { name: 'Edit PM template' })).toBeInTheDocument();
  });

  it('unlocks the dropdown via the edit control and saves on selection', async () => {
    setup();
    render(<EquipmentPMTemplateCard equipment={mockEquipment} />);

    fireEvent.click(screen.getByRole('button', { name: 'Edit PM template' }));

    const trigger = screen.getByRole('combobox', { name: /pm template/i });
    expect(trigger).toBeEnabled();

    fireEvent.click(trigger);
    const listbox = await screen.findByRole('listbox');
    fireEvent.click(within(listbox).getByRole('option', { name: 'Crane PM' }));

    await waitFor(() => {
      expect(mockHandleAssignment).toHaveBeenCalledWith('pm-crane');
    });

    // Control re-locks after a save
    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: /pm template/i })).toBeDisabled();
    });
    expect(screen.getByRole('button', { name: 'Edit PM template' })).toBeInTheDocument();
  });

  it('cancel re-locks the dropdown without saving', () => {
    setup();
    render(<EquipmentPMTemplateCard equipment={mockEquipment} />);

    fireEvent.click(screen.getByRole('button', { name: 'Edit PM template' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel PM template edit' }));

    expect(screen.getByRole('combobox', { name: /pm template/i })).toBeDisabled();
    expect(mockHandleAssignment).not.toHaveBeenCalled();
  });

  it('hides the edit control for read-only users', () => {
    setup({ canEdit: false });
    render(<EquipmentPMTemplateCard equipment={mockEquipment} />);

    expect(screen.getByRole('combobox', { name: /pm template/i })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Edit PM template' })).not.toBeInTheDocument();
  });
});
