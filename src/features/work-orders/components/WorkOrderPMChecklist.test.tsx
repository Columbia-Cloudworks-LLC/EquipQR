import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WorkOrderPMChecklist } from './WorkOrderPMChecklist';

vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: () => ({
    hasRole: () => true
  })
}));

vi.mock('@/features/work-orders/hooks/useWorkOrderPMChecklist', () => ({
  useWorkOrderPMChecklist: () => ({
    templates: [],
    selectedTemplate: null,
    assignedTemplate: null,
    isLoading: false,
    isError: false,
    refreshTemplates: vi.fn(),
    restrictions: { canCreateCustomPMTemplates: true },
    handleTemplateChange: vi.fn(),
    handleClearTemplate: vi.fn(),
    selectValue: ''
  }),
  PM_TEMPLATE_NONE_VALUE: 'none'
}));

describe('WorkOrderPMChecklist', () => {
  it('renders a message that PM checklist is optional when no template is selected', () => {
    render(<WorkOrderPMChecklist values={{ pmTemplateId: null }} setValue={vi.fn()} />);
    
    expect(screen.getByText('No checklist selected. A PM checklist is optional.')).toBeInTheDocument();
  });
});
