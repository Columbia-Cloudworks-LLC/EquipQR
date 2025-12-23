import React from 'react';
import { render, screen } from '@/test/utils/test-utils';
import { describe, it, expect } from 'vitest';
import EquipmentInsights from '../EquipmentInsights';

interface MockEquipment {
  id: string;
  name?: string;
  manufacturer?: string;
  model?: string;
  serial_number?: string;
  status?: string;
  location?: string;
  installation_date?: string;
  working_hours?: number;
}

describe('EquipmentInsights', () => {
  const mockEquipment: MockEquipment[] = [{
    id: 'eq-1',
    name: 'Test Equipment',
    working_hours: 1000,
    status: 'active'
  }];

  it('renders insights', () => {
    render(<EquipmentInsights equipment={mockEquipment} filteredEquipment={mockEquipment} />);
    
    // Insights should be displayed
    const insightsText = screen.queryByText(/Insights/i) || screen.queryByText('1000');
    expect(insightsText).not.toBeNull();
  });

  it('handles empty data', () => {
    const emptyEquipment: MockEquipment[] = [{ id: 'eq-1' }];
    render(<EquipmentInsights equipment={emptyEquipment} filteredEquipment={emptyEquipment} />);
    
    // Should render without errors
  });
});


