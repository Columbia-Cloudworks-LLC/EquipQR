import React from 'react';
import { render, screen } from '@/test/utils/test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import BulkTemplateManagementDialog from '../BulkTemplateManagementDialog';

vi.mock('@/contexts/OrganizationContext', () => ({
  useOrganization: vi.fn(() => ({ currentOrganization: { id: 'org-1' } })),
}));

vi.mock('@/features/pm-templates/hooks/usePMTemplates', () => ({
  usePMTemplates: vi.fn(() => ({ data: [] })),
}));

vi.mock('@/features/equipment/hooks/useEquipmentTemplateManagement', () => ({
  useBulkAssignTemplate: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useBulkRemoveTemplates: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useBulkChangeTemplate: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
}));

describe('BulkTemplateManagementDialog', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Dialog Rendering', () => {
    it('renders when open is true', () => {
      render(
        <BulkTemplateManagementDialog 
          open={true} 
          onClose={mockOnClose} 
          selectedEquipment={[]} 
        />
      );
      
      expect(screen.getByText(/Manage PM Templates/i)).toBeInTheDocument();
    });

    it('does not render when open is false', () => {
      render(
        <BulkTemplateManagementDialog 
          open={false} 
          onClose={mockOnClose} 
          selectedEquipment={[]} 
        />
      );
      
      expect(screen.queryByText(/Manage PM Templates/i)).not.toBeInTheDocument();
    });
  });
});


