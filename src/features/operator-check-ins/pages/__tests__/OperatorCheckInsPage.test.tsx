import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@/test/utils/test-utils';
import OperatorCheckInsPage from '@/features/operator-check-ins/pages/OperatorCheckInsPage';

const mockDeleteTemplate = vi.fn();
const mockUseOperatorChecklistTemplates = vi.fn();
const mockUseCreateOperatorChecklistTemplate = vi.fn();
const mockUseOrganizationOperatorCheckinAssignments = vi.fn();
const mockUseEquipmentSummaries = vi.fn();

vi.mock('@/contexts/OrganizationContext', () => ({
  useOrganization: () => ({
    currentOrganization: { id: 'org-1', name: 'Test Org' },
  }),
}));

vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: () => ({
    hasRole: () => true,
  }),
}));

vi.mock('@/hooks/useSelectedTeam', () => ({
  useSelectedTeam: () => ({ selectedTeamId: null }),
}));

vi.mock('@/features/teams/hooks/useTeam', () => ({
  useTeam: () => ({ getUserTeamIds: () => [] }),
}));

vi.mock('@/features/equipment/hooks/useEquipment', () => ({
  useEquipmentSummaries: (...args: unknown[]) => mockUseEquipmentSummaries(...args),
}));

vi.mock('@/features/operator-check-ins/hooks/useOperatorChecklistTemplates', () => ({
  useOperatorChecklistTemplates: (...args: unknown[]) => mockUseOperatorChecklistTemplates(...args),
  useCreateOperatorChecklistTemplate: (...args: unknown[]) => mockUseCreateOperatorChecklistTemplate(...args),
  useDeleteOperatorChecklistTemplate: () => ({
    mutateAsync: mockDeleteTemplate,
    isPending: false,
  }),
  useRestoreOperatorChecklistTemplate: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));

vi.mock('@/features/operator-check-ins/hooks/useOperatorCheckinSettings', () => ({
  useOrganizationOperatorCheckinAssignments: (...args: unknown[]) =>
    mockUseOrganizationOperatorCheckinAssignments(...args),
  useCreateEquipmentOperatorCheckinAssignment: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));

vi.mock('@/features/operator-check-ins/hooks/useOperatorCheckinSubmissions', () => ({
  useOperatorCheckinTemplateIdsWithSubmissions: () => ({
    data: new Set(['template-deleted']),
  }),
}));

vi.mock('@/hooks/useAppToast', () => ({
  useAppToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
  }),
}));

vi.mock('@/features/operator-check-ins/components/OperatorChecklistTemplateDialog', () => ({
  OperatorChecklistTemplateDialog: () => null,
}));

vi.mock('@/features/operator-check-ins/components/OperatorCheckinLedgerPanel', () => ({
  OperatorCheckinLedgerPanel: () => <div>Daily Ledger Panel</div>,
}));

vi.mock('@/features/operator-check-ins/components/OperatorChecklistStarterCatalog', () => ({
  OperatorChecklistStarterCatalog: () => null,
}));

vi.mock('@/features/operator-check-ins/components/OperatorTemplateEquipmentAssignmentMenu', () => ({
  OperatorTemplateEquipmentAssignmentMenu: () => null,
}));

describe('OperatorCheckInsPage', () => {
  beforeEach(() => {
    mockDeleteTemplate.mockReset();
    mockDeleteTemplate.mockResolvedValue({ purged: false, disabledAssignmentCount: 1 });
    mockUseCreateOperatorChecklistTemplate.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });
    mockUseEquipmentSummaries.mockReturnValue({
      data: [],
      isLoading: false,
    });
    mockUseOrganizationOperatorCheckinAssignments.mockReturnValue({
      data: [],
      isLoading: false,
    });
    mockUseOperatorChecklistTemplates.mockReturnValue({
      data: [
        {
          id: 'template-1',
          name: 'Daily Safety',
          description: 'Safety checklist',
          is_active: true,
          template_data: {
            dataFields: [{ id: 'f1', label: 'Name', source: 'operator_input', inputType: 'text', required: true }],
            checklistItems: [{ id: 'i1', title: 'Brakes', required: true, section: 'Safety' }],
          },
        },
      ],
      isLoading: false,
    });
  });

  it('opens delete confirmation and archives template while preserving collected data', async () => {
    render(<OperatorCheckInsPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    expect(
      await screen.findByText(/Templates with collected check-ins are archived/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Existing QR links for this template will stop working/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Delete template' }));

    await waitFor(() => {
      expect(mockDeleteTemplate).toHaveBeenCalledWith('template-1');
    });
  });

  it('shows deleted templates only when the show-deleted toggle is enabled', () => {
    mockUseOperatorChecklistTemplates.mockReturnValue({
      data: [
        {
          id: 'template-active',
          name: 'Active Checklist',
          description: null,
          is_active: true,
          template_data: { dataFields: [], checklistItems: [] },
        },
        {
          id: 'template-deleted',
          name: 'Retired Checklist',
          description: null,
          is_active: false,
          template_data: { dataFields: [], checklistItems: [] },
        },
      ],
      isLoading: false,
    });

    render(<OperatorCheckInsPage />);

    expect(screen.getByText('Active Checklist')).toBeInTheDocument();
    expect(screen.queryByText('Retired Checklist')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('switch', { name: /Show deleted check-ins/i }));

    expect(screen.getByText('Retired Checklist')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Restore/i })).toBeInTheDocument();
  });

  it('offers delete instead of restore for archived templates without ledger submissions', () => {
    mockUseOperatorChecklistTemplates.mockReturnValue({
      data: [
        {
          id: 'template-deleted-unused',
          name: 'Unused Archived',
          description: null,
          is_active: false,
          template_data: { dataFields: [], checklistItems: [] },
        },
      ],
      isLoading: false,
    });

    render(<OperatorCheckInsPage />);

    fireEvent.click(screen.getByRole('switch', { name: /Show deleted check-ins/i }));

    expect(screen.getByText('Unused Archived')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Delete$/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Restore/i })).not.toBeInTheDocument();
  });

  it('links to the Daily Operator Check-Ins help guide', () => {
    render(<OperatorCheckInsPage />);

    const helpLink = screen.getByRole('link', { name: /learn how daily operator check-ins work/i });
    expect(helpLink).toHaveAttribute('href', expect.stringContaining('/support/administration/operator-daily-check-ins'));
    expect(helpLink).toHaveAttribute('target', '_blank');
  });
});
