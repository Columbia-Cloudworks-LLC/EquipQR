import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

import { WorkOrderPMManagementActions } from './WorkOrderPMManagementActions';

describe('WorkOrderPMManagementActions', () => {
  it('renders nothing when PM management is not allowed', () => {
    const { container } = render(
      <WorkOrderPMManagementActions canManage={false} hasPm={true} onManage={vi.fn()} />,
    );

    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByRole('button', { name: /manage pm template/i })).not.toBeInTheDocument();
  });

  it('shows Add PM Checklist when PM can be attached', () => {
    render(<WorkOrderPMManagementActions canManage={true} hasPm={false} onManage={vi.fn()} />);

    expect(screen.getByRole('button', { name: /add pm checklist/i })).toBeInTheDocument();
  });

  it('shows Manage PM Template when a checklist already exists', () => {
    render(<WorkOrderPMManagementActions canManage={true} hasPm={true} onManage={vi.fn()} />);

    expect(screen.getByRole('button', { name: /manage pm template/i })).toBeInTheDocument();
  });
});
