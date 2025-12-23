import React from 'react';
import { render, screen } from '@/test/utils/test-utils';
import { describe, it, expect, vi } from 'vitest';
import { CSVMappingStep } from '../csv-import/CSVMappingStep';

describe('CSVMappingStep', () => {
  const mockOnNext = vi.fn();
  const mockOnBack = vi.fn();
  const mockOnMappingsChange = vi.fn();
  const mockOnTeamChange = vi.fn();

  it('renders mapping step', () => {
    render(
      <CSVMappingStep 
        headers={['Name', 'Model']}
        mappings={[]}
        onMappingsChange={mockOnMappingsChange}
        teams={[]}
        selectedTeamId={null}
        onTeamChange={mockOnTeamChange}
        onNext={mockOnNext}
        onBack={mockOnBack}
      />
    );
    
    expect(screen.getByText(/mapping/i) || screen.queryByText(/column/i)).toBeDefined();
  });
});
