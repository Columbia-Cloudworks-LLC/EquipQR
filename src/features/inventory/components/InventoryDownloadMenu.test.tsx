import { render, screen, createSettingsTestWrapper, SYDNEY_USER_SETTINGS } from '@vitest-harness/utils/test-utils';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { formatDate } from '@/utils/dateFormatter';
import type { InventoryItem } from '@/features/inventory/types/inventory';
import * as exportUtils from '@/utils/exportUtils';
import InventoryDownloadMenu from './InventoryDownloadMenu';

vi.mock('@/utils/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

const SettingsWrapper = createSettingsTestWrapper();

const UTC_CROSS_CALENDAR = '2023-12-24T15:00:00.000Z';

const mockItem: InventoryItem = {
  id: 'item-1',
  organization_id: 'org-1',
  name: 'Bolt',
  description: null,
  sku: 'B-1',
  external_id: null,
  quantity_on_hand: 5,
  low_stock_threshold: 1,
  location: 'Shelf A',
  default_unit_cost: 1.5,
  image_url: null,
  created_by: 'user-1',
  created_at: UTC_CROSS_CALENDAR,
  updated_at: UTC_CROSS_CALENDAR,
  isLowStock: false,
};

describe('InventoryDownloadMenu', () => {
  beforeEach(() => {
    vi.spyOn(exportUtils, 'downloadCsv').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('CSV export formats created_at using user timezone settings', async () => {
    const user = userEvent.setup();
    render(<InventoryDownloadMenu canExport items={[mockItem]} />, {
      wrapper: SettingsWrapper,
    });

    await user.click(screen.getByRole('button', { name: /download inventory/i }));
    await user.click(screen.getByText('CSV'));

    expect(exportUtils.downloadCsv).toHaveBeenCalled();
    const csvArg = vi.mocked(exportUtils.downloadCsv).mock.calls[0][0];
    expect(csvArg).toContain(formatDate(UTC_CROSS_CALENDAR, SYDNEY_USER_SETTINGS));
  });

  it('exports selected rows when selectedItems are provided', async () => {
    const user = userEvent.setup();
    render(
      <InventoryDownloadMenu
        canExport
        items={[mockItem]}
        selectedItems={[mockItem]}
      />,
      { wrapper: SettingsWrapper },
    );

    await user.click(screen.getByRole('button', { name: /download inventory/i }));
    await user.click(screen.getByText('CSV (selected)'));

    expect(exportUtils.downloadCsv).toHaveBeenCalled();
    const csvArg = vi.mocked(exportUtils.downloadCsv).mock.calls[0][0];
    expect(csvArg).toContain('Bolt');
  });
});