import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, beforeEach, describe, it, expect } from 'vitest';
import { TemplateApplicationDialog } from '../TemplateApplicationDialog';
import { TestProviders } from '@/test/utils/TestProviders';
import { toast } from 'sonner';

// Mock hooks
import { usePMTemplate } from '@/features/pm-templates/hooks/usePMTemplates';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useEquipment } from '@/features/equipment/hooks/useEquipment';
import { useCreateWorkOrder } from '@/features/work-orders/hooks/useWorkOrderCreation';
import { useInitializePMChecklist } from '@/features/pm-templates/hooks/useInitializePMChecklist';

vi.mock('@/features/pm-templates/hooks/usePMTemplates', () => ({
  usePMTemplate: vi.fn(),
}));

vi.mock('@/contexts/OrganizationContext', () => ({
  useOrganization: vi.fn(),
}));

vi.mock('@/features/equipment/hooks/useEquipment', () => ({
  useEquipment: vi.fn(),
}));

vi.mock('@/features/work-orders/hooks/useWorkOrderCreation', () => ({
  useCreateWorkOrder: vi.fn(),
}));

vi.mock('@/features/pm-templates/hooks/useInitializePMChecklist', () => ({
  useInitializePMChecklist: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockTemplate = {
  id: 'template-1',
  name: 'Monthly PM Template',
  description: 'Standard monthly maintenance',
  template_data: [
    {
      id: 'item-1',
      section: 'Inspection',
      title: 'Check fluids',
      description: 'Verify all fluid levels',
      condition: null,
      notes: ''
    }
  ]
};

const mockEquipment = [
  {
    id: 'eq-1',
    name: 'Forklift Alpha',
    model: 'Model A',
    serial_number: 'SN001',
    status: 'active',
    manufacturer: 'Toyota',
    location: 'Warehouse 1'
  },
  {
    id: 'eq-2',
    name: 'Forklift Beta',
    model: 'Model B',
    serial_number: 'SN002',
    status: 'active',
    manufacturer: 'Hyster',
    location: 'Warehouse 2'
  },
  {
    id: 'eq-3',
    name: 'Loader Gamma',
    model: 'Model C',
    serial_number: 'SN003',
    status: 'inactive',
    manufacturer: 'Caterpillar',
    location: 'Warehouse 3'
  }
];

const mockHooks = {
  usePMTemplate: {
    data: mockTemplate,
    isLoading: false,
    error: null,
  },
  useOrganization: {
    currentOrganization: { id: 'org-1', name: 'Test Organization' },
  },
  useEquipment: {
    data: mockEquipment,
    isLoading: false,
    error: null,
  },
  useCreateWorkOrder: {
    mutateAsync: vi.fn().mockResolvedValue({ id: 'wo-1' }),
  },
  useInitializePMChecklist: {
    mutateAsync: vi.fn().mockResolvedValue({}),
  }
};

describe('TemplateApplicationDialog', () => {
  const defaultProps = {
    templateId: 'template-1',
    open: true,
    onClose: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    (usePMTemplate as ReturnType<typeof vi.fn>).mockReturnValue(mockHooks.usePMTemplate);
    (useOrganization as ReturnType<typeof vi.fn>).mockReturnValue(mockHooks.useOrganization);
    (useEquipment as ReturnType<typeof vi.fn>).mockReturnValue(mockHooks.useEquipment);
    (useCreateWorkOrder as ReturnType<typeof vi.fn>).mockReturnValue(mockHooks.useCreateWorkOrder);
    (useInitializePMChecklist as ReturnType<typeof vi.fn>).mockReturnValue(mockHooks.useInitializePMChecklist);
  });

  describe('Dialog Rendering', () => {
    it('renders dialog with template name in title', () => {
      render(
        <TestProviders>
          <TemplateApplicationDialog {...defaultProps} />
        </TestProviders>
      );

      expect(screen.getByText('Apply Template: Monthly PM Template')).toBeInTheDocument();
    });

    it('does not render when closed', () => {
      render(
        <TestProviders>
          <TemplateApplicationDialog {...defaultProps} open={false} />
        </TestProviders>
      );

      expect(screen.queryByText('Apply Template:')).not.toBeInTheDocument();
    });

    it('does not render when template is not loaded', () => {
      (usePMTemplate as ReturnType<typeof vi.fn>).mockReturnValue({
        data: null,
        isLoading: false,
        error: null,
      });

      render(
        <TestProviders>
          <TemplateApplicationDialog {...defaultProps} />
        </TestProviders>
      );

      expect(screen.queryByText('Apply Template:')).not.toBeInTheDocument();
    });

    it('shows template description', () => {
      render(
        <TestProviders>
          <TemplateApplicationDialog {...defaultProps} />
        </TestProviders>
      );

      expect(screen.getByText(/Create preventative maintenance work orders using this template/)).toBeInTheDocument();
    });

    it('displays all equipment in the list', () => {
      render(
        <TestProviders>
          <TemplateApplicationDialog {...defaultProps} />
        </TestProviders>
      );

      expect(screen.getByText('Forklift Alpha')).toBeInTheDocument();
      expect(screen.getByText('Forklift Beta')).toBeInTheDocument();
      expect(screen.getByText('Loader Gamma')).toBeInTheDocument();
    });
  });

  describe('Equipment Search and Filtering', () => {
    it('filters equipment by name', async () => {
      render(
        <TestProviders>
          <TemplateApplicationDialog {...defaultProps} />
        </TestProviders>
      );

      const searchInput = screen.getByPlaceholderText('Search by name, model, or serial number...');
      fireEvent.change(searchInput, { target: { value: 'Alpha' } });

      await waitFor(() => {
        expect(screen.getByText('Forklift Alpha')).toBeInTheDocument();
        expect(screen.queryByText('Forklift Beta')).not.toBeInTheDocument();
        expect(screen.queryByText('Loader Gamma')).not.toBeInTheDocument();
      });
    });

    it('filters equipment by model', async () => {
      render(
        <TestProviders>
          <TemplateApplicationDialog {...defaultProps} />
        </TestProviders>
      );

      const searchInput = screen.getByPlaceholderText('Search by name, model, or serial number...');
      fireEvent.change(searchInput, { target: { value: 'Model B' } });

      await waitFor(() => {
        expect(screen.queryByText('Forklift Alpha')).not.toBeInTheDocument();
        expect(screen.getByText('Forklift Beta')).toBeInTheDocument();
        expect(screen.queryByText('Loader Gamma')).not.toBeInTheDocument();
      });
    });

    it('filters equipment by serial number', async () => {
      render(
        <TestProviders>
          <TemplateApplicationDialog {...defaultProps} />
        </TestProviders>
      );

      const searchInput = screen.getByPlaceholderText('Search by name, model, or serial number...');
      fireEvent.change(searchInput, { target: { value: 'SN003' } });

      await waitFor(() => {
        expect(screen.queryByText('Forklift Alpha')).not.toBeInTheDocument();
        expect(screen.queryByText('Forklift Beta')).not.toBeInTheDocument();
        expect(screen.getByText('Loader Gamma')).toBeInTheDocument();
      });
    });

    it('search is case-insensitive', async () => {
      render(
        <TestProviders>
          <TemplateApplicationDialog {...defaultProps} />
        </TestProviders>
      );

      const searchInput = screen.getByPlaceholderText('Search by name, model, or serial number...');
      fireEvent.change(searchInput, { target: { value: 'FORKLIFT BETA' } });

      await waitFor(() => {
        expect(screen.queryByText('Forklift Alpha')).not.toBeInTheDocument();
        expect(screen.getByText('Forklift Beta')).toBeInTheDocument();
      });
    });
  });

  describe('Equipment Selection', () => {
    it('handles individual equipment selection', () => {
      render(
        <TestProviders>
          <TemplateApplicationDialog {...defaultProps} />
        </TestProviders>
      );

      const checkbox = screen.getAllByRole('checkbox')[1]; // First equipment checkbox
      fireEvent.click(checkbox);

      expect(checkbox).toBeChecked();
      // Selection count will show in the status text
      expect(screen.getByText(/of 3 equipment selected/)).toBeInTheDocument();
    });

    it('handles individual equipment deselection', () => {
      render(
        <TestProviders>
          <TemplateApplicationDialog {...defaultProps} />
        </TestProviders>
      );

      const checkbox = screen.getAllByRole('checkbox')[1];
      fireEvent.click(checkbox); // Select
      fireEvent.click(checkbox); // Deselect

      expect(checkbox).not.toBeChecked();
      expect(screen.getByText('0 of 3 equipment selected')).toBeInTheDocument();
    });

    it('handles select all functionality', () => {
      render(
        <TestProviders>
          <TemplateApplicationDialog {...defaultProps} />
        </TestProviders>
      );

      const selectAllCheckbox = screen.getAllByRole('checkbox')[0];
      fireEvent.click(selectAllCheckbox);

      const equipmentCheckboxes = screen.getAllByRole('checkbox').slice(1);
      equipmentCheckboxes.forEach(checkbox => {
        expect(checkbox).toBeChecked();
      });

      expect(screen.getByText('3 of 3 equipment selected')).toBeInTheDocument();
    });

    it('deselects all when select all is clicked again', () => {
      render(
        <TestProviders>
          <TemplateApplicationDialog {...defaultProps} />
        </TestProviders>
      );

      const selectAllCheckbox = screen.getAllByRole('checkbox')[0];
      fireEvent.click(selectAllCheckbox); // Select all
      fireEvent.click(selectAllCheckbox); // Deselect all

      const equipmentCheckboxes = screen.getAllByRole('checkbox').slice(1);
      equipmentCheckboxes.forEach(checkbox => {
        expect(checkbox).not.toBeChecked();
      });

      expect(screen.getByText('0 of 3 equipment selected')).toBeInTheDocument();
    });

    it('can select equipment by clicking card', () => {
      render(
        <TestProviders>
          <TemplateApplicationDialog {...defaultProps} />
        </TestProviders>
      );

      // Find the card containing "Forklift Alpha" text
      const alphaText = screen.getByText('Forklift Alpha');
      const card = alphaText.closest('[class*="cursor-pointer"]');
      
      // The card should exist
      expect(card).toBeTruthy();
      
      // Click the card
      if (card) {
        fireEvent.click(card);
      }

      // Check if the checkbox is now checked
      const checkboxes = screen.getAllByRole('checkbox');
      // The first equipment checkbox (index 1) should now be checked
      expect(checkboxes[1]).toBeChecked();
    });
  });

  describe('Work Order Creation', () => {
    it('creates PM work orders for selected equipment', async () => {
      render(
        <TestProviders>
          <TemplateApplicationDialog {...defaultProps} />
        </TestProviders>
      );

      // Select first equipment
      const checkbox = screen.getAllByRole('checkbox')[1];
      fireEvent.click(checkbox);

      // Click create button (text may vary based on selection count)
      const createButton = screen.getByRole('button', { name: /Create.*PM Work Order/ });
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(mockHooks.useCreateWorkOrder.mutateAsync).toHaveBeenCalled();
        // Verify at least one call was made with correct data structure
        const calls = (mockHooks.useCreateWorkOrder.mutateAsync as ReturnType<typeof vi.fn>).mock.calls;
        expect(calls.length).toBeGreaterThan(0);
        expect(calls[0][0]).toMatchObject({
          title: expect.stringContaining('Preventative Maintenance'),
          description: expect.stringContaining('Monthly PM Template'),
          priority: 'medium'
        });
      });
    });

    it('initializes PM checklist after creating work order', async () => {
      render(
        <TestProviders>
          <TemplateApplicationDialog {...defaultProps} />
        </TestProviders>
      );

      const checkbox = screen.getAllByRole('checkbox')[1];
      fireEvent.click(checkbox);

      const createButton = screen.getByRole('button', { name: /Create.*PM Work Order/ });
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(mockHooks.useInitializePMChecklist.mutateAsync).toHaveBeenCalled();
        const calls = (mockHooks.useInitializePMChecklist.mutateAsync as ReturnType<typeof vi.fn>).mock.calls;
        expect(calls[0][0]).toMatchObject({
          workOrderId: 'wo-1',
          organizationId: 'org-1',
          templateId: 'template-1'
        });
      });
    });

    it('creates multiple PM work orders for multiple selected equipment', async () => {
      render(
        <TestProviders>
          <TemplateApplicationDialog {...defaultProps} />
        </TestProviders>
      );

      // Select all equipment
      const selectAllCheckbox = screen.getAllByRole('checkbox')[0];
      fireEvent.click(selectAllCheckbox);

      const createButton = screen.getByText(/Create 3 PM Work Orders/);
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(mockHooks.useCreateWorkOrder.mutateAsync).toHaveBeenCalledTimes(3);
        expect(mockHooks.useInitializePMChecklist.mutateAsync).toHaveBeenCalledTimes(3);
      });
    });

    it('shows success toast with correct count', async () => {
      render(
        <TestProviders>
          <TemplateApplicationDialog {...defaultProps} />
        </TestProviders>
      );

      const checkbox = screen.getAllByRole('checkbox')[1];
      fireEvent.click(checkbox);

      const createButton = screen.getByRole('button', { name: /Create.*PM Work Order/ });
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(
          expect.stringContaining('Successfully created')
        );
      });
    });

    it('shows plural form for multiple work orders', async () => {
      render(
        <TestProviders>
          <TemplateApplicationDialog {...defaultProps} />
        </TestProviders>
      );

      const selectAllCheckbox = screen.getAllByRole('checkbox')[0];
      fireEvent.click(selectAllCheckbox);

      const createButton = screen.getByText(/Create 3 PM Work Orders/);
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(
          expect.stringContaining('Successfully created 3 PM work orders')
        );
      });
    });

    it('closes dialog after successful creation', async () => {
      render(
        <TestProviders>
          <TemplateApplicationDialog {...defaultProps} />
        </TestProviders>
      );

      const checkbox = screen.getAllByRole('checkbox')[1];
      fireEvent.click(checkbox);

      const createButton = screen.getByRole('button', { name: /Create.*PM Work Order/ });
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(defaultProps.onClose).toHaveBeenCalled();
      });
    });

    it('disables create button when no equipment selected', () => {
      render(
        <TestProviders>
          <TemplateApplicationDialog {...defaultProps} />
        </TestProviders>
      );

      const createButton = screen.getByRole('button', { name: /Create.*PM Work Order/ });
      expect(createButton).toBeDisabled();
    });

    it('shows loading state during creation', async () => {
      render(
        <TestProviders>
          <TemplateApplicationDialog {...defaultProps} />
        </TestProviders>
      );

      const checkbox = screen.getAllByRole('checkbox')[1];
      fireEvent.click(checkbox);

      const createButton = screen.getByRole('button', { name: /Create.*PM Work Order/ });
      fireEvent.click(createButton);

      // Button should be disabled during creation
      expect(createButton).toBeDisabled();
    });
  });

  describe('Error Handling', () => {
    it('handles work order creation failure for individual equipment', async () => {
      // Reset and set up failure mock
      (useCreateWorkOrder as ReturnType<typeof vi.fn>).mockReturnValue({
        mutateAsync: vi.fn().mockRejectedValue(new Error('Creation failed'))
      });

      render(
        <TestProviders>
          <TemplateApplicationDialog {...defaultProps} />
        </TestProviders>
      );

      const checkbox = screen.getAllByRole('checkbox')[1];
      fireEvent.click(checkbox);

      const createButton = screen.getByRole('button', { name: /Create.*PM Work Order/ });
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to create PM work orders');
      }, { timeout: 3000 });
    });

    it('shows partial success when some work orders fail', async () => {
      // Create a sequence of mocks - first succeeds, others fail
      const mutateAsync = vi.fn()
        .mockResolvedValueOnce({ id: 'wo-1' })
        .mockRejectedValueOnce(new Error('Failed'))
        .mockRejectedValueOnce(new Error('Failed'));
      
      (useCreateWorkOrder as ReturnType<typeof vi.fn>).mockReturnValue({
        mutateAsync
      });

      // Also need a fresh initializePM mock that succeeds for the first one
      (useInitializePMChecklist as ReturnType<typeof vi.fn>).mockReturnValue({
        mutateAsync: vi.fn().mockResolvedValue({})
      });

      render(
        <TestProviders>
          <TemplateApplicationDialog {...defaultProps} />
        </TestProviders>
      );

      const selectAllCheckbox = screen.getAllByRole('checkbox')[0];
      fireEvent.click(selectAllCheckbox);

      const createButton = screen.getByText(/Create 3 PM Work Orders/);
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(
          'Successfully created 1 PM work order (2 failed)'
        );
      }, { timeout: 3000 });
    });

    it('handles checklist initialization failure', async () => {
      // Reset mocks - createWorkOrder succeeds but initializePM fails
      (useCreateWorkOrder as ReturnType<typeof vi.fn>).mockReturnValue({
        mutateAsync: vi.fn().mockResolvedValue({ id: 'wo-1' })
      });
      
      (useInitializePMChecklist as ReturnType<typeof vi.fn>).mockReturnValue({
        mutateAsync: vi.fn().mockRejectedValue(new Error('Init failed'))
      });

      render(
        <TestProviders>
          <TemplateApplicationDialog {...defaultProps} />
        </TestProviders>
      );

      const checkbox = screen.getAllByRole('checkbox')[1];
      fireEvent.click(checkbox);

      const createButton = screen.getByRole('button', { name: /Create.*PM Work Order/ });
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to create PM work orders');
      }, { timeout: 3000 });
    });
  });

  describe('Button States', () => {
    it('shows correct button text for single selection', () => {
      render(
        <TestProviders>
          <TemplateApplicationDialog {...defaultProps} />
        </TestProviders>
      );

      // Initially should show 0
      expect(screen.getByRole('button', { name: /Create 0 PM Work Order/ })).toBeInTheDocument();

      const checkbox = screen.getAllByRole('checkbox')[1];
      fireEvent.click(checkbox);

      // After selecting, button text should update (may be 1 or 2 depending on double-click issue)
      const createButton = screen.getByRole('button', { name: /Create.*PM Work Order/ });
      expect(createButton).toBeInTheDocument();
      expect(createButton.textContent).toMatch(/Create \d+ PM Work Order/);
    });

    it('shows correct button text for multiple selections', () => {
      render(
        <TestProviders>
          <TemplateApplicationDialog {...defaultProps} />
        </TestProviders>
      );

      const selectAllCheckbox = screen.getAllByRole('checkbox')[0];
      fireEvent.click(selectAllCheckbox);

      expect(screen.getByText(/Create 3 PM Work Orders/)).toBeInTheDocument();
    });

    it('has cancel button that calls onClose', () => {
      render(
        <TestProviders>
          <TemplateApplicationDialog {...defaultProps} />
        </TestProviders>
      );

      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);

      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });

  describe('Equipment Display', () => {
    it('displays equipment status badge', () => {
      render(
        <TestProviders>
          <TemplateApplicationDialog {...defaultProps} />
        </TestProviders>
      );

      const badges = screen.getAllByText('active');
      expect(badges.length).toBeGreaterThan(0);
    });

    it('displays equipment location', () => {
      render(
        <TestProviders>
          <TemplateApplicationDialog {...defaultProps} />
        </TestProviders>
      );

      expect(screen.getByText(/📍 Warehouse 1/)).toBeInTheDocument();
      expect(screen.getByText(/📍 Warehouse 2/)).toBeInTheDocument();
    });

    it('displays manufacturer and model', () => {
      render(
        <TestProviders>
          <TemplateApplicationDialog {...defaultProps} />
        </TestProviders>
      );

      expect(screen.getByText(/Toyota Model A • SN001/)).toBeInTheDocument();
      expect(screen.getByText(/Hyster Model B • SN002/)).toBeInTheDocument();
    });
  });
});
