import React from 'react';
import { render } from '@/test/utils/test-utils';
import { describe, it, expect, vi } from 'vitest';
import { SettingsContext } from '@/contexts/settings-context';
import type { UserSettings } from '@/types/settings';
import { formatDateTime } from '@/utils/dateFormatter';
import type { InventoryTransaction } from '@/features/inventory/types/inventory';
import InventoryItemTransactionsTab from '../InventoryItemTransactionsTab';

vi.mock('@/utils/logger', () => ({
  logger: { warn: vi.fn() },
}));

const sydneySettings: UserSettings = {
  timezone: 'Australia/Sydney',
  dateFormat: 'MM/dd/yyyy',
};

function SettingsWrapper({ children }: { children: React.ReactNode }) {
  return (
    <SettingsContext.Provider
      value={{
        settings: sydneySettings,
        updateSetting: vi.fn(),
        resetSettings: vi.fn(),
        isLoading: false,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

const UTC_CROSS_CALENDAR = '2023-12-24T15:00:00.000Z';

describe('InventoryItemTransactionsTab', () => {
  it('renders transaction timestamps in the user timezone settings', () => {
    const transaction: InventoryTransaction = {
      id: 'txn-1',
      inventory_item_id: 'item-1',
      organization_id: 'org-1',
      change_amount: -1,
      previous_quantity: 10,
      new_quantity: 9,
      transaction_type: 'adjustment',
      user_id: 'user-1',
      user_name: null,
      work_order_id: null,
      notes: null,
      created_at: UTC_CROSS_CALENDAR,
      userName: 'Tester',
    };

    const { container } = render(<InventoryItemTransactionsTab transactions={[transaction]} />, {
      wrapper: SettingsWrapper,
    });

    const expected = formatDateTime(UTC_CROSS_CALENDAR, sydneySettings);
    expect(container).toHaveTextContent(expected);
  });
});