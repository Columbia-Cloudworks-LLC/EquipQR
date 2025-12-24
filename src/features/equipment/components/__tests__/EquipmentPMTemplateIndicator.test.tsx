import React from 'react';
import { render, screen } from '@/test/utils/test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EquipmentPMTemplateIndicator } from '../EquipmentPMTemplateIndicator';

// Mock hooks
vi.mock('@/features/pm-templates/hooks/usePMTemplates', () => ({
  usePMTemplate: vi.fn((templateId: string) => ({
    data: templateId ? { id: templateId, name: 'Test Template' } : null,
    isLoading: false,
    error: null
  }))
}));

vi.mock('@/features/equipment/hooks/useEquipmentTemplateManagement', () => ({
  useRemoveTemplateFromEquipment: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false
  }))
}));

vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: vi.fn(() => ({
    hasRole: vi.fn(() => true)
  }))
}));

describe('EquipmentPMTemplateIndicator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders indicator when template is assigned', () => {
    render(<EquipmentPMTemplateIndicator equipmentId="eq-1" equipmentName="Test Equipment" templateId="pm-1" />);
    
    expect(screen.getByText(/Default PM Template/)).toBeInTheDocument();
    expect(screen.getByText(/Test Template/)).toBeInTheDocument();
  });

  it('handles missing template', () => {
    render(<EquipmentPMTemplateIndicator equipmentId="eq-1" equipmentName="Test Equipment" templateId={null} />);
    
    // Should render without errors (returns null when no template)
    expect(screen.queryByText(/Default PM Template/)).not.toBeInTheDocument();
  });
});
