import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@/test/utils/test-utils';
import { OperatorCheckinLedgerPanel } from '@/features/operator-check-ins/components/OperatorCheckinLedgerPanel';

const mockUseOperatorCheckinSubmissions = vi.fn();
const mockUseOperatorChecklistTemplates = vi.fn();
const mockUseOrganizationOperatorCheckinAssignments = vi.fn();

vi.mock('@/features/operator-check-ins/hooks/useOperatorCheckinSubmissions', () => ({
  useOperatorCheckinSubmissions: (...args: unknown[]) => mockUseOperatorCheckinSubmissions(...args),
}));

vi.mock('@/features/operator-check-ins/hooks/useOperatorChecklistTemplates', () => ({
  useOperatorChecklistTemplates: (...args: unknown[]) => mockUseOperatorChecklistTemplates(...args),
}));

vi.mock('@/features/operator-check-ins/hooks/useOperatorCheckinSettings', () => ({
  useOrganizationOperatorCheckinAssignments: (...args: unknown[]) =>
    mockUseOrganizationOperatorCheckinAssignments(...args),
}));

vi.mock('@/features/operator-check-ins/components/OperatorCheckinReportExportDialog', () => ({
  OperatorCheckinReportExportDialog: () => null,
}));

describe('OperatorCheckinLedgerPanel', () => {
  beforeEach(() => {
    mockUseOperatorCheckinSubmissions.mockReturnValue({
      data: [],
      isLoading: false,
    });
    mockUseOperatorChecklistTemplates.mockReturnValue({
      data: [
        {
          id: 'template-odo',
          name: 'Odometer Log',
          is_active: true,
          template_data: { checklistItems: [], dataFields: [] },
        },
        {
          id: 'template-safety',
          name: 'Daily Safety',
          is_active: true,
          template_data: { checklistItems: [{ id: 'item-1', title: 'Brakes', required: true, section: 'Safety' }], dataFields: [] },
        },
      ],
      isLoading: false,
    });
    mockUseOrganizationOperatorCheckinAssignments.mockReturnValue({
      data: [
        {
          id: 'assignment-1',
          organization_id: 'org-1',
          equipment_id: 'eq-1',
          template_id: 'template-odo',
          enabled: true,
          equipment: { id: 'eq-1', name: 'Truck 101', serial_number: 'SN-1' },
        },
        {
          id: 'assignment-2',
          organization_id: 'org-1',
          equipment_id: 'eq-2',
          template_id: 'template-safety',
          enabled: true,
          equipment: { id: 'eq-2', name: 'Truck 202', serial_number: 'SN-2' },
        },
      ],
      isLoading: false,
    });
  });

  it('requires selecting a report template before querying submissions', async () => {
    render(<OperatorCheckinLedgerPanel organizationId="org-1" />);

    expect(screen.getByText('Report template')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start date' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'End date' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Export/i })).toBeDisabled();

    fireEvent.click(screen.getByRole('combobox', { name: /Report template/i }));
    fireEvent.click(await screen.findByRole('option', { name: 'Odometer Log' }));

    await waitFor(() => {
      expect(mockUseOperatorCheckinSubmissions).toHaveBeenCalledWith(
        'org-1',
        expect.objectContaining({
          templateId: 'template-odo',
          equipmentIds: ['eq-1'],
        }),
        true,
      );
    });
  });

  it('shows only equipment assigned to the selected report template', async () => {
    render(<OperatorCheckinLedgerPanel organizationId="org-1" />);

    fireEvent.click(screen.getByRole('combobox', { name: /Report template/i }));
    fireEvent.click(await screen.findByRole('option', { name: 'Daily Safety' }));

    fireEvent.click(screen.getByRole('button', { name: /Select equipment records/i }));

    expect(await screen.findByText('Truck 202')).toBeInTheDocument();
    expect(screen.queryByText('Truck 101')).not.toBeInTheDocument();
  });

  it('renders a template-driven ledger table for submissions', async () => {
    mockUseOperatorCheckinSubmissions.mockReturnValue({
      data: [
        {
          id: 'sub-1',
          organization_id: 'org-1',
          equipment_id: 'eq-1',
          template_id: 'template-odo',
          settings_id: 'settings-1',
          submitted_at: '2026-07-04T14:30:00.000Z',
          template_snapshot: {
            name: 'Odometer Log',
            checklistItems: [],
            dataFields: [{ id: 'field-odo', label: 'Odometer reading', source: 'operator_input', inputType: 'number' }],
          },
          operator_field_values: [
            { field_id: 'field-odo', label: 'Odometer reading', source: 'operator_input', value: 1200 },
          ],
          client_field_values: [],
          equipment_field_values: [],
          checklist_answers: [],
          is_complete: true,
          required_item_count: 0,
          answered_required_count: 0,
          equipment: { id: 'eq-1', name: 'Truck 101', serial_number: 'SN-1' },
        },
        {
          id: 'sub-2',
          organization_id: 'org-1',
          equipment_id: 'eq-1',
          template_id: 'template-odo',
          settings_id: 'settings-1',
          submitted_at: '2026-07-04T16:00:00.000Z',
          template_snapshot: {
            name: 'Odometer Log',
            checklistItems: [],
            dataFields: [{ id: 'field-odo', label: 'Odometer reading', source: 'operator_input', inputType: 'number' }],
          },
          operator_field_values: [
            { field_id: 'field-odo', label: 'Odometer reading', source: 'operator_input', value: 1300 },
          ],
          client_field_values: [],
          equipment_field_values: [],
          checklist_answers: [],
          is_complete: true,
          required_item_count: 0,
          answered_required_count: 0,
          equipment: { id: 'eq-1', name: 'Truck 101', serial_number: 'SN-1' },
        },
      ],
      isLoading: false,
    });
    mockUseOperatorChecklistTemplates.mockReturnValue({
      data: [
        {
          id: 'template-odo',
          name: 'Odometer Log',
          is_active: true,
          template_data: {
            checklistItems: [],
            dataFields: [{ id: 'field-odo', label: 'Odometer reading', source: 'operator_input', inputType: 'number' }],
          },
        },
      ],
      isLoading: false,
    });

    render(<OperatorCheckinLedgerPanel organizationId="org-1" />);

    fireEvent.click(screen.getByRole('combobox', { name: /Report template/i }));
    fireEvent.click(await screen.findByRole('option', { name: 'Odometer Log' }));

    const desktopTable = await screen.findByTestId('ledger-desktop-table');
    expect(within(desktopTable).getByRole('columnheader', { name: 'Odometer reading' })).toBeInTheDocument();
    expect(within(desktopTable).getAllByText('Truck 101')).toHaveLength(2);
    expect(within(desktopTable).getByText('1200')).toBeInTheDocument();
    expect(within(desktopTable).getByText('1300')).toBeInTheDocument();

    const submittedHeader = within(desktopTable).getByRole('columnheader', { name: /Submitted/i });
    expect(submittedHeader).toHaveAttribute('aria-sort', 'descending');

    const tableRows = within(desktopTable).getAllByRole('row').slice(1);
    expect(within(tableRows[0]).getByText('1300')).toBeInTheDocument();
    expect(within(tableRows[1]).getByText('1200')).toBeInTheDocument();

    const mobileList = screen.getByTestId('ledger-mobile-list');
    expect(within(mobileList).getAllByText('Truck 101')).toHaveLength(2);
    expect(within(mobileList).getByText('1200')).toBeInTheDocument();
    expect(within(mobileList).getByText('1300')).toBeInTheDocument();

    expect(screen.getByText('2 submissions · 2 complete · Showing 1–2')).toBeInTheDocument();
  });

  it('resets sort to submitted descending when the report template changes', async () => {
    mockUseOperatorCheckinSubmissions.mockReturnValue({
      data: [
        {
          id: 'sub-1',
          organization_id: 'org-1',
          equipment_id: 'eq-1',
          template_id: 'template-odo',
          settings_id: 'settings-1',
          submitted_at: '2026-07-04T14:30:00.000Z',
          template_snapshot: {
            name: 'Odometer Log',
            checklistItems: [],
            dataFields: [{ id: 'field-odo', label: 'Odometer reading', source: 'operator_input', inputType: 'number' }],
          },
          operator_field_values: [
            { field_id: 'field-odo', label: 'Odometer reading', source: 'operator_input', value: 1200 },
          ],
          client_field_values: [],
          equipment_field_values: [],
          checklist_answers: [],
          is_complete: true,
          required_item_count: 0,
          answered_required_count: 0,
          equipment: { id: 'eq-1', name: 'Truck 101', serial_number: 'SN-1' },
        },
      ],
      isLoading: false,
    });

    render(<OperatorCheckinLedgerPanel organizationId="org-1" />);

    fireEvent.click(screen.getByRole('combobox', { name: /Report template/i }));
    fireEvent.click(await screen.findByRole('option', { name: 'Odometer Log' }));

    const desktopTable = await screen.findByTestId('ledger-desktop-table');
    fireEvent.click(within(desktopTable).getByRole('button', { name: /Odometer reading/i }));

    expect(within(desktopTable).getByRole('columnheader', { name: /Odometer reading/i })).toHaveAttribute(
      'aria-sort',
      'ascending',
    );

    fireEvent.click(screen.getByRole('combobox', { name: /Report template/i }));
    fireEvent.click(await screen.findByRole('option', { name: 'Daily Safety' }));

    fireEvent.click(screen.getByRole('combobox', { name: /Report template/i }));
    fireEvent.click(await screen.findByRole('option', { name: 'Odometer Log' }));

    const resetTable = await screen.findByTestId('ledger-desktop-table');
    expect(within(resetTable).getByRole('columnheader', { name: /Submitted/i })).toHaveAttribute(
      'aria-sort',
      'descending',
    );
    expect(within(resetTable).getByRole('columnheader', { name: /Odometer reading/i })).toHaveAttribute(
      'aria-sort',
      'none',
    );
  });

  it('hides deleted templates by default in the ledger picker', async () => {
    mockUseOperatorChecklistTemplates.mockReturnValue({
      data: [
        {
          id: 'template-active',
          name: 'Active Checklist',
          is_active: true,
          template_data: { checklistItems: [], dataFields: [] },
        },
        {
          id: 'template-deleted',
          name: 'Retired Checklist',
          is_active: false,
          template_data: { checklistItems: [], dataFields: [] },
        },
      ],
      isLoading: false,
    });
    mockUseOrganizationOperatorCheckinAssignments.mockReturnValue({
      data: [
        {
          id: 'assignment-active',
          organization_id: 'org-1',
          equipment_id: 'eq-active',
          template_id: 'template-active',
          enabled: true,
          equipment: { id: 'eq-active', name: 'Active Truck', serial_number: 'SN-A' },
        },
        {
          id: 'assignment-retired',
          organization_id: 'org-1',
          equipment_id: 'eq-retired',
          template_id: 'template-deleted',
          enabled: false,
          equipment: { id: 'eq-retired', name: 'Retired Truck', serial_number: 'SN-R' },
        },
      ],
      isLoading: false,
    });

    render(<OperatorCheckinLedgerPanel organizationId="org-1" />);

    fireEvent.click(screen.getByRole('combobox', { name: /Report template/i }));
    expect(await screen.findByRole('option', { name: 'Active Checklist' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Retired Checklist (deleted)' })).not.toBeInTheDocument();
  });

  it('hides the show-deleted toggle for non-admin equipment ledger views', () => {
    render(
      <OperatorCheckinLedgerPanel
        organizationId="org-1"
        equipmentId="eq-1"
        equipmentName="Truck 101"
      />,
    );

    expect(screen.queryByRole('switch', { name: /Show deleted check-ins/i })).not.toBeInTheDocument();
  });

  it('shows deleted templates when the show-deleted toggle is enabled', async () => {
    mockUseOperatorChecklistTemplates.mockReturnValue({
      data: [
        {
          id: 'template-deleted',
          name: 'Retired Checklist',
          is_active: false,
          template_data: { checklistItems: [], dataFields: [] },
        },
      ],
      isLoading: false,
    });
    mockUseOrganizationOperatorCheckinAssignments.mockReturnValue({
      data: [
        {
          id: 'assignment-retired',
          organization_id: 'org-1',
          equipment_id: 'eq-retired',
          template_id: 'template-deleted',
          enabled: false,
          equipment: { id: 'eq-retired', name: 'Retired Truck', serial_number: 'SN-R' },
        },
      ],
      isLoading: false,
    });

    render(<OperatorCheckinLedgerPanel organizationId="org-1" allowDeletedVisibilityToggle />);

    fireEvent.click(screen.getByRole('switch', { name: /Show deleted check-ins/i }));
    fireEvent.click(screen.getByRole('combobox', { name: /Report template/i }));
    fireEvent.click(await screen.findByRole('option', { name: 'Retired Checklist (deleted)' }));

    await waitFor(() => {
      expect(mockUseOperatorCheckinSubmissions).toHaveBeenCalledWith(
        'org-1',
        expect.objectContaining({
          templateId: 'template-deleted',
          equipmentIds: ['eq-retired'],
        }),
        true,
      );
    });
  });

  it('scopes the ledger to one equipment record and its assigned report templates', async () => {
    render(
      <OperatorCheckinLedgerPanel
        organizationId="org-1"
        equipmentId="eq-1"
        equipmentName="Truck 101"
      />,
    );

    expect(screen.queryByRole('button', { name: /Select equipment records/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('combobox', { name: /Report template/i }));
    const options = await screen.findAllByRole('option');
    expect(options.map((option) => option.textContent)).toEqual(['Odometer Log']);
    expect(screen.queryByRole('option', { name: 'Daily Safety' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('option', { name: 'Odometer Log' }));

    await waitFor(() => {
      expect(mockUseOperatorCheckinSubmissions).toHaveBeenCalledWith(
        'org-1',
        expect.objectContaining({
          templateId: 'template-odo',
          equipmentIds: ['eq-1'],
        }),
        true,
      );
    });
  });

  it('shows an empty state when the equipment has no assigned report templates', () => {
    mockUseOrganizationOperatorCheckinAssignments.mockReturnValue({
      data: [
        {
          id: 'assignment-2',
          organization_id: 'org-1',
          equipment_id: 'eq-2',
          template_id: 'template-safety',
          enabled: true,
          equipment: { id: 'eq-2', name: 'Truck 202', serial_number: 'SN-2' },
        },
      ],
      isLoading: false,
    });

    render(
      <OperatorCheckinLedgerPanel
        organizationId="org-1"
        equipmentId="eq-1"
        equipmentName="Truck 101"
      />,
    );

    expect(
      screen.getByText('No daily check-in reports are assigned to this equipment yet.'),
    ).toBeInTheDocument();
  });
});
