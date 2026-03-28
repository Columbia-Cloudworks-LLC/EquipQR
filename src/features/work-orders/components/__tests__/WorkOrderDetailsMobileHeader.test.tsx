import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@/test/utils/test-utils';
import { WorkOrderDetailsMobileHeader } from '../WorkOrderDetailsMobileHeader';

describe('WorkOrderDetailsMobileHeader', () => {
  const baseProps = {
    workOrder: {
      id: 'wo-1',
      title: 'Hydraulic Pump Inspection',
      priority: 'medium' as const,
      status: 'completed' as const,
      equipment: {
        name: 'Excavator A',
        status: 'maintenance',
      },
    },
    canEdit: true,
    onEditClick: vi.fn(),
    onToggleSidebar: vi.fn(),
    onOpenActionSheet: vi.fn(),
  };

  it('renders status before priority badges', () => {
    const { container } = render(<WorkOrderDetailsMobileHeader {...baseProps} />);

    const badges = Array.from(container.querySelectorAll('[class*="inline-flex"][class*="text-xs"]'));
    const badgeText = badges.map((badge) => badge.textContent?.trim());

    expect(badgeText).toContain('Completed');
    expect(badgeText).toContain('medium priority');
    expect(badgeText.indexOf('Completed')).toBeLessThan(badgeText.indexOf('medium priority'));
  });

  it('formats equipment status with equipment badge presentation', () => {
    render(<WorkOrderDetailsMobileHeader {...baseProps} />);

    expect(screen.getByText('Under Maintenance')).toBeInTheDocument();
  });
});
