import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WorkOrderPMChecklist } from './WorkOrderPMChecklist';

vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: () => ({
    hasRole: () => true
  })
}));

let mockHookState: Record<string, unknown> = {
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
};

vi.mock('@/features/work-orders/hooks/useWorkOrderPMChecklist', () => ({
  useWorkOrderPMChecklist: () => mockHookState,
  PM_TEMPLATE_NONE_VALUE: 'none'
}));

describe('WorkOrderPMChecklist', () => {
  it('renders a message that PM checklist is optional when no template is selected', () => {
    mockHookState = {
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
    };
    render(<WorkOrderPMChecklist values={{ pmTemplateId: null }} setValue={vi.fn()} />);
    
    expect(screen.getByText('No checklist selected. A PM checklist is optional.')).toBeInTheDocument();
  });

  it('renders blocking error when templates fails to load and no cached templates exist', () => {
    mockHookState = {
      templates: [],
      selectedTemplate: null,
      assignedTemplate: null,
      isLoading: false,
      isError: true,
      refreshTemplates: vi.fn(),
      restrictions: { canCreateCustomPMTemplates: true },
      handleTemplateChange: vi.fn(),
      handleClearTemplate: vi.fn(),
      selectValue: ''
    };
    render(<WorkOrderPMChecklist values={{ pmTemplateId: null }} setValue={vi.fn()} />);
    
    expect(screen.getByRole('alert')).toHaveTextContent('PM templates could not be loaded');
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('keeps cached templates selectable with a nonblocking retry notice when refetch fails', () => {
    mockHookState = {
      templates: [{ id: 'template-1', title: 'Monthly Service' }],
      selectedTemplate: null,
      assignedTemplate: null,
      isLoading: false,
      isError: true,
      refreshTemplates: vi.fn(),
      restrictions: { canCreateCustomPMTemplates: true },
      handleTemplateChange: vi.fn(),
      handleClearTemplate: vi.fn(),
      selectValue: ''
    };
    render(<WorkOrderPMChecklist values={{ pmTemplateId: null }} setValue={vi.fn()} />);
    
    expect(screen.getByText('Failed to refresh latest templates.')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'PM template (optional)' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
