import { render, screen, waitFor } from '@vitest-harness/utils/test-utils';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as exportUtils from '@/utils/exportUtils';
import EquipmentDownloadMenu, { type EquipmentExportRow } from './EquipmentDownloadMenu';
import EquipmentImportMenu from './EquipmentImportMenu';

vi.mock('@/utils/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

const mockOrganization = vi.hoisted(() => ({
  current: { id: 'org-1', userRole: 'owner' } as { id: string; userRole: string } | null,
}));
const mockGetUserTeamIds = vi.hoisted(() => vi.fn(() => ['team-1']));
const mockGetExportDetails = vi.hoisted(() => vi.fn());
const mockToastError = vi.hoisted(() => vi.fn());

vi.mock('@/contexts/OrganizationContext', () => ({
  useOrganization: () => ({ currentOrganization: mockOrganization.current }),
}));

vi.mock('@/features/teams/hooks/useTeamMembership', () => ({
  useTeamMembership: () => ({ getUserTeamIds: mockGetUserTeamIds }),
}));

vi.mock('@/features/equipment/services/EquipmentService', () => ({
  EquipmentService: { getExportDetails: mockGetExportDetails },
}));

vi.mock('sonner', () => ({ toast: { error: mockToastError } }));

/** A list-page summary row: no warranty/installation/timestamp columns (#1728). */
const summaryRow: EquipmentExportRow = {
  id: 'eq-1',
  name: 'Forklift A1',
  status: 'active',
  serial_number: 'SN12345',
  manufacturer: 'Toyota',
  model: 'Model X',
  location: 'Warehouse A',
  working_hours: 1500,
  last_maintenance: '2024-01-15',
  team_name: 'Fleet',
};

const exportDetails = {
  id: 'eq-1',
  warranty_expiration: '2027-06-30',
  installation_date: '2023-12-01',
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-02T00:00:00.000Z',
};

const mockEquipment: EquipmentExportRow = {
  id: 'eq-1',
  name: 'Forklift A1',
  status: 'active',
  serial_number: 'SN12345',
  manufacturer: 'Toyota',
  model: 'Model X',
  location: 'Warehouse A',
  working_hours: 1500,
  last_maintenance: '2024-01-15',
  team_name: 'Fleet',
  warranty_expiration: null,
  installation_date: '2023-12-01',
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-02T00:00:00.000Z',
};

describe('EquipmentDownloadMenu', () => {
  beforeEach(() => {
    vi.spyOn(exportUtils, 'downloadCsv').mockImplementation(() => {});
    vi.spyOn(exportUtils, 'downloadJson').mockImplementation(() => {});
    mockOrganization.current = { id: 'org-1', userRole: 'owner' };
    mockGetExportDetails.mockReset();
    mockGetExportDetails.mockResolvedValue({ success: true, data: [exportDetails] });
    mockToastError.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('exports filtered equipment as CSV from the download menu', async () => {
    const user = userEvent.setup();
    render(<EquipmentDownloadMenu equipment={[mockEquipment]} />);

    await user.click(screen.getByRole('button', { name: /download equipment/i }));
    await user.click(screen.getByText('CSV'));

    await waitFor(() => expect(exportUtils.downloadCsv).toHaveBeenCalled());
    const csvArg = vi.mocked(exportUtils.downloadCsv).mock.calls[0][0];
    expect(csvArg).toContain('Forklift A1');
    expect(csvArg).toContain('SN12345');
  });

  it('fills warranty and installation columns that summary rows omit (CSV)', async () => {
    const user = userEvent.setup();
    render(<EquipmentDownloadMenu equipment={[summaryRow]} />);

    await user.click(screen.getByRole('button', { name: /download equipment/i }));
    await user.click(screen.getByText('CSV'));

    await waitFor(() => expect(exportUtils.downloadCsv).toHaveBeenCalled());
    expect(mockGetExportDetails).toHaveBeenCalledWith('org-1', {
      isOrgAdmin: true,
      userTeamIds: undefined,
    });
    const csvArg = vi.mocked(exportUtils.downloadCsv).mock.calls[0][0];
    expect(csvArg).toContain('2027-06-30');
    expect(csvArg).toContain('2023-12-01');
  });

  it('fills all four record columns in the JSON export', async () => {
    const user = userEvent.setup();
    render(<EquipmentDownloadMenu equipment={[summaryRow]} />);

    await user.click(screen.getByRole('button', { name: /download equipment/i }));
    await user.click(screen.getByText('JSON'));

    await waitFor(() => expect(exportUtils.downloadJson).toHaveBeenCalled());
    const [jsonArg] = vi.mocked(exportUtils.downloadJson).mock.calls[0];
    expect(jsonArg).toEqual([
      expect.objectContaining({
        id: 'eq-1',
        warranty_expiration: '2027-06-30',
        installation_date: '2023-12-01',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-02T00:00:00.000Z',
      }),
    ]);
  });

  it('scopes the detail fetch to the user teams for non-admin members', async () => {
    mockOrganization.current = { id: 'org-1', userRole: 'member' };
    const user = userEvent.setup();
    render(<EquipmentDownloadMenu equipment={[summaryRow]} />);

    await user.click(screen.getByRole('button', { name: /download equipment/i }));
    await user.click(screen.getByText('CSV'));

    await waitFor(() => expect(exportUtils.downloadCsv).toHaveBeenCalled());
    expect(mockGetExportDetails).toHaveBeenCalledWith('org-1', {
      isOrgAdmin: false,
      userTeamIds: ['team-1'],
    });
  });

  it('shows an error and writes no file when details fail to load', async () => {
    mockGetExportDetails.mockResolvedValue({ success: false, error: 'boom' });
    const user = userEvent.setup();
    render(<EquipmentDownloadMenu equipment={[summaryRow]} />);

    await user.click(screen.getByRole('button', { name: /download equipment/i }));
    await user.click(screen.getByText('CSV'));

    await waitFor(() => expect(mockToastError).toHaveBeenCalled());
    expect(exportUtils.downloadCsv).not.toHaveBeenCalled();
  });
});

describe('EquipmentImportMenu', () => {
  it('calls onImportCsv when Import CSV is selected', async () => {
    const user = userEvent.setup();
    const onImportCsv = vi.fn();
    render(<EquipmentImportMenu onImportCsv={onImportCsv} />);

    await user.click(screen.getByRole('button', { name: /import equipment/i }));
    await user.click(screen.getByText('Import CSV'));

    expect(onImportCsv).toHaveBeenCalledTimes(1);
  });
});
