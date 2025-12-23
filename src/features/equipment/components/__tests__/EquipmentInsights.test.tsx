import React from 'react';
import { render, screen } from '@/test/utils/test-utils';
import { describe, it, expect } from 'vitest';
import EquipmentInsights from '../EquipmentInsights';

describe('EquipmentInsights', () => {
  const mockEquipment = {
    id: 'eq-1',
    working_hours: 1000,
    status: 'active'
  };

  it('renders insights', () => {
    render(<EquipmentInsights equipment={mockEquipment as any} />);
    
    // Insights should be displayed
    expect(screen.getByText(/insights/i) || screen.queryByText('1000')).toBeDefined();
  });

  it('handles empty data', () => {
    render(<EquipmentInsights equipment={{ id: 'eq-1' } as any} />);
    
    // Should render without errors
  });
});

