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
        assigneeId: null,
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
    assignmentOptions: [
      { id: 'user-1', name: 'John Doe', role: 'technician', type: 'user' },
      { id: 'user-2', name: 'Jane Smith', role: 'admin', type: 'user' }
    ],
    members: [],
    isLoading: false,
    error: null,
    equipmentHasNoTeam: false
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
  created_by_admin: null,
  created_by_name: null,
  updated_at: '2024-01-01T00:00:00Z',
  is_historical: false,
  acceptance_date: null,
  assignee_id: null,
  assignee_name: null,
  completed_date: null,
  historical_notes: null,
  historical_start_date: null,
  team_id: null
};

describe('WorkOrderForm', () => {
  const mockOnClose = vi.fn();
  const mockOnSubmit = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    window.confirm = vi.fn(() => true);
  });

  describe('rendering', () => {
    it('renders all form sections in create mode with correct header', () => {
      render(<WorkOrderForm open={true} onClose={mockOnClose} />);

      expect(screen.getByTestId('form-header')).toHaveTextContent('Create Work Order');
      expect(screen.getByTestId('general-info')).toBeInTheDocument();
      expect(screen.getByTestId('equipment-selector')).toBeInTheDocument();
      expect(screen.getByTestId('scheduling')).toBeInTheDocument();
      expect(screen.getByTestId('assignment')).toBeInTheDocument();
      expect(screen.getByTestId('pm-checklist')).toBeInTheDocument();
      expect(screen.getByTestId('historical-toggle')).toBeInTheDocument();
    });

    it('renders in edit mode with correct header and hides historical toggle', async () => {
      const { useWorkOrderForm } = await import('@/features/work-orders/hooks/useWorkOrderForm');
      
      vi.mocked(useWorkOrderForm).mockReturnValue({
        form: {
          values: { title: 'Test', description: '', priority: 'high', equipmentId: 'eq-1', isHistorical: false },
          errors: {},
          isValid: true,
          setValue: vi.fn(),
          handleSubmit: vi.fn((fn) => (e: React.FormEvent) => { e.preventDefault(); fn(); }),
          reset: vi.fn()
        },
        isEditMode: true,
        checkForUnsavedChanges: vi.fn(() => false)
      });

      render(<WorkOrderForm open={true} onClose={mockOnClose} workOrder={mockWorkOrder} />);

      expect(screen.getByTestId('form-header')).toHaveTextContent('Edit Work Order');
      expect(screen.queryByTestId('historical-toggle')).not.toBeInTheDocument();
    });

    it('shows historical fields when historical toggle is enabled', async () => {
      const { useWorkOrderForm } = await import('@/features/work-orders/hooks/useWorkOrderForm');
      
      vi.mocked(useWorkOrderForm).mockReturnValue({
        form: {
          values: { title: '', description: '', priority: 'medium', equipmentId: '', isHistorical: true, status: 'accepted' },
          errors: {},
          isValid: true,
          setValue: vi.fn(),
          handleSubmit: vi.fn((fn) => (e: React.FormEvent) => { e.preventDefault(); fn(); }),
          reset: vi.fn()
        },
        isEditMode: false,
        checkForUnsavedChanges: vi.fn(() => false)
      });

      render(<WorkOrderForm open={true} onClose={mockOnClose} />);

      expect(screen.getByTestId('historical-checkbox')).toBeChecked();
      expect(screen.getByTestId('historical-fields')).toBeInTheDocument();
    });

    it('does not render when open is false', () => {
      render(<WorkOrderForm open={false} onClose={mockOnClose} />);
      expect(screen.queryByTestId('form-header')).not.toBeInTheDocument();
    });
  });

  describe('form validation', () => {
    it('disables submit button when form is invalid', async () => {
      const { useWorkOrderForm } = await import('@/features/work-orders/hooks/useWorkOrderForm');
      
      vi.mocked(useWorkOrderForm).mockReturnValue({
        form: {
          values: { title: '', description: '', priority: 'medium', equipmentId: '', isHistorical: false },
          errors: { title: 'Title is required' },
          isValid: false,
          setValue: vi.fn(),
          handleSubmit: vi.fn((fn) => (e: React.FormEvent) => { e.preventDefault(); fn(); }),
          reset: vi.fn()
        },
        isEditMode: false,
        checkForUnsavedChanges: vi.fn(() => false)
      });

      render(<WorkOrderForm open={true} onClose={mockOnClose} />);

      expect(screen.getByTestId('submit-button')).toBeDisabled();
    });

    it('displays general error message when present', async () => {
      const { useWorkOrderForm } = await import('@/features/work-orders/hooks/useWorkOrderForm');
      
      vi.mocked(useWorkOrderForm).mockReturnValue({
        form: {
          values: { title: 'Test', description: '', priority: 'medium', equipmentId: 'eq-1', isHistorical: false },
          errors: { general: 'An error occurred' },
          isValid: true,
          setValue: vi.fn(),
          handleSubmit: vi.fn((fn) => (e: React.FormEvent) => { e.preventDefault(); fn(); }),
          reset: vi.fn()
        },
        isEditMode: false,
        checkForUnsavedChanges: vi.fn(() => false)
      });

      render(<WorkOrderForm open={true} onClose={mockOnClose} />);

      expect(screen.getByText('An error occurred')).toBeInTheDocument();
    });

    it('shows loading state when isUpdating is true', () => {
      render(<WorkOrderForm open={true} onClose={mockOnClose} workOrder={mockWorkOrder} isUpdating={true} />);

      expect(screen.getByText('Submitting...')).toBeInTheDocument();
      expect(screen.getByTestId('submit-button')).toBeDisabled();
    });
  });

  describe('unsaved changes detection', () => {
    it('prompts user when closing with unsaved changes and respects their choice', async () => {
      const { useWorkOrderForm } = await import('@/features/work-orders/hooks/useWorkOrderForm');
      
      // Test canceling close
      const mockConfirmCancel = vi.fn(() => false);
      window.confirm = mockConfirmCancel;
      
      vi.mocked(useWorkOrderForm).mockReturnValue({
        form: {
          values: { title: 'Test', description: '', priority: 'medium', equipmentId: '', isHistorical: false },
          errors: {},
          isValid: true,
          setValue: vi.fn(),
          handleSubmit: vi.fn((fn) => (e: React.FormEvent) => { e.preventDefault(); fn(); }),
          reset: vi.fn()
        },
        isEditMode: false,
        checkForUnsavedChanges: vi.fn(() => true)
      });

      const { unmount } = render(<WorkOrderForm open={true} onClose={mockOnClose} />);

      fireEvent.click(screen.getByTestId('cancel-button'));

      await waitFor(() => {
        expect(mockConfirmCancel).toHaveBeenCalledWith('You have unsaved changes. Are you sure you want to close?');
      });
      expect(mockOnClose).not.toHaveBeenCalled();
      
      unmount();

      // Test confirming close
      const mockConfirmProceed = vi.fn(() => true);
      window.confirm = mockConfirmProceed;

      render(<WorkOrderForm open={true} onClose={mockOnClose} />);

      fireEvent.click(screen.getByTestId('cancel-button'));

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });
  });

  describe('working hours warning dialog', () => {
    const setupWorkingHoursTest = async () => {
      const { useWorkOrderForm } = await import('@/features/work-orders/hooks/useWorkOrderForm');
      const { useWorkOrderSubmission } = await import('@/features/work-orders/hooks/useWorkOrderSubmission');
      
      const mockSubmitForm = vi.fn();
      
      vi.mocked(useWorkOrderForm).mockReturnValue({
        form: {
          values: { title: 'Test', description: '', priority: 'medium', equipmentId: 'eq-1', equipmentWorkingHours: undefined, isHistorical: false },
          errors: {},
          isValid: true,
          setValue: vi.fn(),
          handleSubmit: vi.fn((fn) => (e: React.FormEvent) => { e.preventDefault(); fn(); }),
          reset: vi.fn()
        },
        isEditMode: false,
        checkForUnsavedChanges: vi.fn(() => false)
      });

      vi.mocked(useWorkOrderSubmission).mockReturnValue({
        submitForm: mockSubmitForm,
        isLoading: false
      });

      return { mockSubmitForm };
    };

    it('shows warning and allows user to go back or proceed', async () => {
      const { mockSubmitForm } = await setupWorkingHoursTest();

      render(<WorkOrderForm open={true} onClose={mockOnClose} />);

      fireEvent.click(screen.getByTestId('submit-button'));

      await waitFor(() => {
        expect(screen.getByText(/Equipment Working Hours Not Updated/i)).toBeInTheDocument();
      });

      // Test going back
      fireEvent.click(screen.getByText(/Go Back & Update Hours/i));

      await waitFor(() => {
        expect(screen.queryByText(/Equipment Working Hours Not Updated/i)).not.toBeInTheDocument();
      });
      expect(mockSubmitForm).not.toHaveBeenCalled();

      // Click submit again and this time proceed
      fireEvent.click(screen.getByTestId('submit-button'));

      await waitFor(() => {
        expect(screen.getByText(/Equipment Working Hours Not Updated/i)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText(/Yes, Create Without Hours/i));

      await waitFor(() => {
        expect(mockSubmitForm).toHaveBeenCalled();
      });
    });
  });

  describe('form actions', () => {
    it('calls onClose when cancel button is clicked without unsaved changes', () => {
      render(<WorkOrderForm open={true} onClose={mockOnClose} />);

      fireEvent.click(screen.getByTestId('cancel-button'));

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('calls submission handler when submit is clicked in edit mode', async () => {
      const { useWorkOrderForm } = await import('@/features/work-orders/hooks/useWorkOrderForm');
      const { useWorkOrderSubmission } = await import('@/features/work-orders/hooks/useWorkOrderSubmission');
      const mockSubmitForm = vi.fn();
      
      vi.mocked(useWorkOrderForm).mockReturnValue({
        form: {
          values: { title: 'Test', description: '', priority: 'high', equipmentId: 'eq-1', isHistorical: false },
          errors: {},
          isValid: true,
          setValue: vi.fn(),
          handleSubmit: vi.fn((fn) => { fn(); return Promise.resolve(); }),
          reset: vi.fn()
        },
        isEditMode: true,
        checkForUnsavedChanges: vi.fn(() => false)
      });
      
      vi.mocked(useWorkOrderSubmission).mockReturnValue({
        submitForm: mockSubmitForm,
        isLoading: false
      });

      render(<WorkOrderForm open={true} onClose={mockOnClose} workOrder={mockWorkOrder} onSubmit={mockOnSubmit} />);

      fireEvent.click(screen.getByTestId('submit-button'));

      await waitFor(() => {
        expect(mockSubmitForm).toHaveBeenCalled();
      });
    });
  });
});
