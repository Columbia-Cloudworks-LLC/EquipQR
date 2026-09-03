import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@vitest-harness/utils/test-utils';
import WorkOrderDetailsInfo from '@/features/work-orders/components/WorkOrderDetailsInfo';

vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: () => false,
}));

vi.mock('@/features/equipment/hooks/useEquipmentWorkingHours', () => ({
  useEquipmentCurrentWorkingHours: () => ({ data: 42, isLoading: false }),
}));

const workOrder = {
  id: 'wo-1',
  title: 'Hydraulic repair',
  description: 'Existing description',
  status: 'completed' as const,
  priority: 'high' as const,
  created_date: '2026-01-01T00:00:00Z',
  equipment_id: 'eq-1',
  organization_id: 'org-1',
};

describe('WorkOrderDetailsInfo', () => {
  it('shows a description lock reason on completed work orders', () => {
    render(
      <WorkOrderDetailsInfo
        workOrder={workOrder}
        equipment={null}
        organizationId="org-1"
        descriptionLockMessage="This work order is completed. Reopen it to edit the description."
      />,
    );

    expect(screen.getByText('Description')).toBeInTheDocument();
    expect(
      screen.getByText('This work order is completed. Reopen it to edit the description.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /edit description/i })).not.toBeInTheDocument();
  });

  it('keeps the inline edit affordance when the description is still editable', () => {
    render(
      <WorkOrderDetailsInfo
        workOrder={{ ...workOrder, status: 'in_progress' }}
        equipment={null}
        organizationId="org-1"
        canEditDescription
        onSaveDescription={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: /edit description/i })).toBeInTheDocument();
  });
});
