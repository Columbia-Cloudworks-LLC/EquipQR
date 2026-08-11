import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@vitest-harness/utils/test-utils';

vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: vi.fn(() => false),
}));
import {
  LEDGER_DATE_END_ID,
  LEDGER_DATE_START_ID,
  OperatorCheckinLedgerDateRangePicker,
} from '@/features/operator-check-ins/components/OperatorCheckinLedgerDateRangePicker';
import { createLedgerShortcutDate } from '@/features/operator-check-ins/utils/operatorCheckinLedgerScope';

async function openDatePopover(label: 'Start date' | 'End date') {
  fireEvent.click(screen.getByRole('button', { name: label }));
  await waitFor(() => {
    expect(screen.getByText('Quick dates')).toBeInTheDocument();
  });
}

describe('OperatorCheckinLedgerDateRangePicker', () => {
  it('shows separate start and end date fields', () => {
    render(
      <OperatorCheckinLedgerDateRangePicker
        startDate="2026-07-01"
        endDate="2026-07-04"
        onStartDateChange={vi.fn()}
        onEndDateChange={vi.fn()}
      />,
    );

    expect(screen.getByText('Start date')).toBeVisible();
    expect(screen.getByText('End date')).toBeVisible();
    expect(screen.getByLabelText('Start date')).toHaveAttribute('id', LEDGER_DATE_START_ID);
    expect(screen.getByLabelText('End date')).toHaveAttribute('id', LEDGER_DATE_END_ID);
  });

  it('applies a 7-day shortcut to only the selected date field', async () => {
    const referenceDate = new Date(2026, 6, 4, 12, 0, 0);
    const expectedDate = createLedgerShortcutDate(7, referenceDate);
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(referenceDate);

    const onStartDateChange = vi.fn();
    const onEndDateChange = vi.fn();
    render(
      <OperatorCheckinLedgerDateRangePicker
        startDate="2026-07-04"
        endDate="2026-07-04"
        onStartDateChange={onStartDateChange}
        onEndDateChange={onEndDateChange}
      />,
    );

    try {
      await openDatePopover('Start date');
      fireEvent.click(screen.getByRole('button', { name: '1 Week Ago (7 Days)' }));

      expect(onStartDateChange).toHaveBeenCalledWith(expectedDate);
      expect(onEndDateChange).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not show a redundant date input inside the calendar popover', async () => {
    render(
      <OperatorCheckinLedgerDateRangePicker
        startDate="2026-07-04"
        endDate="2026-07-04"
        onStartDateChange={vi.fn()}
        onEndDateChange={vi.fn()}
      />,
    );

    await openDatePopover('Start date');

    expect(screen.queryByLabelText('Start date input')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('End date input')).not.toBeInTheDocument();
    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();
  });

  it('includes a Today shortcut for each calendar popover', async () => {
    const referenceDate = new Date(2026, 6, 4, 12, 0, 0);
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(referenceDate);

    const onStartDateChange = vi.fn();
    const onEndDateChange = vi.fn();

    render(
      <OperatorCheckinLedgerDateRangePicker
        startDate="2026-06-01"
        endDate="2026-06-30"
        onStartDateChange={onStartDateChange}
        onEndDateChange={onEndDateChange}
      />,
    );

    try {
      await openDatePopover('End date');
      fireEvent.click(screen.getByRole('button', { name: 'Today' }));

      expect(onEndDateChange).toHaveBeenCalledWith('2026-07-04');
      expect(onStartDateChange).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });
});
