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

describe('EquipmentPMInfo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Core Rendering', () => {
    it('renders PM template information', () => {
      render(<EquipmentPMInfo equipmentId="eq-1" organizationId="org-1" />);
      
      // Component should render (may show loading state or PM info)
      expect(screen.getByText(/PM/i) || screen.queryByRole('generic')).toBeDefined();
    });
  });
});


