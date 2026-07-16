import { render, screen } from '@/test/utils/test-utils';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as exportUtils from '@/utils/exportUtils';
import type { EquipmentRecord } from '@/features/equipment/types/equipment';
import EquipmentDownloadMenu from '../EquipmentDownloadMenu';
import EquipmentImportMenu from '../EquipmentImportMenu';

vi.mock('@/utils/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

const mockEquipment: EquipmentRecord = {
  id: 'eq-1',
  organization_id: 'org-1',
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
  installation_date: null,
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-02T00:00:00.000Z',
};

describe('EquipmentDownloadMenu', () => {
  beforeEach(() => {
    vi.spyOn(exportUtils, 'downloadCsv').mockImplementation(() => {});
    vi.spyOn(exportUtils, 'downloadJson').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('exports filtered equipment as CSV from the download menu', async () => {
    const user = userEvent.setup();
    render(<EquipmentDownloadMenu equipment={[mockEquipment]} />);

    await user.click(screen.getByRole('button', { name: /download equipment/i }));
    await user.click(screen.getByText('CSV'));

    expect(exportUtils.downloadCsv).toHaveBeenCalled();
    const csvArg = vi.mocked(exportUtils.downloadCsv).mock.calls[0][0];
    expect(csvArg).toContain('Forklift A1');
    expect(csvArg).toContain('SN12345');
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
