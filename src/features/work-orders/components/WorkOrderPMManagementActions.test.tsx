import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import { WorkOrderPMManagementActions } from './WorkOrderPMManagementActions';

describe('WorkOrderPMManagementActions', () => {
  it('renders nothing when PM management is not allowed', () => {
    const { container } = render(
      <WorkOrderPMManagementActions canManage={false} hasPm={true} onManage={vi.fn()} />,
    );

    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByRole('button', { name: /manage pm template/i })).not.toBeInTheDocument();
  });

  it('left-aligns the mobile PM action clear of the FAB lane while preserving desktop end alignment', () => {
    const onManage = vi.fn();
    render(<WorkOrderPMManagementActions canManage={true} hasPm={false} onManage={onManage} />);

    const button = screen.getByRole('button', { name: /add pm checklist/i });
    expect(button).toBeInTheDocument();
    expect(button.parentElement).toHaveClass('justify-start');
    expect(button.parentElement).toHaveClass('md:justify-end');
    expect(button.parentElement).toHaveClass('pr-12');
    expect(button.parentElement).toHaveClass('md:pr-0');

    fireEvent.click(button);
    expect(onManage).toHaveBeenCalledTimes(1);
  });

  it('shows Manage PM Template when a checklist already exists', () => {
    render(<WorkOrderPMManagementActions canManage={true} hasPm={true} onManage={vi.fn()} />);

    expect(screen.getByRole('button', { name: /manage pm template/i })).toBeInTheDocument();
  });
});
