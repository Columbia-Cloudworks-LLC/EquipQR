import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@/test/utils/test-utils';
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

async function selectReportTemplate(name: string | RegExp) {
  fireEvent.click(screen.getByRole('combobox', { name: /Report template/i }));
  fireEvent.click(await screen.findByRole('option', { name }));
}

describe('OperatorCheckinLedgerPanel table', () => {
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
          template_data: {
            checklistItems: [],
            dataFields: [{ id: 'field-odo', label: 'Odometer reading', source: 'operator_input', inputType: 'number' }],
          },
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

    await selectReportTemplate('Odometer Log');

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

    await selectReportTemplate('Odometer Log');

    const desktopTable = await screen.findByTestId('ledger-desktop-table');
    fireEvent.click(within(desktopTable).getByRole('button', { name: /Odometer reading/i }));

    expect(within(desktopTable).getByRole('columnheader', { name: /Odometer reading/i })).toHaveAttribute(
      'aria-sort',
      'ascending',
    );

    await selectReportTemplate('Daily Safety');
    await selectReportTemplate('Odometer Log');

    const resetTable = screen.getByTestId('ledger-desktop-table');
    expect(within(resetTable).getByRole('columnheader', { name: /Submitted/i })).toHaveAttribute(
      'aria-sort',
      'descending',
    );
    expect(within(resetTable).getByRole('columnheader', { name: /Odometer reading/i })).toHaveAttribute(
      'aria-sort',
      'none',
    );
  });
});
