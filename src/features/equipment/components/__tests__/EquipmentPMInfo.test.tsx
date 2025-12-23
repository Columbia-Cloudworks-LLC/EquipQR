import React from 'react';
import { render, screen } from '@/test/utils/test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import EquipmentPMInfo from '../EquipmentPMInfo';

// Mock hooks
vi.mock('@/features/pm-templates/hooks/usePMTemplates', () => ({
  usePMTemplates: vi.fn(() => ({
    data: [{ id: 'pm-1', name: 'PM Template 1' }]
  }))
}));

const mockEquipment = {
  id: 'eq-1',
  default_pm_template_id: 'pm-1'
};

describe('EquipmentPMInfo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Core Rendering', () => {
    it('renders PM template information', () => {
      render(<EquipmentPMInfo equipment={mockEquipment as any} />);
      
      // PM info should be displayed
      expect(screen.getByText(/PM Template 1/)).toBeInTheDocument();
    });
  });
});

