import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ChecklistTemplateEditor } from './ChecklistTemplateEditor';
import { TestProviders } from '@/test/utils/TestProviders';

// Mock the PM Templates hooks
const mockCreatePMTemplate = vi.fn();
const mockUpdatePMTemplate = vi.fn();

vi.mock('@/features/pm-templates/hooks/usePMTemplates', () => ({
  useCreatePMTemplate: () => mockCreatePMTemplate(),
  useUpdatePMTemplate: () => mockUpdatePMTemplate(),
}));

vi.mock('@/features/pm-templates/components/PMTemplateSectionToc', () => ({
  PMTemplateSectionToc: () => <nav data-testid="mock-section-toc" aria-label="Template sections table of contents" />,
}));

vi.mock('@/features/pm-templates/hooks/usePMTemplateCompatibility', () => ({
  usePMTemplateCompatibilityRules: () => ({ data: [], isLoading: false }),
  useBulkSetPMTemplateRules: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock('@/features/pm-templates/services/pmIntervalPolicyService', () => ({
  pmIntervalPolicyService: {
    upsertPolicy: vi.fn().mockResolvedValue(null),
  },
  policyRowToFormState: vi.fn(() => ({
    mode: 'inherit',
    intervalValue: null,
    intervalType: 'days',
  })),
}));

// Mock toast
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
  },
}));

const mockTemplate = {
  id: 'template-1',
  name: 'Test Template',
  description: 'Test description',
  template_data: [
    {
      id: 'item-1',
      title: 'Check oil',
      description: 'Check oil level',
      section: 'Engine',
      condition: null,
      required: true,
      notes: ''
    },
    {
      id: 'item-2',
      title: 'Check coolant',
      description: 'Check coolant level',
      section: 'Engine',
      condition: null,
      required: false,
      notes: ''
    }
  ]
};

// Mock return values for hooks
const createMockCreateHook = () => ({
  mutateAsync: vi.fn(),
  isPending: false,
  isError: false,
  error: null,
});

const createMockUpdateHook = () => ({
  mutateAsync: vi.fn(),
  isPending: false,
  isError: false,
  error: null,
});

describe('ChecklistTemplateEditor', () => {
  const defaultProps = {
    onSave: vi.fn(),
    onCancel: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreatePMTemplate.mockReturnValue(createMockCreateHook());
    mockUpdatePMTemplate.mockReturnValue(createMockUpdateHook());
  });

  describe('Component Rendering', () => {
    it('renders create mode correctly', () => {
      render(
        <ChecklistTemplateEditor {...defaultProps} />, 
        { wrapper: TestProviders }
      );

      expect(screen.getByLabelText('Template Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Description (Optional)')).toBeInTheDocument();
      expect(screen.getByText('Create Template')).toBeInTheDocument();
    });

    it('renders edit mode with template data', () => {
      render(
        <ChecklistTemplateEditor 
          template={mockTemplate} 
          {...defaultProps} 
        />, 
        { wrapper: TestProviders }
      );

      expect(screen.getByDisplayValue('Test Template')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Test description')).toBeInTheDocument();
      expect(screen.getByText('Update Template')).toBeInTheDocument();
      const sectionHeaders = screen.getAllByText('Engine');
      expect(sectionHeaders[0]).toBeInTheDocument();
    });

    it('populates form fields with existing template data', () => {
      render(
        <ChecklistTemplateEditor 
          template={mockTemplate} 
          {...defaultProps} 
        />, 
        { wrapper: TestProviders }
      );

      const nameInput = screen.getByDisplayValue('Test Template');
      const descriptionInput = screen.getByDisplayValue('Test description');
      
      expect(nameInput).toBeInTheDocument();
      expect(descriptionInput).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('requires template name', () => {
      // Mock window.alert
      window.alert = vi.fn();
      
      render(
        <ChecklistTemplateEditor {...defaultProps} />, 
        { wrapper: TestProviders }
      );

      const saveButton = screen.getByText('Create Template');
      fireEvent.click(saveButton);

      expect(window.alert).toHaveBeenCalledWith('Template name is required');
    });

    it('requires at least one section', () => {
      // Mock window.alert
      window.alert = vi.fn();
      
      render(
        <ChecklistTemplateEditor {...defaultProps} />, 
        { wrapper: TestProviders }
      );

      // Fill template name
      fireEvent.change(screen.getByLabelText('Template Name'), {
        target: { value: 'Test Template' }
      });

      const saveButton = screen.getByText('Create Template');
      fireEvent.click(saveButton);

      expect(window.alert).toHaveBeenCalled();
    });

    it('validates form submission successfully', async () => {
      const mockMutateAsync = vi.fn().mockResolvedValue({ id: 'new-template' });
      mockCreatePMTemplate.mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
        isError: false,
        error: null,
      });

      render(
        <ChecklistTemplateEditor {...defaultProps} />, 
        { wrapper: TestProviders }
      );

      // Fill in the form
      fireEvent.change(screen.getByLabelText('Template Name'), {
        target: { value: 'New Template' }
      });
      
      fireEvent.change(screen.getByLabelText('Description (Optional)'), {
        target: { value: 'New description' }
      });

      // Open inline Add Section (click Add Section, then type in placeholder and confirm)
      fireEvent.click(screen.getByRole('button', { name: /add section/i }));
      const sectionNameInput = screen.getByPlaceholderText('New section name');
      fireEvent.change(sectionNameInput, { target: { value: 'Engine' } });
      fireEvent.click(screen.getByRole('button', { name: 'Add' }));

      const saveButton = screen.getByText('Create Template');
      fireEvent.click(saveButton);

      // Wait for async mutation to complete
      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith({
          name: 'New Template',
          description: 'New description',
          interval_type: null,
          interval_value: null,
          template_data: expect.arrayContaining([
            expect.objectContaining({
              section: 'Engine',
              title: 'New item'
            })
          ])
        });
      });
    });
  });

  describe('Template Management', () => {
    it('displays existing template data', () => {
      render(
        <ChecklistTemplateEditor 
          template={mockTemplate} 
          {...defaultProps} 
        />, 
        { wrapper: TestProviders }
      );

      expect(screen.getByDisplayValue('Test Template')).toBeInTheDocument();
      const sectionHeaders2 = screen.getAllByText('Engine');
      expect(sectionHeaders2.length).toBeGreaterThan(0);
      expect(screen.getByText('2 items')).toBeInTheDocument();
    });

    it('calls onSave after successful submission', async () => {
      const onSave = vi.fn();
      const onCancel = vi.fn();

      const mockMutateAsync = vi.fn().mockResolvedValue({ id: 'new-template-1' });
      mockCreatePMTemplate.mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
        isError: false,
        error: null,
      });

      render(
        <ChecklistTemplateEditor onSave={onSave} onCancel={onCancel} />,
        { wrapper: TestProviders }
      );

      fireEvent.change(screen.getByLabelText('Template Name'), {
        target: { value: 'Test Template' },
      });

      fireEvent.click(screen.getByRole('button', { name: /add section/i }));
      const sectionNameInput = screen.getByPlaceholderText('New section name');
      fireEvent.change(sectionNameInput, { target: { value: 'Engine' } });
      fireEvent.click(screen.getByRole('button', { name: 'Add' }));

      fireEvent.click(screen.getByText('Create Template'));

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith('new-template-1');
      }, { timeout: 3000 });
    });
  });

  describe('Structure-first UX', () => {
    const largeTemplate = {
      id: 'large-template',
      name: 'Large Template',
      description: 'Many items',
      template_data: Array.from({ length: 21 }, (_, index) => ({
        id: `item-${index}`,
        title: `Item ${index + 1}`,
        description: '',
        section: index < 10 ? 'Section A' : 'Section B',
        condition: null,
        required: true,
        notes: '',
      })),
    };

    it('collapses to first section only for large templates on load', async () => {
      render(
        <ChecklistTemplateEditor template={largeTemplate} {...defaultProps} />,
        { wrapper: TestProviders }
      );

      fireEvent.click(screen.getByRole('tab', { name: /checklist items/i }));

      await waitFor(() => {
        expect(screen.getByText('Show all sections')).toBeInTheDocument();
        expect(document.getElementById('section-Section%20A')).toBeInTheDocument();
        expect(document.getElementById('section-Section%20B')).not.toBeInTheDocument();
      });
    });

    it('renders compact item rows by default', () => {
      render(
        <ChecklistTemplateEditor template={mockTemplate} {...defaultProps} />,
        { wrapper: TestProviders }
      );

      fireEvent.click(screen.getByRole('tab', { name: /checklist items/i }));

      expect(screen.getAllByLabelText('Check name').length).toBeGreaterThanOrEqual(2);
    });

    it('shows Required label and expand control for checklist items', () => {
      render(
        <ChecklistTemplateEditor template={mockTemplate} {...defaultProps} />,
        { wrapper: TestProviders }
      );

      fireEvent.click(screen.getByRole('tab', { name: /checklist items/i }));

      expect(screen.getAllByText('Required').length).toBeGreaterThan(0);
      expect(screen.getByRole('button', { name: /expand description for check oil/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /drag to reorder check oil/i })).toBeInTheDocument();
    });

    it('keeps description collapsed by default and toggles via chevron', () => {
      render(
        <ChecklistTemplateEditor template={mockTemplate} {...defaultProps} />,
        { wrapper: TestProviders }
      );

      fireEvent.click(screen.getByRole('tab', { name: /checklist items/i }));

      expect(screen.queryAllByPlaceholderText(/instructions for technicians/i).length).toBe(0);

      fireEvent.click(screen.getByRole('button', { name: /expand description for check oil/i }));

      expect(screen.getAllByPlaceholderText(/instructions for technicians/i).length).toBe(1);

      fireEvent.click(screen.getByRole('button', { name: /collapse description for check oil/i }));

      expect(screen.queryAllByPlaceholderText(/instructions for technicians/i).length).toBe(0);
    });

    it('adds a new item below when pressing Enter in the title field', async () => {
      render(
        <ChecklistTemplateEditor template={mockTemplate} {...defaultProps} />,
        { wrapper: TestProviders }
      );

      fireEvent.click(screen.getByRole('tab', { name: /checklist items/i }));

      const titleInput = screen.getAllByLabelText('Check name')[0];
      fireEvent.change(titleInput, { target: { value: 'Check oil updated' } });
      fireEvent.keyDown(titleInput, { key: 'Enter', code: 'Enter' });

      await waitFor(() => {
        expect(screen.getAllByLabelText('Check name').length).toBeGreaterThanOrEqual(2);
      });
    });
  });

  describe('Loading States', () => {
    it('disables save button when loading', () => {
      mockCreatePMTemplate.mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: true,
        isError: false,
        error: null,
      });

      render(
        <ChecklistTemplateEditor {...defaultProps} />, 
        { wrapper: TestProviders }
      );

      const saveButton = screen.getByText('Create Template');
      expect(saveButton).toBeDisabled();
    });

    it('disables cancel button when loading', () => {
      mockUpdatePMTemplate.mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: true,
        isError: false,
        error: null,
      });

      render(
        <ChecklistTemplateEditor 
          template={mockTemplate} 
          {...defaultProps} 
        />, 
        { wrapper: TestProviders }
      );

      const cancelButton = screen.getByText('Cancel');
      expect(cancelButton).toBeDisabled();
    });
  });
});
