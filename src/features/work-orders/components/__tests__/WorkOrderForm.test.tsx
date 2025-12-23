import React from 'react';
import { render, screen, fireEvent, waitFor } from '@/test/utils/test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import WorkOrderForm from '../WorkOrderForm';
import type { WorkOrder } from '@/features/work-orders/types/workOrder';

// Mock hooks
vi.mock('@/contexts/OrganizationContext', () => ({
  useOrganization: vi.fn(() => ({
    currentOrganization: { id: 'org-1', name: 'Test Org' }
  }))
}));

vi.mock('@/features/work-orders/hooks/useWorkOrderForm', () => ({
  useWorkOrderForm: vi.fn(() => ({
    form: {
      values: {
        title: '',
        description: '',
        priority: 'medium',
        equipmentId: '',
        dueDate: undefined,
        estimatedHours: undefined,
        hasPM: false,
        pmTemplateId: null,
        assignmentType: 'unassigned',
        assignmentId: null,
        isHistorical: false
      },
      errors: {},
      isValid: true,
      setValue: vi.fn(),
      handleSubmit: vi.fn((fn) => (e: React.FormEvent) => {
        e.preventDefault();
        fn();
      }),
      reset: vi.fn()
    },
    isEditMode: false,
    checkForUnsavedChanges: vi.fn(() => false)
  }))
}));

vi.mock('@/features/equipment/components/hooks/useEquipmentSelection', () => ({
  useEquipmentSelection: vi.fn(() => ({
    allEquipment: [
      { id: 'eq-1', name: 'Equipment 1', default_pm_template_id: null },
      { id: 'eq-2', name: 'Equipment 2', default_pm_template_id: 'pm-1' }
    ],
    preSelectedEquipment: null,
    isEquipmentPreSelected: false
  }))
}));

vi.mock('@/features/work-orders/hooks/useWorkOrderSubmission', () => ({
  useWorkOrderSubmission: vi.fn(() => ({
    submitForm: vi.fn(),
    isLoading: false
  }))
}));

vi.mock('@/features/work-orders/hooks/useWorkOrderAssignment', () => ({
  useWorkOrderAssignmentOptions: vi.fn(() => ({
    members: [
      { id: 'user-1', name: 'John Doe' },
      { id: 'user-2', name: 'Jane Smith' }
    ],
    teams: [
      { id: 'team-1', name: 'Team 1' }
    ]
  }))
}));

// Mock sub-components
vi.mock('../WorkOrderFormHeader', () => ({
  WorkOrderFormHeader: ({ isEditMode }: { isEditMode: boolean }) => (
    <div data-testid="form-header">
      {isEditMode ? 'Edit Work Order' : 'Create Work Order'}
    </div>
  )
}));

vi.mock('../WorkOrderGeneralInfo', () => ({
  WorkOrderGeneralInfo: ({ values, setValue }: { values: { title?: string; description?: string }; setValue: (field: string, value: string) => void }) => (
    <div data-testid="general-info">
      <input
        data-testid="title-input"
        value={values.title || ''}
        onChange={(e) => setValue('title', e.target.value)}
        placeholder="Title"
      />
      <textarea
        data-testid="description-input"
        value={values.description || ''}
        onChange={(e) => setValue('description', e.target.value)}
        placeholder="Description"
      />
    </div>
  )
}));

vi.mock('../WorkOrderScheduling', () => ({
  WorkOrderScheduling: () => <div data-testid="scheduling">Scheduling</div>
}));

vi.mock('../WorkOrderAssignment', () => ({
  WorkOrderAssignment: () => <div data-testid="assignment">Assignment</div>
}));

vi.mock('../WorkOrderEquipmentSelector', () => ({
  WorkOrderEquipmentSelector: () => <div data-testid="equipment-selector">Equipment Selector</div>
}));

vi.mock('../WorkOrderPMChecklist', () => ({
  WorkOrderPMChecklist: () => <div data-testid="pm-checklist">PM Checklist</div>
}));

vi.mock('../WorkOrderFormActions', () => ({
  WorkOrderFormActions: ({ onCancel, onSubmit, isSubmitting, isValid }: { onCancel: () => void; onSubmit: () => void; isSubmitting: boolean; isValid: boolean }) => (
    <div data-testid="form-actions">
      <button data-testid="cancel-button" onClick={onCancel}>Cancel</button>
      <button data-testid="submit-button" onClick={onSubmit} disabled={isSubmitting || !isValid}>
        {isSubmitting ? 'Submitting...' : 'Submit'}
      </button>
    </div>
  )
}));

vi.mock('../WorkOrderHistoricalToggle', () => ({
  WorkOrderHistoricalToggle: ({ isHistorical, onToggle }: { isHistorical: boolean; onToggle: (value: boolean) => void }) => (
    <div data-testid="historical-toggle">
      <input
        type="checkbox"
        data-testid="historical-checkbox"
        checked={isHistorical}
        onChange={(e) => onToggle(e.target.checked)}
      />
      Historical
    </div>
  )
}));

vi.mock('../WorkOrderHistoricalFields', () => ({
  WorkOrderHistoricalFields: () => <div data-testid="historical-fields">Historical Fields</div>
}));

const mockWorkOrder: WorkOrder = {
  id: 'wo-1',
  title: 'Test Work Order',
  description: 'Test description',
  status: 'in_progress',
  priority: 'high',
  equipment_id: 'eq-1',
  organization_id: 'org-1',
  created_date: '2024-01-01T00:00:00Z',
  due_date: '2024-01-15T00:00:00Z',
  estimated_hours: 4,
  has_pm: false,
  pm_required: false,
  created_by: 'user-1',
  created_by_admin: false,
  updated_at: '2024-01-01T00:00:00Z',
  is_historical: false
} as WorkOrder;

describe('WorkOrderForm', () => {
  const mockOnClose = vi.fn();
  const mockOnSubmit = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset window.confirm
    window.confirm = vi.fn(() => true);
  });

  describe('Create Mode', () => {
    it('renders form in create mode when workOrder is not provided', () => {
      render(
        <WorkOrderForm
          open={true}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByTestId('form-header')).toHaveTextContent('Create Work Order');
    });

    it('renders all form sections in create mode', () => {
      render(
        <WorkOrderForm
          open={true}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByTestId('general-info')).toBeInTheDocument();
      expect(screen.getByTestId('equipment-selector')).toBeInTheDocument();
      expect(screen.getByTestId('scheduling')).toBeInTheDocument();
      expect(screen.getByTestId('assignment')).toBeInTheDocument();
      expect(screen.getByTestId('pm-checklist')).toBeInTheDocument();
    });

    it('renders historical toggle in create mode', () => {
      render(
        <WorkOrderForm
          open={true}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByTestId('historical-toggle')).toBeInTheDocument();
    });

    it('shows historical fields when historical toggle is enabled', async () => {
      const { useWorkOrderForm } = await import('@/features/work-orders/hooks/useWorkOrderForm');
      const mockSetValue = vi.fn();
      
      vi.mocked(useWorkOrderForm).mockReturnValue({
        form: {
          values: {
            title: '',
            description: '',
            priority: 'medium',
            equipmentId: '',
            isHistorical: true,
            status: 'accepted',
            historicalStartDate: undefined,
            historicalNotes: '',
            completedDate: undefined
          },
          errors: {},
          isValid: true,
          setValue: mockSetValue,
          handleSubmit: vi.fn((fn) => (e: React.FormEvent) => {
            e.preventDefault();
            fn();
          }),
          reset: vi.fn()
        },
        isEditMode: false,
        checkForUnsavedChanges: vi.fn(() => false)
      });

      render(
        <WorkOrderForm
          open={true}
          onClose={mockOnClose}
        />
      );

      const checkbox = screen.getByTestId('historical-checkbox');
      expect(checkbox).toBeChecked();
      expect(screen.getByTestId('historical-fields')).toBeInTheDocument();
    });

    it('shows auto-assignment alert when members are available', () => {
      render(
        <WorkOrderForm
          open={true}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText(/automatically assigned/i)).toBeInTheDocument();
    });

    it('calls onClose when cancel button is clicked', () => {
      render(
        <WorkOrderForm
          open={true}
          onClose={mockOnClose}
        />
      );

      const cancelButton = screen.getByTestId('cancel-button');
      fireEvent.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('shows working hours warning dialog when submitting without equipment working hours', async () => {
      const { useWorkOrderForm } = await import('@/features/work-orders/hooks/useWorkOrderForm');
      const { useWorkOrderSubmission } = await import('@/features/work-orders/hooks/useWorkOrderSubmission');
      
      const mockSetValue = vi.fn();
      const mockSubmitForm = vi.fn();
      
      vi.mocked(useWorkOrderForm).mockReturnValue({
        form: {
          values: {
            title: 'Test',
            description: 'Test',
            priority: 'medium',
            equipmentId: 'eq-1',
            equipmentWorkingHours: undefined, // No working hours
            isHistorical: false
          },
          errors: {},
          isValid: true,
          setValue: mockSetValue,
          handleSubmit: vi.fn((fn) => (e: React.FormEvent) => {
            e.preventDefault();
            fn();
          }),
          reset: vi.fn()
        },
        isEditMode: false,
        checkForUnsavedChanges: vi.fn(() => false)
      });

      vi.mocked(useWorkOrderSubmission).mockReturnValue({
        submitForm: mockSubmitForm,
        isLoading: false
      });

      render(
        <WorkOrderForm
          open={true}
          onClose={mockOnClose}
        />
      );

      const submitButton = screen.getByTestId('submit-button');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Equipment Working Hours Not Updated/i)).toBeInTheDocument();
      });
    });
  });

  describe('Edit Mode', () => {
    it('renders form in edit mode when workOrder is provided', async () => {
      const { useWorkOrderForm } = await import('@/features/work-orders/hooks/useWorkOrderForm');
      
      vi.mocked(useWorkOrderForm).mockReturnValue({
        form: {
          values: {
            title: 'Test Work Order',
            description: 'Test description',
            priority: 'high',
            equipmentId: 'eq-1',
            dueDate: '2024-01-15',
            estimatedHours: 4,
            hasPM: false,
            pmTemplateId: null,
            assignmentType: 'unassigned',
            assignmentId: null,
            isHistorical: false
          },
          errors: {},
          isValid: true,
          setValue: vi.fn(),
          handleSubmit: vi.fn((fn) => (e: React.FormEvent) => {
            e.preventDefault();
            fn();
          }),
          reset: vi.fn()
        },
        isEditMode: true,
        checkForUnsavedChanges: vi.fn(() => false)
      });

      render(
        <WorkOrderForm
          open={true}
          onClose={mockOnClose}
          workOrder={mockWorkOrder}
        />
      );

      expect(screen.getByTestId('form-header')).toHaveTextContent('Edit Work Order');
    });

    it('does not show historical toggle in edit mode', async () => {
      const { useWorkOrderForm } = await import('@/features/work-orders/hooks/useWorkOrderForm');
      
      vi.mocked(useWorkOrderForm).mockReturnValue({
        form: {
          values: {
            title: 'Test Work Order',
            description: 'Test description',
            priority: 'high',
            equipmentId: 'eq-1',
            dueDate: '2024-01-15',
            estimatedHours: 4,
            hasPM: false,
            pmTemplateId: null,
            assignmentType: 'unassigned',
            assignmentId: null,
            isHistorical: false
          },
          errors: {},
          isValid: true,
          setValue: vi.fn(),
          handleSubmit: vi.fn((fn) => (e: React.FormEvent) => {
            e.preventDefault();
            fn();
          }),
          reset: vi.fn()
        },
        isEditMode: true,
        checkForUnsavedChanges: vi.fn(() => false)
      });

      render(
        <WorkOrderForm
          open={true}
          onClose={mockOnClose}
          workOrder={mockWorkOrder}
        />
      );

      expect(screen.queryByTestId('historical-toggle')).not.toBeInTheDocument();
    });

    it('calls onSubmit when provided in edit mode', async () => {
      const { useWorkOrderForm } = await import('@/features/work-orders/hooks/useWorkOrderForm');
      const { useWorkOrderSubmission } = await import('@/features/work-orders/hooks/useWorkOrderSubmission');
      const mockSubmitForm = vi.fn();
      
      const mockHandleSubmit = vi.fn((fn) => {
        // Immediately call the function with form values
        const formValues = {
          title: 'Test Work Order',
          description: 'Test description',
          priority: 'high',
          equipmentId: 'eq-1',
          dueDate: '2024-01-15',
          estimatedHours: 4,
          hasPM: false,
          pmTemplateId: null,
          assignmentType: 'unassigned',
          assignmentId: null,
          isHistorical: false
        };
        fn(formValues);
        return Promise.resolve();
      });

      vi.mocked(useWorkOrderForm).mockReturnValue({
        form: {
          values: {
            title: 'Test Work Order',
            description: 'Test description',
            priority: 'high',
            equipmentId: 'eq-1',
            dueDate: '2024-01-15',
            estimatedHours: 4,
            hasPM: false,
            pmTemplateId: null,
            assignmentType: 'unassigned',
            assignmentId: null,
            isHistorical: false
          },
          errors: {},
          isValid: true,
          setValue: vi.fn(),
          handleSubmit: mockHandleSubmit,
          reset: vi.fn()
        },
        isEditMode: true,
        checkForUnsavedChanges: vi.fn(() => false)
      });
      
      vi.mocked(useWorkOrderSubmission).mockReturnValue({
        submitForm: mockSubmitForm,
        isLoading: false
      });

      render(
        <WorkOrderForm
          open={true}
          onClose={mockOnClose}
          workOrder={mockWorkOrder}
          onSubmit={mockOnSubmit}
        />
      );

      const submitButton = screen.getByTestId('submit-button');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockSubmitForm).toHaveBeenCalled();
      });
    });

    it('shows loading state when isUpdating is true', () => {
      render(
        <WorkOrderForm
          open={true}
          onClose={mockOnClose}
          workOrder={mockWorkOrder}
          isUpdating={true}
        />
      );

      expect(screen.getByText('Submitting...')).toBeInTheDocument();
      expect(screen.getByTestId('submit-button')).toBeDisabled();
    });
  });

  describe('Form Validation', () => {
    it('disables submit button when form is invalid', async () => {
      const { useWorkOrderForm } = await import('@/features/work-orders/hooks/useWorkOrderForm');
      
      // Reset and set up the mock
      vi.mocked(useWorkOrderForm).mockReset();
      vi.mocked(useWorkOrderForm).mockReturnValue({
        form: {
          values: {
            title: '',
            description: '',
            priority: 'medium',
            equipmentId: '',
            isHistorical: false
          },
          errors: {
            title: 'Title is required'
          },
          isValid: false,
          setValue: vi.fn(),
          handleSubmit: vi.fn((fn) => (e: React.FormEvent) => {
            e.preventDefault();
            fn();
          }),
          reset: vi.fn()
        },
        isEditMode: false,
        checkForUnsavedChanges: vi.fn(() => false)
      });

      render(
        <WorkOrderForm
          open={true}
          onClose={mockOnClose}
        />
      );

      const submitButton = screen.getByTestId('submit-button');
      expect(submitButton).toBeDisabled();
    });

    it('displays general error message when present', async () => {
      const { useWorkOrderForm } = await import('@/features/work-orders/hooks/useWorkOrderForm');
      
      vi.mocked(useWorkOrderForm).mockReturnValue({
        form: {
          values: {
            title: 'Test',
            description: 'Test',
            priority: 'medium',
            equipmentId: 'eq-1',
            isHistorical: false
          },
          errors: {
            general: 'An error occurred'
          },
          isValid: true,
          setValue: vi.fn(),
          handleSubmit: vi.fn((fn) => (e: React.FormEvent) => {
            e.preventDefault();
            fn();
          }),
          reset: vi.fn()
        },
        isEditMode: false,
        checkForUnsavedChanges: vi.fn(() => false)
      });

      render(
        <WorkOrderForm
          open={true}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('An error occurred')).toBeInTheDocument();
    });
  });

  describe('Unsaved Changes Detection', () => {
    it('prompts user when closing with unsaved changes', async () => {
      const { useWorkOrderForm } = await import('@/features/work-orders/hooks/useWorkOrderForm');
      const mockConfirm = vi.fn(() => false); // User cancels
      window.confirm = mockConfirm;
      
      vi.mocked(useWorkOrderForm).mockReturnValue({
        form: {
          values: {
            title: 'Test',
            description: 'Test',
            priority: 'medium',
            equipmentId: '',
            isHistorical: false
          },
          errors: {},
          isValid: true,
          setValue: vi.fn(),
          handleSubmit: vi.fn((fn) => (e: React.FormEvent) => {
            e.preventDefault();
            fn();
          }),
          reset: vi.fn()
        },
        isEditMode: false,
        checkForUnsavedChanges: vi.fn(() => true) // Has unsaved changes
      });

      render(
        <WorkOrderForm
          open={true}
          onClose={mockOnClose}
        />
      );

      const cancelButton = screen.getByTestId('cancel-button');
      fireEvent.click(cancelButton);

      await waitFor(() => {
        expect(mockConfirm).toHaveBeenCalledWith('You have unsaved changes. Are you sure you want to close?');
      });

      // Should not close if user cancels
      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('closes form when user confirms unsaved changes', async () => {
      const { useWorkOrderForm } = await import('@/features/work-orders/hooks/useWorkOrderForm');
      const mockConfirm = vi.fn(() => true); // User confirms
      window.confirm = mockConfirm;
      
      vi.mocked(useWorkOrderForm).mockReturnValue({
        form: {
          values: {
            title: 'Test',
            description: 'Test',
            priority: 'medium',
            equipmentId: '',
            isHistorical: false
          },
          errors: {},
          isValid: true,
          setValue: vi.fn(),
          handleSubmit: vi.fn((fn) => (e: React.FormEvent) => {
            e.preventDefault();
            fn();
          }),
          reset: vi.fn()
        },
        isEditMode: false,
        checkForUnsavedChanges: vi.fn(() => true)
      });

      render(
        <WorkOrderForm
          open={true}
          onClose={mockOnClose}
        />
      );

      const cancelButton = screen.getByTestId('cancel-button');
      fireEvent.click(cancelButton);

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });
  });

  describe('Working Hours Warning Dialog', () => {
    it('allows user to cancel and go back', async () => {
      const { useWorkOrderForm } = await import('@/features/work-orders/hooks/useWorkOrderForm');
      const { useWorkOrderSubmission } = await import('@/features/work-orders/hooks/useWorkOrderSubmission');
      
      const mockSetValue = vi.fn();
      const mockSubmitForm = vi.fn();
      
      vi.mocked(useWorkOrderForm).mockReturnValue({
        form: {
          values: {
            title: 'Test',
            description: 'Test',
            priority: 'medium',
            equipmentId: 'eq-1',
            equipmentWorkingHours: undefined,
            isHistorical: false
          },
          errors: {},
          isValid: true,
          setValue: mockSetValue,
          handleSubmit: vi.fn((fn) => (e: React.FormEvent) => {
            e.preventDefault();
            fn();
          }),
          reset: vi.fn()
        },
        isEditMode: false,
        checkForUnsavedChanges: vi.fn(() => false)
      });

      vi.mocked(useWorkOrderSubmission).mockReturnValue({
        submitForm: mockSubmitForm,
        isLoading: false
      });

      render(
        <WorkOrderForm
          open={true}
          onClose={mockOnClose}
        />
      );

      const submitButton = screen.getByTestId('submit-button');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Equipment Working Hours Not Updated/i)).toBeInTheDocument();
      });

      const cancelButton = screen.getByText(/Go Back & Update Hours/i);
      fireEvent.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByText(/Equipment Working Hours Not Updated/i)).not.toBeInTheDocument();
      });

      expect(mockSubmitForm).not.toHaveBeenCalled();
    });

    it('allows user to confirm and create without hours', async () => {
      const { useWorkOrderForm } = await import('@/features/work-orders/hooks/useWorkOrderForm');
      const { useWorkOrderSubmission } = await import('@/features/work-orders/hooks/useWorkOrderSubmission');
      
      const mockSetValue = vi.fn();
      const mockSubmitForm = vi.fn();
      
      vi.mocked(useWorkOrderForm).mockReturnValue({
        form: {
          values: {
            title: 'Test',
            description: 'Test',
            priority: 'medium',
            equipmentId: 'eq-1',
            equipmentWorkingHours: undefined,
            isHistorical: false
          },
          errors: {},
          isValid: true,
          setValue: mockSetValue,
          handleSubmit: vi.fn((fn) => (e: React.FormEvent) => {
            e.preventDefault();
            fn();
          }),
          reset: vi.fn()
        },
        isEditMode: false,
        checkForUnsavedChanges: vi.fn(() => false)
      });

      vi.mocked(useWorkOrderSubmission).mockReturnValue({
        submitForm: mockSubmitForm,
        isLoading: false
      });

      render(
        <WorkOrderForm
          open={true}
          onClose={mockOnClose}
        />
      );

      const submitButton = screen.getByTestId('submit-button');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Equipment Working Hours Not Updated/i)).toBeInTheDocument();
      });

      const confirmButton = screen.getByText(/Yes, Create Without Hours/i);
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockSubmitForm).toHaveBeenCalled();
      });
    });
  });

  describe('Equipment Pre-selection', () => {
    it('pre-selects equipment when equipmentId prop is provided', () => {
      render(
        <WorkOrderForm
          open={true}
          onClose={mockOnClose}
          equipmentId="eq-1"
        />
      );

      expect(screen.getByTestId('equipment-selector')).toBeInTheDocument();
    });
  });

  describe('PM Data Integration', () => {
    it('uses PM data for template selection in edit mode', () => {
      const pmData = { template_id: 'pm-1' };

      render(
        <WorkOrderForm
          open={true}
          onClose={mockOnClose}
          workOrder={mockWorkOrder}
          pmData={pmData}
        />
      );

      expect(screen.getByTestId('pm-checklist')).toBeInTheDocument();
    });
  });

  describe('Dialog Open/Close', () => {
    it('does not render when open is false', () => {
      render(
        <WorkOrderForm
          open={false}
          onClose={mockOnClose}
        />
      );

      expect(screen.queryByTestId('form-header')).not.toBeInTheDocument();
    });

    it('renders when open is true', () => {
      render(
        <WorkOrderForm
          open={true}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByTestId('form-header')).toBeInTheDocument();
    });
  });
});

