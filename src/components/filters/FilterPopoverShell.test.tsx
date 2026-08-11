import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { FilterPopoverShell } from '@/components/filters/FilterPopoverShell';

describe('FilterPopoverShell', () => {
  it('renders accessible filter trigger without active count', () => {
    render(
      <FilterPopoverShell ariaSubject="equipment" activeFilterCount={0}>
        {() => <p>Filter body</p>}
      </FilterPopoverShell>,
    );

    expect(screen.getByRole('button', { name: 'Filter equipment' })).toBeInTheDocument();
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('shows active filter count in trigger label and badge', () => {
    render(
      <FilterPopoverShell ariaSubject="work orders" activeFilterCount={2}>
        {() => <p>Filter body</p>}
      </FilterPopoverShell>,
    );

    expect(
      screen.getByRole('button', { name: 'Filter work orders, 2 active' }),
    ).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('opens popover content when trigger is clicked', async () => {
    const user = userEvent.setup();

    render(
      <FilterPopoverShell ariaSubject="notifications" activeFilterCount={1}>
        {() => <p>Notification filters panel</p>}
      </FilterPopoverShell>,
    );

    expect(screen.queryByText('Notification filters panel')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Filter notifications/ }));

    expect(screen.getByText('Filters')).toBeInTheDocument();
    expect(screen.getByText('Notification filters panel')).toBeInTheDocument();
  });
});
