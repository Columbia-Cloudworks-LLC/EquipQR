import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, beforeEach, describe, it, expect } from 'vitest';
import { TemplateAssignmentDialog } from '../TemplateAssignmentDialog';
import { TestProviders } from '@/test/utils/TestProviders';

// Mock hooks with named imports
import { usePMTemplate } from '@/hooks/usePMTemplates';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useBulkAssignTemplate } from '@/hooks/useEquipmentTemplateManagement';
import { useEquipment } from '@/hooks/useEquipment';

vi.mock('@/hooks/usePMTemplates', () => ({
  usePMTemplate: vi.fn(),
}));

vi.mock('@/contexts/OrganizationContext', () => ({
  useOrganization: vi.fn(),
}));

vi.mock('@/components/equipment/hooks/useEquipmentTemplateManagement', () => ({
  useBulkAssignTemplate: vi.fn(),
}));

vi.mock('@/components/equipment/hooks/useEquipment', () => ({
  useEquipment: vi.fn(),
}));

const mockTemplate = {
  id: 'template-1',
  name: 'Forklift PM Template',
  description: 'Standard forklift maintenance',
  template_data: [
    {
      id: 'item-1',
      section: 'Engine',
      title: 'Check oil level',
      description: 'Verify oil is at proper level',
      condition: null,
      notes: ''
    },
    {
      id: 'item-2', 
      section: 'Safety',
      title: 'Test brakes',
      description: 'Ensure brakes function properly',
      condition: null,
      notes: ''
    }
  ]
};

const mockEquipment = [
  {
    id: 'eq-1',
    name: 'Forklift A',
    model: 'Model X',
    serial_number: 'SN001',
    status: 'active',
    default_pm_template_id: null,
    manufacturer: 'Toyota',
    location: 'Warehouse A'
  },
  {
    id: 'eq-2',
    name: 'Forklift B', 
    model: 'Model Y',
    serial_number: 'SN002',
    status: 'active',
    default_pm_template_id: 'other-template',
    manufacturer: 'Toyota',
    location: 'Warehouse B'
  }
];

const mockHooks = {
  usePMTemplate: {
    data: mockTemplate,
    isLoading: false,
    error: null,
    isError: false,
    isPending: false,
    isSuccess: true,
    status: 'success' as const,
    fetchStatus: 'idle' as const,
    refetch: vi.fn(),
    isRefetching: false,
    isLoadingError: false,
    isRefetchError: false,
    dataUpdatedAt: Date.now(),
    errorUpdatedAt: 0,
    failureCount: 0,
    failureReason: null,
    errorUpdateCount: 0,
    isFetched: true,
    isFetchedAfterMount: true,
    isFetching: false,
    isInitialLoading: false,
    isPaused: false,
    isPlaceholderData: false,
    isStale: false
  },
  useOrganization: {
    currentOrganization: { id: 'org-1', name: 'Test Org' },
    organizations: [],
    userOrganizations: [],
    setCurrentOrganization: vi.fn(),
    isLoading: false,
    error: null,
    switchToOrganization: vi.fn(),
    refreshOrganizations: vi.fn()
  },
  useEquipment: {
    data: mockEquipment,
    isLoading: false,
    error: null,
    isError: false,
    isPending: false,
    isSuccess: true,
    status: 'success' as const,
    fetchStatus: 'idle' as const,
    refetch: vi.fn(),
    isRefetching: false,
    isLoadingError: false,
    isRefetchError: false,
    dataUpdatedAt: Date.now(),
    errorUpdatedAt: 0,
    failureCount: 0,
    failureReason: null,
    errorUpdateCount: 0,
    isFetched: true,
    isFetchedAfterMount: true,
    isFetching: false,
    isInitialLoading: false,
    isPaused: false,
    isPlaceholderData: false,
    isStale: false
  },
  useBulkAssignTemplate: {
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false,
    data: undefined,
    error: null,
    isError: false,
    isSuccess: false,
    status: 'idle' as const,
    variables: undefined,
    mutate: vi.fn(),
    reset: vi.fn(),
    isIdle: true,
    context: undefined,
    failureCount: 0,
    failureReason: null,
    submittedAt: 0,
    isPaused: false
  }
};

describe('TemplateAssignmentDialog', () => {
  const defaultProps = {
    templateId: 'template-1',
    open: true,
    onClose: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup mocks using vi.mocked with proper type casting
    vi.mocked(usePMTemplate).mockReturnValue(mockHooks.usePMTemplate as unknown as ReturnType<typeof usePMTemplate>);
    vi.mocked(useOrganization).mockReturnValue(mockHooks.useOrganization as unknown as ReturnType<typeof useOrganization>);
    vi.mocked(useEquipment).mockReturnValue(mockHooks.useEquipment as unknown as ReturnType<typeof useEquipment>);
    vi.mocked(useBulkAssignTemplate).mockReturnValue(mockHooks.useBulkAssignTemplate as unknown as ReturnType<typeof useBulkAssignTemplate>);
  });

  describe('Dialog Rendering', () => {
    it('renders dialog with template name in title', () => {
      render(
        <TestProviders>
          <TemplateAssignmentDialog {...defaultProps} />
        </TestProviders>
      );

      expect(screen.getByText('Assign Default PM Template: Forklift PM Template')).toBeInTheDocument();
    });

    it('does not render when closed', () => {
      render(
        <TestProviders>
          <TemplateAssignmentDialog {...defaultProps} open={false} />
        </TestProviders>
      );

      expect(screen.queryByText('Assign Default PM Template')).not.toBeInTheDocument();
    });

    it('shows template description', () => {
      render(
        <TestProviders>
          <TemplateAssignmentDialog {...defaultProps} />
        </TestProviders>
      );

      expect(screen.getByText(/Set this template as the default PM procedure/)).toBeInTheDocument();
    });

    it('displays equipment list', () => {
      render(
        <TestProviders>
          <TemplateAssignmentDialog {...defaultProps} />
        </TestProviders>
      );

      expect(screen.getByText('Forklift A')).toBeInTheDocument();
      expect(screen.getByText('Forklift B')).toBeInTheDocument();
    });
  });

  describe('Equipment Search and Filtering', () => {
    it('filters equipment by search query', async () => {
      render(
        <TestProviders>
          <TemplateAssignmentDialog {...defaultProps} />
        </TestProviders>
      );

      const searchInput = screen.getByPlaceholderText('Search by name, model, or serial number...');
      fireEvent.change(searchInput, { target: { value: 'Forklift A' } });

      await waitFor(() => {
        expect(screen.getByText('Forklift A')).toBeInTheDocument();
        expect(screen.queryByText('Forklift B')).not.toBeInTheDocument();
      });
    });

    it('filters by model number', async () => {
      render(
        <TestProviders>
          <TemplateAssignmentDialog {...defaultProps} />
        </TestProviders>
      );

      const searchInput = screen.getByPlaceholderText('Search by name, model, or serial number...');
      fireEvent.change(searchInput, { target: { value: 'Model X' } });

      await waitFor(() => {
        expect(screen.getByText('Forklift A')).toBeInTheDocument();
        expect(screen.queryByText('Forklift B')).not.toBeInTheDocument();
      });
    });

    it('filters by serial number', async () => {
      render(
        <TestProviders>
          <TemplateAssignmentDialog {...defaultProps} />
        </TestProviders>
      );

      const searchInput = screen.getByPlaceholderText('Search by name, model, or serial number...');
      fireEvent.change(searchInput, { target: { value: 'SN002' } });

      await waitFor(() => {
        expect(screen.queryByText('Forklift A')).not.toBeInTheDocument();
        expect(screen.getByText('Forklift B')).toBeInTheDocument();
      });
    });
  });

  describe('Equipment Selection', () => {
    it('handles individual equipment selection', () => {
      render(
        <TestProviders>
          <TemplateAssignmentDialog {...defaultProps} />
        </TestProviders>
      );

      const checkbox = screen.getAllByRole('checkbox')[1]; // First equipment checkbox
      fireEvent.click(checkbox);

      expect(checkbox).toBeChecked();
    });

    it('handles select all functionality', () => {
      render(
        <TestProviders>
          <TemplateAssignmentDialog {...defaultProps} />
        </TestProviders>
      );

      const selectAllCheckbox = screen.getAllByRole('checkbox')[0];
      fireEvent.click(selectAllCheckbox);

      const equipmentCheckboxes = screen.getAllByRole('checkbox').slice(1);
      equipmentCheckboxes.forEach(checkbox => {
        expect(checkbox).toBeChecked();
      });
    });

    it('updates select all state when individual items are selected', () => {
      render(
        <TestProviders>
          <TemplateAssignmentDialog {...defaultProps} />
        </TestProviders>
      );

      const selectAllCheckbox = screen.getAllByRole('checkbox')[0];
      const equipmentCheckboxes = screen.getAllByRole('checkbox').slice(1);

      // Select all individual items
      equipmentCheckboxes.forEach(checkbox => {
        fireEvent.click(checkbox);
      });

      expect(selectAllCheckbox).toBeChecked();
    });

    it('shows selected equipment count', () => {
      render(
        <TestProviders>
          <TemplateAssignmentDialog {...defaultProps} />
        </TestProviders>
      );

      const checkbox = screen.getAllByRole('checkbox')[1];
      fireEvent.click(checkbox);

      expect(screen.getByText('1 of 2 visible equipment selected')).toBeInTheDocument();
    });
  });

  describe('Template Assignment', () => {
    it('assigns template to selected equipment', async () => {
      render(
        <TestProviders>
          <TemplateAssignmentDialog {...defaultProps} />
        </TestProviders>
      );

      // Select equipment
      const checkbox = screen.getAllByRole('checkbox')[1];
      fireEvent.click(checkbox);

      // Click assign template
      const assignButton = screen.getByText(/Assign Template to 1 Equipment/);
      fireEvent.click(assignButton);

      await waitFor(() => {
        expect(mockHooks.useBulkAssignTemplate.mutateAsync).toHaveBeenCalledWith({
          equipmentIds: ['eq-1'],
          templateId: 'template-1'
        });
      });
    });

    it('disables assign button when no equipment selected', () => {
      render(
        <TestProviders>
          <TemplateAssignmentDialog {...defaultProps} />
        </TestProviders>
      );

      const assignButton = screen.getByText(/Assign Template to 0 Equipment/);
      expect(assignButton).toBeDisabled();
    });

    it('shows loading state during assignment', async () => {
      vi.mocked(useBulkAssignTemplate).mockReturnValue({
        ...mockHooks.useBulkAssignTemplate,
        isPending: true,
        status: 'pending'
      } as unknown as ReturnType<typeof useBulkAssignTemplate>);

      render(
        <TestProviders>
          <TemplateAssignmentDialog {...defaultProps} />
        </TestProviders>
      );

      const checkbox = screen.getAllByRole('checkbox')[1];
      fireEvent.click(checkbox);

      const assignButton = screen.getByText(/Assign Template to 1 Equipment/);
      expect(assignButton).toBeDisabled();
    });

    it('calls onClose after successful assignment', async () => {
      render(
        <TestProviders>
          <TemplateAssignmentDialog {...defaultProps} />
        </TestProviders>
      );

      const checkbox = screen.getAllByRole('checkbox')[1];
      fireEvent.click(checkbox);

      const assignButton = screen.getByText(/Assign Template to 1 Equipment/);
      fireEvent.click(assignButton);

      await waitFor(() => {
        expect(defaultProps.onClose).toHaveBeenCalled();
      });
    });
  });

  describe('Loading States', () => {
    it('shows loading state when template is loading', () => {
      vi.mocked(usePMTemplate).mockReturnValue({
        ...mockHooks.usePMTemplate,
        data: null,
        isLoading: true,
        isSuccess: false,
        status: 'pending'
      } as unknown as ReturnType<typeof usePMTemplate>);

      render(
        <TestProviders>
          <TemplateAssignmentDialog {...defaultProps} />
        </TestProviders>
      );

      // Template loading should return null and not render the dialog
      expect(screen.queryByText('Assign Default PM Template')).not.toBeInTheDocument();
    });

    it('shows loading state when equipment is loading', () => {
      vi.mocked(useEquipment).mockReturnValue({
        ...mockHooks.useEquipment,
        data: [],
        isLoading: true,
        isSuccess: false,
        status: 'pending'
      } as unknown as ReturnType<typeof useEquipment>);

      render(
        <TestProviders>
          <TemplateAssignmentDialog {...defaultProps} />
        </TestProviders>
      );

      expect(screen.getByText('0 of 0 visible equipment selected')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('handles template not found', () => {
      vi.mocked(usePMTemplate).mockReturnValue({
        ...mockHooks.usePMTemplate,
        data: undefined,
        isLoading: false,
        isSuccess: true,
        status: 'success'
      } as unknown as ReturnType<typeof usePMTemplate>);

      render(
        <TestProviders>
          <TemplateAssignmentDialog {...defaultProps} />
        </TestProviders>
      );

      // Should not render when template is not found
      expect(screen.queryByText('Assign Default PM Template')).not.toBeInTheDocument();
    });

    it('handles no equipment available', () => {
      vi.mocked(useEquipment).mockReturnValue({
        ...mockHooks.useEquipment,
        data: [],
        isLoading: false,
        isSuccess: true,
        status: 'success'
      } as unknown as ReturnType<typeof useEquipment>);

      render(
        <TestProviders>
          <TemplateAssignmentDialog {...defaultProps} />
        </TestProviders>
      );

      expect(screen.getByText('0 of 0 visible equipment selected')).toBeInTheDocument();
    });
  });
});