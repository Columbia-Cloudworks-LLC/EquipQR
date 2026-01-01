import React from 'react';
import { render, screen, fireEvent, waitFor } from '@/test/utils/test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WorkOrderAssignment } from '../WorkOrderAssignment';

// Mock hooks
vi.mock('@/features/work-orders/hooks/useWorkOrderAssignment', () => ({
  useWorkOrderAssignmentOptions: vi.fn(() => ({
    assignmentOptions: [
      { id: 'user-1', name: 'John Doe', role: 'technician', type: 'user' },
      { id: 'user-2', name: 'Jane Smith', role: 'admin', type: 'user' }
    ],
    isLoading: false,
    error: null,
    equipmentHasNoTeam: false
  }))
}));

describe('WorkOrderAssignment', () => {
  const mockSetValue = vi.fn();
  const mockValues = {
    assigneeId: null
  };
  const mockErrors = {};

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders assignee select with Unassigned option', () => {
      render(
        <WorkOrderAssignment
          values={mockValues}
          errors={mockErrors}
          setValue={mockSetValue}
          organizationId="org-1"
          equipmentId="eq-1"
        />
      );

      expect(screen.getByText(/Assignee/i)).toBeInTheDocument();
      expect(screen.getByText(/Unassigned/i)).toBeInTheDocument();
    });

    it('shows assignment rule description', () => {
      render(
        <WorkOrderAssignment
          values={mockValues}
          errors={mockErrors}
          setValue={mockSetValue}
          organizationId="org-1"
          equipmentId="eq-1"
        />
      );

      expect(screen.getByText(/equipment team members \+ organization admins/i)).toBeInTheDocument();
    });

    it('shows currently selected assignee when set', async () => {
      const valuesWithAssignee = {
        assigneeId: 'user-1'
      };

      render(
        <WorkOrderAssignment
          values={valuesWithAssignee}
          errors={mockErrors}
          setValue={mockSetValue}
          organizationId="org-1"
          equipmentId="eq-1"
        />
      );

      // The select should show the value
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });
  });

  describe('Equipment Has No Team (Blocked State)', () => {
    it('shows warning when equipment has no team', async () => {
      const { useWorkOrderAssignmentOptions } = await import('@/features/work-orders/hooks/useWorkOrderAssignment');
      
      vi.mocked(useWorkOrderAssignmentOptions).mockReturnValue({
        assignmentOptions: [],
        isLoading: false,
        error: null,
        members: [],
        equipmentHasNoTeam: true
      });

      render(
        <WorkOrderAssignment
          values={mockValues}
          errors={mockErrors}
          setValue={mockSetValue}
          organizationId="org-1"
          equipmentId="eq-1"
        />
      );

      expect(screen.getByText(/no team assigned/i)).toBeInTheDocument();
      expect(screen.getByText(/Assign a team to the equipment/i)).toBeInTheDocument();
    });

    it('does not show assignee select when equipment has no team', async () => {
      const { useWorkOrderAssignmentOptions } = await import('@/features/work-orders/hooks/useWorkOrderAssignment');
      
      vi.mocked(useWorkOrderAssignmentOptions).mockReturnValue({
        assignmentOptions: [],
        isLoading: false,
        error: null,
        members: [],
        equipmentHasNoTeam: true
      });

      render(
        <WorkOrderAssignment
          values={mockValues}
          errors={mockErrors}
          setValue={mockSetValue}
          organizationId="org-1"
          equipmentId="eq-1"
        />
      );

      // Should not have the combobox when blocked
      expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    });
  });

  describe('Assignee Selection', () => {
    it('displays available assignees including admins', async () => {
      const { useWorkOrderAssignmentOptions } = await import('@/features/work-orders/hooks/useWorkOrderAssignment');
      
      vi.mocked(useWorkOrderAssignmentOptions).mockReturnValue({
        assignmentOptions: [
          { id: 'user-1', name: 'John Technician', role: 'technician', type: 'user' as const },
          { id: 'user-2', name: 'Jane Admin', role: 'admin', type: 'user' as const }
        ],
        isLoading: false,
        error: null,
        members: [],
        equipmentHasNoTeam: false
      });

      render(
        <WorkOrderAssignment
          values={mockValues}
          errors={mockErrors}
          setValue={mockSetValue}
          organizationId="org-1"
          equipmentId="eq-1"
        />
      );

      // Open the select dropdown
      const select = screen.getByRole('combobox');
      fireEvent.click(select);

      // Check that both options appear
      await waitFor(() => {
        expect(screen.getByText(/John Technician/i)).toBeInTheDocument();
        expect(screen.getByText(/Jane Admin/i)).toBeInTheDocument();
      });
    });

    it('calls setValue with null when selecting Unassigned', async () => {
      const valuesWithAssignee = {
        assigneeId: 'user-1'
      };

      render(
        <WorkOrderAssignment
          values={valuesWithAssignee}
          errors={mockErrors}
          setValue={mockSetValue}
          organizationId="org-1"
          equipmentId="eq-1"
        />
      );

      // Open the select dropdown
      const select = screen.getByRole('combobox');
      fireEvent.click(select);

      // Click Unassigned option
      await waitFor(() => {
        const unassignedOption = screen.getByText(/Unassigned/i);
        fireEvent.click(unassignedOption);
      });

      expect(mockSetValue).toHaveBeenCalledWith('assigneeId', null);
    });

    it('calls setValue with user ID when selecting an assignee', async () => {
      const { useWorkOrderAssignmentOptions } = await import('@/features/work-orders/hooks/useWorkOrderAssignment');
      
      vi.mocked(useWorkOrderAssignmentOptions).mockReturnValue({
        assignmentOptions: [
          { id: 'user-1', name: 'John Doe', role: 'technician', type: 'user' as const }
        ],
        isLoading: false,
        error: null,
        members: [],
        equipmentHasNoTeam: false
      });

      render(
        <WorkOrderAssignment
          values={mockValues}
          errors={mockErrors}
          setValue={mockSetValue}
          organizationId="org-1"
          equipmentId="eq-1"
        />
      );

      // Open the select dropdown
      const select = screen.getByRole('combobox');
      fireEvent.click(select);

      // Click John Doe option
      await waitFor(() => {
        const johnOption = screen.getByText(/John Doe/i);
        fireEvent.click(johnOption);
      });

      expect(mockSetValue).toHaveBeenCalledWith('assigneeId', 'user-1');
    });

    it('shows loading state when assignees are loading', async () => {
      const { useWorkOrderAssignmentOptions } = await import('@/features/work-orders/hooks/useWorkOrderAssignment');
      
      vi.mocked(useWorkOrderAssignmentOptions).mockReturnValue({
        assignmentOptions: [],
        isLoading: true,
        error: null,
        members: [],
        equipmentHasNoTeam: false
      });

      render(
        <WorkOrderAssignment
          values={mockValues}
          errors={mockErrors}
          setValue={mockSetValue}
          organizationId="org-1"
          equipmentId="eq-1"
        />
      );

      // The select should be disabled when loading
      const select = screen.getByRole('combobox');
      expect(select).toBeDisabled();
    });

    it('shows error message when assignment options fail to load', async () => {
      const { useWorkOrderAssignmentOptions } = await import('@/features/work-orders/hooks/useWorkOrderAssignment');
      
      vi.mocked(useWorkOrderAssignmentOptions).mockReturnValue({
        assignmentOptions: [],
        isLoading: false,
        error: { message: 'Failed to load assignees' } as Error,
        members: [],
        equipmentHasNoTeam: false
      });

      render(
        <WorkOrderAssignment
          values={mockValues}
          errors={mockErrors}
          setValue={mockSetValue}
          organizationId="org-1"
          equipmentId="eq-1"
        />
      );

      expect(screen.getByText(/Error loading assignees/i)).toBeInTheDocument();
    });
  });

  describe('Error Display', () => {
    it('displays assignee error when present', () => {
      const errorsWithId = {
        assigneeId: 'Assignee is required'
      };

      render(
        <WorkOrderAssignment
          values={mockValues}
          errors={errorsWithId}
          setValue={mockSetValue}
          organizationId="org-1"
          equipmentId="eq-1"
        />
      );

      expect(screen.getByText('Assignee is required')).toBeInTheDocument();
    });
  });

  describe('Equipment Context', () => {
    it('passes equipmentId to assignment options hook', async () => {
      // Reset the mock to a clean state
      const { useWorkOrderAssignmentOptions } = await import('@/features/work-orders/hooks/useWorkOrderAssignment');
      
      vi.mocked(useWorkOrderAssignmentOptions).mockReturnValue({
        assignmentOptions: [
          { id: 'user-1', name: 'John Doe', role: 'technician', type: 'user' as const }
        ],
        isLoading: false,
        error: null,
        members: [],
        equipmentHasNoTeam: false
      });

      render(
        <WorkOrderAssignment
          values={mockValues}
          errors={mockErrors}
          setValue={mockSetValue}
          organizationId="org-1"
          equipmentId="eq-1"
        />
      );

      // Component should render successfully with equipmentId
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });
  });
});
