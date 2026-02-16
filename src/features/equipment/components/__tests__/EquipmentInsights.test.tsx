import React from 'react';
import { render, screen } from '@/test/utils/test-utils';
import { describe, it, expect } from 'vitest';
import EquipmentInsights from '../EquipmentInsights';

interface MockEquipment {
  id: string;
  name: string;
  manufacturer: string;
  model: string;
  serial_number: string;
  status: string;
  location: string;
  installation_date: string;
  warranty_expiration?: string;
  last_maintenance?: string;
  team_id?: string;
}

describe('EquipmentInsights', () => {
  const mockEquipment: MockEquipment[] = [{
    id: 'eq-1',
    name: 'Test Equipment',
    manufacturer: 'Test Manufacturer',
    model: 'Test Model',
    serial_number: 'SN-123',
    status: 'active',
    location: 'Test Location',
    installation_date: '2024-01-01'
  }];

  it('renders insights', () => {
    render(<EquipmentInsights equipment={mockEquipment} filteredEquipment={mockEquipment} />);
    
    // Verify the Insights heading is displayed
    expect(screen.getByText('Insights')).toBeInTheDocument();
    
    // Verify the equipment count is displayed
    expect(screen.getByText(/Showing 1 of 1 equipment items/i)).toBeInTheDocument();
    
    // Verify status overview section is rendered
    expect(screen.getByText('Status Overview')).toBeInTheDocument();
    
    // Verify active status count is displayed
    expect(screen.getByText('active')).toBeInTheDocument();
  });

  it('handles empty data', () => {
    const emptyEquipment: MockEquipment[] = [{
      id: 'eq-1',
      name: '',
      manufacturer: '',
      model: '',
      serial_number: '',
      status: '',
      location: '',
      installation_date: ''
    }];
    render(<EquipmentInsights equipment={emptyEquipment} filteredEquipment={emptyEquipment} />);
    
    // Should render the Insights heading
    expect(screen.getByText('Insights')).toBeInTheDocument();
    
    // Should show equipment count
    expect(screen.getByText(/Showing 1 of 1 equipment items/i)).toBeInTheDocument();
    
    // Should render without errors (status overview should still be displayed)
    expect(screen.getByText('Status Overview')).toBeInTheDocument();
  });
});
