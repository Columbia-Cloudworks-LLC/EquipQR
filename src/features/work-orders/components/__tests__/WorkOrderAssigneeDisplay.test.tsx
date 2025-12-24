import React from 'react';
import { render, screen, fireEvent } from '@/test/utils/test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import WorkOrderAssigneeDisplay from '../WorkOrderAssigneeDisplay';

// Mock WorkOrderAssignmentSelector
vi.mock('../WorkOrderAssignmentSelector', () => ({
  default: ({ onCancel }: { onCancel: () => void }) => (
    <div data-testid="assignment-selector">
      <button data-testid="cancel-selector" onClick={onCancel}>Cancel</button>
    </div>
  )
}));

const mockWorkOrder = {
  id: 'wo-1',
  organization_id: 'org-1',
  assignee_id: 'user-1',
  assigneeName: 'John Doe',
  assignee: { name: 'John Doe' },
  acceptance_date: '2024-01-01T00:00:00Z'
};

describe('WorkOrderAssigneeDisplay', () => {
  const mockOrganizationId = 'org-1';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Display Mode', () => {
    it('renders assigned user when assignee is present', () => {
      render(
        <WorkOrderAssigneeDisplay
          workOrder={mockWorkOrder}
          organizationId={mockOrganizationId}
          canManageAssignment={true}
        />
      );

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText(/Assignment/i)).toBeInTheDocument();
    });

    it('renders unassigned state when no assignee', () => {
      const unassignedOrder = {
        ...mockWorkOrder,
        assignee_id: null,
        assigneeName: undefined,
        assignee: null
      };

      render(
        <WorkOrderAssigneeDisplay
          workOrder={unassignedOrder}
          organizationId={mockOrganizationId}
          canManageAssignment={true}
        />
      );

      expect(screen.getByText(/Unassigned/i)).toBeInTheDocument();
    });

    it('displays acceptance date when available', () => {
      render(
        <WorkOrderAssigneeDisplay
          workOrder={mockWorkOrder}
          organizationId={mockOrganizationId}
          canManageAssignment={true}
        />
      );

      expect(screen.getByText(/Accepted/i)).toBeInTheDocument();
    });

    it('shows edit button when canManageAssignment is true and showEditControls is true', () => {
      render(
        <WorkOrderAssigneeDisplay
          workOrder={mockWorkOrder}
          organizationId={mockOrganizationId}
          canManageAssignment={true}
          showEditControls={true}
        />
      );

      expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
    });

    it('hides edit button when canManageAssignment is false', () => {
      render(
        <WorkOrderAssigneeDisplay
          workOrder={mockWorkOrder}
          organizationId={mockOrganizationId}
          canManageAssignment={false}
        />
      );

      expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument();
    });

    it('hides edit button when showEditControls is false', () => {
      render(
        <WorkOrderAssigneeDisplay
          workOrder={mockWorkOrder}
          organizationId={mockOrganizationId}
          canManageAssignment={true}
          showEditControls={false}
        />
      );

      expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument();
    });
  });

  describe('Edit Mode', () => {
    it('switches to edit mode when edit button is clicked', () => {
      render(
        <WorkOrderAssigneeDisplay
          workOrder={mockWorkOrder}
          organizationId={mockOrganizationId}
          canManageAssignment={true}
        />
      );

      const editButton = screen.getByRole('button', { name: /edit/i });
      fireEvent.click(editButton);

      expect(screen.getByTestId('assignment-selector')).toBeInTheDocument();
      expect(screen.getByText(/Change Assignment/i)).toBeInTheDocument();
    });

    it('switches back to display mode when cancel is clicked', () => {
      render(
        <WorkOrderAssigneeDisplay
          workOrder={mockWorkOrder}
          organizationId={mockOrganizationId}
          canManageAssignment={true}
        />
      );

      const editButton = screen.getByRole('button', { name: /edit/i });
      fireEvent.click(editButton);

      expect(screen.getByTestId('assignment-selector')).toBeInTheDocument();

      const cancelButton = screen.getByTestId('cancel-selector');
      fireEvent.click(cancelButton);

      expect(screen.queryByTestId('assignment-selector')).not.toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles assigneeName from assignee object when assigneeName is not present', () => {
      const orderWithAssigneeObject = {
        ...mockWorkOrder,
        assigneeName: undefined,
        assignee: { name: 'Jane Smith' }
      };

      render(
        <WorkOrderAssigneeDisplay
          workOrder={orderWithAssigneeObject}
          organizationId={mockOrganizationId}
          canManageAssignment={true}
        />
      );

      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });

    it('handles missing acceptance date gracefully', () => {
      const orderWithoutAcceptance = {
        ...mockWorkOrder,
        acceptance_date: null,
        acceptanceDate: undefined
      };

      render(
        <WorkOrderAssigneeDisplay
          workOrder={orderWithoutAcceptance}
          organizationId={mockOrganizationId}
          canManageAssignment={true}
        />
      );

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.queryByText(/Accepted/i)).not.toBeInTheDocument();
    });

    it('handles both assignee_id and assigneeId formats', () => {
      const orderWithAssigneeId = {
        ...mockWorkOrder,
        assignee_id: undefined,
        assigneeId: 'user-2',
        assigneeName: 'Jane Smith'
      };

      render(
        <WorkOrderAssigneeDisplay
          workOrder={orderWithAssigneeId}
          organizationId={mockOrganizationId}
          canManageAssignment={true}
        />
      );

      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });
  });
});

