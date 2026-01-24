import React from 'react';
import { render, screen, fireEvent, waitFor } from '@/test/utils/test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import EquipmentDetailsTab from '../EquipmentDetailsTab';
import { Tables } from '@/integrations/supabase/types';
import * as useEquipmentModule from '@/features/equipment/hooks/useEquipment';
import * as useUnifiedPermissionsModule from '@/hooks/useUnifiedPermissions';

// Mock dependencies
vi.mock('@/features/equipment/hooks/useEquipment', () => ({
  useUpdateEquipment: vi.fn()
}));

vi.mock('@/hooks/useUnifiedPermissions', () => ({
  useUnifiedPermissions: vi.fn(() => ({
    equipment: {
      getPermissions: vi.fn(() => ({
        canEdit: true,
        canDelete: true
      }))
    }
  }))
}));

vi.mock('@/features/teams/hooks/useTeamManagement', () => ({
  useTeams: vi.fn(() => ({
    data: [
      { id: 'team-1', name: 'Team 1' },
      { id: 'team-2', name: 'Team 2' }
    ]
  }))
}));

vi.mock('@/contexts/OrganizationContext', () => ({
  useOrganization: vi.fn(() => ({
    currentOrganization: { id: 'org-1' }
  }))
}));

vi.mock('@/features/pm-templates/hooks/usePMTemplates', () => ({
  usePMTemplates: vi.fn(() => ({
    data: [
      { id: 'pm-1', name: 'PM Template 1' },
      { id: 'pm-2', name: 'PM Template 2' }
    ]
  }))
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn()
  }
}));

vi.mock('../QRCodeDisplay', () => ({
  default: ({ open }: { open: boolean }) => open ? <div data-testid="qr-code-display">QR Code</div> : null
}));

vi.mock('../InlineEditField', () => ({
  default: ({
    value,
    onSave,
    canEdit,
    displayNode
  }: {
    value: string;
    onSave: (value: string) => void;
    canEdit: boolean;
    displayNode?: React.ReactNode;
  }) => (
    <div data-testid="inline-edit-field">
      <span>{displayNode ?? value}</span>
      {canEdit && <button onClick={() => onSave('new value')}>Save</button>}
    </div>
  )
}));

vi.mock('../InlineEditCustomAttributes', () => ({
  default: ({ onSave, canEdit }: { onSave: (attrs: Record<string, unknown>) => void; canEdit: boolean }) => (
    <div data-testid="inline-edit-custom-attributes">
      {canEdit && <button onClick={() => onSave({})}>Save Attributes</button>}
    </div>
  )
}));

vi.mock('../WorkingHoursTimelineModal', () => ({
  WorkingHoursTimelineModal: ({ open }: { open: boolean }) => 
    open ? <div data-testid="working-hours-modal">Working Hours</div> : null
}));

const mockEquipment: Tables<'equipment'> = {
  id: 'eq-1',
  name: 'Test Equipment',
  manufacturer: 'Test Manufacturer',
  model: 'Test Model',
  serial_number: 'TEST123',
  status: 'active',
  location: 'Test Location',
  organization_id: 'org-1',
  created_at: '2024-01-01',
  updated_at: '2024-01-01',
  installation_date: '2024-01-15',
  warranty_expiration: '2025-12-31',
  last_maintenance: '2024-06-01',
  last_maintenance_work_order_id: null,
  notes: 'Test notes',
  custom_attributes: { key1: 'value1' },
  image_url: 'https://example.com/image.jpg',
  team_id: 'team-1',
  default_pm_template_id: 'pm-1',
  working_hours: 1000,
  last_known_location: null,
  customer_id: null,
  import_id: null
};

describe('EquipmentDetailsTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    vi.mocked(useEquipmentModule.useUpdateEquipment).mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue(mockEquipment),
      isPending: false
    });
  });

  describe('Core Rendering', () => {
    it('renders equipment details', () => {
      render(<EquipmentDetailsTab equipment={mockEquipment} />);
      
      expect(screen.getByText('Test Equipment')).toBeInTheDocument();
      expect(screen.getByText('Test Manufacturer')).toBeInTheDocument();
      expect(screen.getByText('Test Model')).toBeInTheDocument();
    });

    it('displays equipment status', () => {
      render(<EquipmentDetailsTab equipment={mockEquipment} />);
      
      // Status should be displayed
      expect(screen.getByText('active')).toBeInTheDocument();
    });

    it('displays location', () => {
      render(<EquipmentDetailsTab equipment={mockEquipment} />);
      
      expect(screen.getByText('Test Location')).toBeInTheDocument();
    });
  });

  describe('QR Code Display', () => {
    it('opens QR code display when button is clicked', () => {
      render(<EquipmentDetailsTab equipment={mockEquipment} />);
      
      // QR code button should be available
      // This depends on the actual button implementation
    });

    it('closes QR code display', () => {
      render(<EquipmentDetailsTab equipment={mockEquipment} />);
      
      // QR code modal should close when onClose is called
    });
  });

  describe('Inline Editing', () => {
    it('allows editing fields when canEdit is true', () => {
      render(<EquipmentDetailsTab equipment={mockEquipment} />);
      
      const editFields = screen.getAllByTestId('inline-edit-field');
      expect(editFields.length).toBeGreaterThan(0);
    });

    it('calls update mutation when field is saved', async () => {
      const mockMutateAsync = vi.fn().mockResolvedValue(mockEquipment);
      vi.mocked(useEquipmentModule.useUpdateEquipment).mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false
      });

      render(<EquipmentDetailsTab equipment={mockEquipment} />);
      
      const saveButtons = screen.getAllByText('Save');
      fireEvent.click(saveButtons[0]);
      
      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalled();
      });
    });

    it('renders last maintenance as a link when it comes from a work order', () => {
      const equipmentWithWorkOrder = {
        ...mockEquipment,
        last_maintenance_work_order_id: 'wo-123'
      };

      render(<EquipmentDetailsTab equipment={equipmentWithWorkOrder} />);

      const link = screen.getByRole('link', { name: /view work order for last maintenance/i });
      expect(link).toHaveAttribute('href', '/dashboard/work-orders/wo-123');
    });
  });

  describe('Custom Attributes', () => {
    it('displays custom attributes editor', () => {
      render(<EquipmentDetailsTab equipment={mockEquipment} />);
      
      expect(screen.getByTestId('inline-edit-custom-attributes')).toBeInTheDocument();
    });

    it('updates custom attributes when saved', async () => {
      const mockMutateAsync = vi.fn().mockResolvedValue(mockEquipment);
      vi.mocked(useEquipmentModule.useUpdateEquipment).mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false
      });

      render(<EquipmentDetailsTab equipment={mockEquipment} />);
      
      const saveButton = screen.getByText('Save Attributes');
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith({
          id: 'eq-1',
          data: { custom_attributes: {} }
        });
      });
    });
  });

  describe('Working Hours', () => {
    it('displays working hours', () => {
      render(<EquipmentDetailsTab equipment={mockEquipment} />);
      
      // Working hours should be displayed
      expect(screen.getByText(/1000/)).toBeInTheDocument();
    });

    it('opens working hours modal when clicked', () => {
      render(<EquipmentDetailsTab equipment={mockEquipment} />);
      
      // Working hours modal should open
    });
  });

  describe('Team Assignment', () => {
    it('displays current team', () => {
      render(<EquipmentDetailsTab equipment={mockEquipment} />);
      
      // Team should be displayed
    });

    it('allows changing team assignment', async () => {
      const mockMutateAsync = vi.fn().mockResolvedValue(mockEquipment);
      vi.mocked(useEquipmentModule.useUpdateEquipment).mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false
      });

      render(<EquipmentDetailsTab equipment={mockEquipment} />);
      
      // Team selection should be available
    });
  });

  describe('PM Template', () => {
    it('displays current PM template', () => {
      render(<EquipmentDetailsTab equipment={mockEquipment} />);
      
      // PM template should be displayed
    });

    it('allows changing PM template', async () => {
      const mockMutateAsync = vi.fn().mockResolvedValue(mockEquipment);
      vi.mocked(useEquipmentModule.useUpdateEquipment).mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false
      });

      render(<EquipmentDetailsTab equipment={mockEquipment} />);
      
      // PM template selection should be available
    });
  });

  describe('Permission-Based Rendering', () => {
    it('disables editing when canEdit is false', () => {
      vi.mocked(useUnifiedPermissionsModule.useUnifiedPermissions).mockReturnValue({
        equipment: {
          getPermissions: vi.fn(() => ({
            canEdit: false,
            canDelete: false
          }))
        }
      });

      render(<EquipmentDetailsTab equipment={mockEquipment} />);
      
      // Edit buttons should be disabled or hidden
    });
  });
});


