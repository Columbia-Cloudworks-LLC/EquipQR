import React from 'react';
import { render, screen, fireEvent, waitFor } from '@/test/utils/test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import EquipmentDetailsTab from '../EquipmentDetailsTab';
import { Tables } from '@/integrations/supabase/types';
import * as useEquipmentModule from '@/features/equipment/hooks/useEquipment';
import * as useUnifiedPermissionsModule from '@/hooks/useUnifiedPermissions';
import { personas } from '@/test/fixtures/personas';
import { equipment as eqFixtures, organizations, teams as teamFixtures } from '@/test/fixtures/entities';

// ============================================
// Mocks
// ============================================

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
      { id: teamFixtures.maintenance.id, name: teamFixtures.maintenance.name },
      { id: teamFixtures.field.id, name: teamFixtures.field.name }
    ]
  }))
}));

vi.mock('@/contexts/OrganizationContext', () => ({
  useOrganization: vi.fn(() => ({
    currentOrganization: { id: organizations.acme.id }
  }))
}));

vi.mock('@/features/pm-templates/hooks/usePMTemplates', () => ({
  usePMTemplates: vi.fn(() => ({
    data: [
      { id: 'pm-forklift', name: 'Forklift PM Checklist' },
      { id: 'pm-crane', name: 'Overhead Crane Inspection' }
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

vi.mock('@/hooks/useGoogleMapsLoader', () => ({
  useGoogleMapsLoader: vi.fn(() => ({
    isLoaded: false
  }))
}));

// ============================================
// Equipment entity based on fixture data
// ============================================

const forkliftEquipment: Tables<'equipment'> = {
  id: eqFixtures.forklift1.id,
  name: eqFixtures.forklift1.name,
  manufacturer: eqFixtures.forklift1.manufacturer,
  model: eqFixtures.forklift1.model,
  serial_number: eqFixtures.forklift1.serial_number,
  status: eqFixtures.forklift1.status,
  location: eqFixtures.forklift1.location ?? null,
  organization_id: eqFixtures.forklift1.organization_id,
  created_at: '2024-01-01',
  updated_at: '2024-01-01',
  installation_date: '2024-01-15',
  warranty_expiration: '2025-12-31',
  last_maintenance: '2024-06-01',
  last_maintenance_work_order_id: null,
  notes: eqFixtures.forklift1.notes ?? null,
  custom_attributes: eqFixtures.forklift1.custom_attributes ?? null,
  image_url: null,
  team_id: eqFixtures.forklift1.team_id,
  default_pm_template_id: eqFixtures.forklift1.default_pm_template_id ?? null,
  working_hours: 1000,
  last_known_location: null,
  customer_id: null,
  import_id: null,
  assigned_location_street: 'Warehouse A',
  assigned_location_city: null,
  assigned_location_state: null,
  assigned_location_country: null,
  assigned_location_lat: 40.7128,
  assigned_location_lng: -74.006
};

// ============================================
// Helpers
// ============================================

function setupPermissions(canEdit: boolean, canDelete: boolean) {
  vi.mocked(useUnifiedPermissionsModule.useUnifiedPermissions).mockReturnValue({
    equipment: {
      getPermissions: vi.fn(() => ({ canEdit, canDelete }))
    }
  });
}

// ============================================
// Persona-Driven Tests
// ============================================

describe('EquipmentDetailsTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useEquipmentModule.useUpdateEquipment).mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue(forkliftEquipment),
      isPending: false
    });
  });

  // --------------------------------------------------------
  // Bob Admin — full edit access to equipment details
  // --------------------------------------------------------
  describe(`as ${personas.admin.name} (admin with full edit access)`, () => {
    beforeEach(() => {
      setupPermissions(true, true);
    });

    it('shows equipment name, manufacturer, and model', () => {
      render(<EquipmentDetailsTab equipment={forkliftEquipment} />);

      expect(screen.getByText(eqFixtures.forklift1.name)).toBeInTheDocument();
      expect(screen.getByText(eqFixtures.forklift1.manufacturer)).toBeInTheDocument();
      expect(screen.getByText(eqFixtures.forklift1.model)).toBeInTheDocument();
    });

    it('shows equipment status', () => {
      render(<EquipmentDetailsTab equipment={forkliftEquipment} />);
      expect(screen.getByText('active')).toBeInTheDocument();
    });

    it('shows equipment location', () => {
      render(<EquipmentDetailsTab equipment={forkliftEquipment} />);
      expect(screen.getByText('Warehouse A')).toBeInTheDocument();
    });

    it('renders inline edit fields with save buttons', () => {
      render(<EquipmentDetailsTab equipment={forkliftEquipment} />);

      const editFields = screen.getAllByTestId('inline-edit-field');
      expect(editFields.length).toBeGreaterThan(0);

      // Admin can see Save buttons
      const saveButtons = screen.getAllByText('Save');
      expect(saveButtons.length).toBeGreaterThan(0);
    });

    it('calls update mutation when a field is saved', async () => {
      const mockMutateAsync = vi.fn().mockResolvedValue(forkliftEquipment);
      vi.mocked(useEquipmentModule.useUpdateEquipment).mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false
      });

      render(<EquipmentDetailsTab equipment={forkliftEquipment} />);

      const saveButtons = screen.getAllByText('Save');
      fireEvent.click(saveButtons[0]);

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalled();
      });
    });

    it('shows custom attributes editor with save option', () => {
      render(<EquipmentDetailsTab equipment={forkliftEquipment} />);

      expect(screen.getByTestId('inline-edit-custom-attributes')).toBeInTheDocument();
      expect(screen.getByText('Save Attributes')).toBeInTheDocument();
    });

    it('updates custom attributes when saved', async () => {
      const mockMutateAsync = vi.fn().mockResolvedValue(forkliftEquipment);
      vi.mocked(useEquipmentModule.useUpdateEquipment).mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false
      });

      render(<EquipmentDetailsTab equipment={forkliftEquipment} />);
      fireEvent.click(screen.getByText('Save Attributes'));

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith({
          id: eqFixtures.forklift1.id,
          data: { custom_attributes: {} }
        });
      });
    });

    it('displays working hours', () => {
      render(<EquipmentDetailsTab equipment={forkliftEquipment} />);
      expect(screen.getByText(/1000/)).toBeInTheDocument();
    });

    it('renders last maintenance as a link when sourced from a work order', () => {
      const eqWithWO = { ...forkliftEquipment, last_maintenance_work_order_id: 'wo-123' };
      render(<EquipmentDetailsTab equipment={eqWithWO} />);

      const link = screen.getByRole('link', { name: /view work order for last maintenance/i });
      expect(link).toHaveAttribute('href', '/dashboard/work-orders/wo-123');
    });
  });

  // --------------------------------------------------------
  // Grace Viewer — read-only, cannot edit
  // --------------------------------------------------------
  describe(`as ${personas.viewer.name} (viewer with read-only access)`, () => {
    beforeEach(() => {
      setupPermissions(false, false);
    });

    it('shows equipment details in read-only mode', () => {
      render(<EquipmentDetailsTab equipment={forkliftEquipment} />);

      expect(screen.getByText(eqFixtures.forklift1.name)).toBeInTheDocument();
      expect(screen.getByText(eqFixtures.forklift1.manufacturer)).toBeInTheDocument();
    });

    it('does NOT show Save buttons on inline edit fields', () => {
      render(<EquipmentDetailsTab equipment={forkliftEquipment} />);

      // Inline edit fields are rendered but without Save buttons
      expect(screen.queryAllByText('Save')).toHaveLength(0);
    });

    it('does NOT show Save Attributes button', () => {
      render(<EquipmentDetailsTab equipment={forkliftEquipment} />);

      expect(screen.queryByText('Save Attributes')).not.toBeInTheDocument();
    });
  });

  // --------------------------------------------------------
  // Edge case: equipment without custom attributes
  // --------------------------------------------------------
  describe('when equipment has no custom attributes', () => {
    it('renders the attributes editor (empty state)', () => {
      const eqWithoutAttrs = { ...forkliftEquipment, custom_attributes: null };
      setupPermissions(true, true);

      render(<EquipmentDetailsTab equipment={eqWithoutAttrs} />);
      expect(screen.getByTestId('inline-edit-custom-attributes')).toBeInTheDocument();
    });
  });
});
