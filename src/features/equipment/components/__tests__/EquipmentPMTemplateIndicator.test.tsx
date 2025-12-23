import React from 'react';
import { render, screen } from '@/test/utils/test-utils';
import { describe, it, expect } from 'vitest';
import EquipmentPMTemplateIndicator from '../EquipmentPMTemplateIndicator';

describe('EquipmentPMTemplateIndicator', () => {
  it('renders indicator when template is assigned', () => {
    render(<EquipmentPMTemplateIndicator templateId="pm-1" templateName="Test Template" />);
    
    expect(screen.getByText(/Test Template/)).toBeInTheDocument();
  });

  it('handles missing template', () => {
    render(<EquipmentPMTemplateIndicator templateId={null} templateName={null} />);
    
    // Should render without errors
  });
});

