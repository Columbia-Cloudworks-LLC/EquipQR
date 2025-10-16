import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ChecklistTemplateEditor } from './ChecklistTemplateEditor';
import { TestProviders } from '@/test/utils/TestProviders';

// Mock the PM Templates hooks
const mockCreatePMTemplate = vi.fn();
const mockUpdatePMTemplate = vi.fn();

vi.mock('@/hooks/usePMTemplates', () => ({
  useCreatePMTemplate: () => mockCreatePMTemplate(),
  useUpdatePMTemplate: () => mockUpdatePMTemplate(),
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
      expect(screen.getByText('Engine')).toBeInTheDocument();
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

      // Open Add Section dialog
      fireEvent.click(screen.getByText('Add Section'));
      // type section name and confirm
      const sectionNameInput = screen.getByLabelText('Section Name');
      fireEvent.change(sectionNameInput, { target: { value: 'Engine' } });
      fireEvent.click(screen.getByText('Add Section'));

      const saveButton = screen.getByText('Create Template');
      fireEvent.click(saveButton);

      // Wait for async mutation to complete
      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith({
          name: 'New Template',
          description: 'New description',
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
      expect(screen.getByText('Engine')).toBeInTheDocument();
      expect(screen.getByText('2 items')).toBeInTheDocument();
    });

    it('handles template updates', async () => {
      const mockMutateAsync = vi.fn().mockResolvedValue(mockTemplate);
      mockUpdatePMTemplate.mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
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

      // Update the template name (blur commit)
      const nameInput = screen.getByDisplayValue('Test Template');
      fireEvent.change(nameInput, { target: { value: 'Updated Template' } });
      fireEvent.blur(nameInput);

      const saveButton = screen.getByText('Update Template');
      fireEvent.click(saveButton);

      // Wait for async mutation to complete
      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith({
          templateId: 'template-1',
          updates: {
            name: 'Updated Template',
            description: 'Test description',
            template_data: expect.any(Array)
          }
        });
      });
    });

    it('calls onSave after successful submission', async () => {
      const onSave = vi.fn();
      const onCancel = vi.fn();
      
      // Mock successful mutation
      const mockMutateAsync = vi.fn().mockResolvedValue({ id: 'new-template-1' });
      mockCreatePMTemplate.mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
        isError: false,
        error: null,
      });

      // Mock window.prompt to add a section
      window.prompt = vi.fn().mockReturnValue('Engine');
      
      render(
        <ChecklistTemplateEditor 
          onSave={onSave} 
          onCancel={onCancel} 
        />, 
        { wrapper: TestProviders }
      );
      
      // Fill in the form
      fireEvent.change(screen.getByLabelText('Template Name'), {
        target: { value: 'Test Template' }
      });

      // Add a section
      const addSectionButton = screen.getByText('Add Section');
      fireEvent.click(addSectionButton);
      
      const saveButton = screen.getByText('Create Template');
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalled();
      });
      
      await waitFor(() => {
        expect(onSave).toHaveBeenCalledTimes(1);
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