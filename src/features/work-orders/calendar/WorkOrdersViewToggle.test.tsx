import { fireEvent, render, screen } from '@vitest-harness/utils/test-utils';
import { describe, expect, it, vi } from 'vitest';
import { WorkOrdersViewToggle } from '@/features/work-orders/calendar/WorkOrdersViewToggle';

describe('WorkOrdersViewToggle', () => {
  it('exposes a radiogroup with list and calendar options', () => {
    const onChange = vi.fn();
    render(<WorkOrdersViewToggle surface="list" onChange={onChange} />);

    const group = screen.getByRole('radiogroup', { name: 'Work orders view' });
    expect(group).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'List view' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: 'Calendar view' })).toHaveAttribute('aria-checked', 'false');

    fireEvent.click(screen.getByRole('radio', { name: 'Calendar view' }));
    expect(onChange).toHaveBeenCalledWith('calendar');
  });

  it('marks calendar as the checked option in calendar mode', () => {
    render(<WorkOrdersViewToggle surface="calendar" onChange={vi.fn()} />);
    expect(screen.getByRole('radio', { name: 'Calendar view' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: 'List view' })).toHaveAttribute('aria-checked', 'false');
  });
});
