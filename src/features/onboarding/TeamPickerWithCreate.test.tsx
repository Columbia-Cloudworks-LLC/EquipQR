import React from 'react';
import { screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { customRender } from '@vitest-harness/utils/renderUtils';
import TeamPickerWithCreate from '@/features/teams/components/TeamPickerWithCreate';

const mockTeams = vi.hoisted(() => vi.fn());
const mockOnChange = vi.hoisted(() => vi.fn());
const mockOnRequestUnassignedConfirm = vi.hoisted(() => vi.fn());

vi.mock('@/contexts/OrganizationContext', () => ({
  useOrganization: () => ({
    currentOrganization: { id: 'org-1', name: 'Test Org' },
  }),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));

vi.mock('@/features/teams/hooks/useTeams', () => ({
  useTeams: () => mockTeams(),
}));

vi.mock('@/features/teams/hooks/useTeamManagement', () => ({
  useTeamMutations: () => ({
    createTeamWithCreator: {
      mutateAsync: vi.fn(),
      isPending: false,
    },
  }),
}));

vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual<typeof import('@tanstack/react-query')>('@tanstack/react-query');
  return {
    ...actual,
    useQueryClient: () => ({ invalidateQueries: vi.fn() }),
  };
});

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

describe('TeamPickerWithCreate', () => {
  beforeEach(() => {
    mockTeams.mockReturnValue({
      teams: [{ id: 'team-1', name: 'Heavy Equipment', description: 'Shop floor' }],
      isLoading: false,
    });
    mockOnChange.mockReset();
    mockOnRequestUnassignedConfirm.mockReset();
  });

  it('renders existing teams and create new team option', async () => {
    customRender(
      <TeamPickerWithCreate value="" onChange={mockOnChange} requireTeam showBillingCallout />,
    );

    expect(screen.getByText(/Team ownership drives invoicing/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('combobox'));
    const listbox = await screen.findByRole('listbox');
    expect(within(listbox).getByRole('option', { name: /Heavy Equipment/i })).toBeInTheDocument();
    expect(within(listbox).getByRole('option', { name: /Create new team/i })).toBeInTheDocument();
  });

  it('calls confirm callback when admin selects unassigned', async () => {
    customRender(
      <TeamPickerWithCreate
        value="team-1"
        onChange={mockOnChange}
        allowUnassigned
        onRequestUnassignedConfirm={mockOnRequestUnassignedConfirm}
      />,
    );

    fireEvent.click(screen.getByRole('combobox'));
    const listbox = await screen.findByRole('listbox');
    fireEvent.click(within(listbox).getByRole('option', { name: /No team assigned/i }));

    expect(mockOnRequestUnassignedConfirm).toHaveBeenCalled();
    expect(mockOnChange).not.toHaveBeenCalled();
  });
});
