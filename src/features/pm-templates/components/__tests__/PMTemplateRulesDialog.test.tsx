import React from 'react';
import { render, screen, fireEvent, waitFor } from '@/test/utils/test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PMTemplateRulesDialog } from '../PMTemplateRulesDialog';
import type { PMTemplateCompatibilityRuleFormData } from '@/features/pm-templates/types/pmTemplateCompatibility';

// Mock the child component
vi.mock('../PMTemplateCompatibilityRulesEditor', () => ({
  PMTemplateCompatibilityRulesEditor: ({ 
    rules, 
    onChange, 
    disabled 
  }: { 
    rules: PMTemplateCompatibilityRuleFormData[]; 
    onChange: (rules: PMTemplateCompatibilityRuleFormData[]) => void; 
    disabled: boolean;
  }) => (
    <div data-testid="rules-editor">
      <div data-testid="rules-count">{rules.length}</div>
      <div data-testid="editor-disabled">{disabled ? 'true' : 'false'}</div>
      <button 
        data-testid="simulate-change"
        onClick={() => onChange([...rules, { manufacturer: 'Toyota', model: null }])}
      >
        Add Rule
      </button>
      <button 
        data-testid="simulate-clear"
        onClick={() => onChange([])}
      >
        Clear Rules
      </button>
    </div>
  )
}));

// Mock hooks
vi.mock('@/features/pm-templates/hooks/usePMTemplateCompatibility', () => ({
  usePMTemplateCompatibilityRules: vi.fn(),
  useBulkSetPMTemplateRules: vi.fn()
}));

// Import after mocking
import { usePMTemplateCompatibilityRules, useBulkSetPMTemplateRules } from '@/features/pm-templates/hooks/usePMTemplateCompatibility';

describe('PMTemplateRulesDialog', () => {
  const mockOnClose = vi.fn();
  const mockMutateAsync = vi.fn();

  const defaultProps = {
    templateId: 'template-123',
    templateName: 'Forklift PM Checklist',
    open: true,
    onClose: mockOnClose
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementations
    vi.mocked(usePMTemplateCompatibilityRules).mockReturnValue({
      data: [],
      isLoading: false,
      isSuccess: true,
      isError: false,
      error: null,
      status: 'success',
      fetchStatus: 'idle'
    } as ReturnType<typeof usePMTemplateCompatibilityRules>);

    vi.mocked(useBulkSetPMTemplateRules).mockReturnValue({
      mutateAsync: mockMutateAsync.mockResolvedValue(undefined),
      isPending: false,
      isIdle: true,
      isSuccess: false,
      isError: false,
      error: null,
      data: undefined,
      variables: undefined,
      context: undefined,
      status: 'idle',
      reset: vi.fn(),
      failureCount: 0,
      failureReason: null,
      submittedAt: 0,
      isPaused: false,
      mutate: vi.fn()
    } as unknown as ReturnType<typeof useBulkSetPMTemplateRules>);
  });

  describe('Dialog Rendering', () => {
    it('renders dialog when open is true', () => {
      render(<PMTemplateRulesDialog {...defaultProps} />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Configure Compatibility Rules')).toBeInTheDocument();
    });

    it('shows template name in description', () => {
      render(<PMTemplateRulesDialog {...defaultProps} />);

      expect(screen.getByText(/Forklift PM Checklist/)).toBeInTheDocument();
    });

    it('does not render when open is false', () => {
      render(<PMTemplateRulesDialog {...defaultProps} open={false} />);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('renders Cancel and Save Rules buttons', () => {
      render(<PMTemplateRulesDialog {...defaultProps} />);

      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /save rules/i })).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('shows loader while fetching rules', () => {
      vi.mocked(usePMTemplateCompatibilityRules).mockReturnValue({
        data: [],
        isLoading: true,
        isSuccess: false,
        isError: false,
        error: null,
        status: 'pending',
        fetchStatus: 'fetching'
      } as ReturnType<typeof usePMTemplateCompatibilityRules>);

      render(<PMTemplateRulesDialog {...defaultProps} />);

      // Should show spinner (lucide-loader2 has animate-spin class)
      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('hides editor while loading', () => {
      vi.mocked(usePMTemplateCompatibilityRules).mockReturnValue({
        data: [],
        isLoading: true,
        isSuccess: false,
        isError: false,
        error: null,
        status: 'pending',
        fetchStatus: 'fetching'
      } as ReturnType<typeof usePMTemplateCompatibilityRules>);

      render(<PMTemplateRulesDialog {...defaultProps} />);

      expect(screen.queryByTestId('rules-editor')).not.toBeInTheDocument();
    });
  });

  describe('Data Sync', () => {
    it('syncs saved rules to local state when they load', async () => {
      vi.mocked(usePMTemplateCompatibilityRules).mockReturnValue({
        data: [
          { id: 'rule-1', manufacturer: 'Toyota', model: '8FGU25', pm_template_id: 'template-123', created_at: '' },
          { id: 'rule-2', manufacturer: 'Konecranes', model: null, pm_template_id: 'template-123', created_at: '' }
        ],
        isLoading: false,
        isSuccess: true,
        isError: false,
        error: null,
        status: 'success',
        fetchStatus: 'idle'
      } as unknown as ReturnType<typeof usePMTemplateCompatibilityRules>);

      render(<PMTemplateRulesDialog {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('rules-count')).toHaveTextContent('2');
      });
    });

    it('handles empty initial rules', () => {
      vi.mocked(usePMTemplateCompatibilityRules).mockReturnValue({
        data: [],
        isLoading: false,
        isSuccess: true,
        isError: false,
        error: null,
        status: 'success',
        fetchStatus: 'idle'
      } as ReturnType<typeof usePMTemplateCompatibilityRules>);

      render(<PMTemplateRulesDialog {...defaultProps} />);

      expect(screen.getByTestId('rules-count')).toHaveTextContent('0');
    });
  });

  describe('Save Button State', () => {
    it('disables Save button when no changes made', () => {
      render(<PMTemplateRulesDialog {...defaultProps} />);

      const saveButton = screen.getByRole('button', { name: /save rules/i });
      expect(saveButton).toBeDisabled();
    });

    it('enables Save button after modifications', async () => {
      render(<PMTemplateRulesDialog {...defaultProps} />);

      // Simulate a rule change
      const addButton = screen.getByTestId('simulate-change');
      fireEvent.click(addButton);

      await waitFor(() => {
        const saveButton = screen.getByRole('button', { name: /save rules/i });
        expect(saveButton).not.toBeDisabled();
      });
    });
  });

  describe('Cancel Behavior', () => {
    it('calls onClose when Cancel is clicked', () => {
      render(<PMTemplateRulesDialog {...defaultProps} />);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('closes dialog even with unsaved changes', async () => {
      render(<PMTemplateRulesDialog {...defaultProps} />);

      // Make changes
      const addButton = screen.getByTestId('simulate-change');
      fireEvent.click(addButton);

      // Click cancel
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Save Flow', () => {
    it('calls bulkSetRules.mutateAsync when Save is clicked', async () => {
      render(<PMTemplateRulesDialog {...defaultProps} />);

      // Make changes to enable save button
      const addButton = screen.getByTestId('simulate-change');
      fireEvent.click(addButton);

      // Click save
      const saveButton = screen.getByRole('button', { name: /save rules/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith({
          templateId: 'template-123',
          rules: [{ manufacturer: 'Toyota', model: null }]
        });
      });
    });

    it('closes dialog on successful save', async () => {
      mockMutateAsync.mockResolvedValue(undefined);

      render(<PMTemplateRulesDialog {...defaultProps} />);

      // Make changes
      const addButton = screen.getByTestId('simulate-change');
      fireEvent.click(addButton);

      // Click save
      const saveButton = screen.getByRole('button', { name: /save rules/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });
  });

  describe('Pending State', () => {
    it('disables buttons during save operation', () => {
      vi.mocked(useBulkSetPMTemplateRules).mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: true,
        isIdle: false,
        isSuccess: false,
        isError: false,
        error: null,
        data: undefined,
        variables: undefined,
        context: undefined,
        status: 'pending',
        reset: vi.fn(),
        failureCount: 0,
        failureReason: null,
        submittedAt: Date.now(),
        isPaused: false,
        mutate: vi.fn()
      } as unknown as ReturnType<typeof useBulkSetPMTemplateRules>);

      render(<PMTemplateRulesDialog {...defaultProps} />);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      const saveButton = screen.getByRole('button', { name: /save rules/i });

      expect(cancelButton).toBeDisabled();
      expect(saveButton).toBeDisabled();
    });

    it('disables editor during save operation', () => {
      vi.mocked(useBulkSetPMTemplateRules).mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: true,
        isIdle: false,
        isSuccess: false,
        isError: false,
        error: null,
        data: undefined,
        variables: undefined,
        context: undefined,
        status: 'pending',
        reset: vi.fn(),
        failureCount: 0,
        failureReason: null,
        submittedAt: Date.now(),
        isPaused: false,
        mutate: vi.fn()
      } as unknown as ReturnType<typeof useBulkSetPMTemplateRules>);

      render(<PMTemplateRulesDialog {...defaultProps} />);

      expect(screen.getByTestId('editor-disabled')).toHaveTextContent('true');
    });

    it('shows loading spinner on Save button during pending', () => {
      vi.mocked(useBulkSetPMTemplateRules).mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: true,
        isIdle: false,
        isSuccess: false,
        isError: false,
        error: null,
        data: undefined,
        variables: undefined,
        context: undefined,
        status: 'pending',
        reset: vi.fn(),
        failureCount: 0,
        failureReason: null,
        submittedAt: Date.now(),
        isPaused: false,
        mutate: vi.fn()
      } as unknown as ReturnType<typeof useBulkSetPMTemplateRules>);

      render(<PMTemplateRulesDialog {...defaultProps} />);

      // Check for spinner inside save button
      const saveButton = screen.getByRole('button', { name: /save rules/i });
      const spinner = saveButton.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('Dialog Close Behavior', () => {
    it('resets hasChanges when dialog closes', async () => {
      const { rerender } = render(<PMTemplateRulesDialog {...defaultProps} />);

      // Make changes
      const addButton = screen.getByTestId('simulate-change');
      fireEvent.click(addButton);

      // Close dialog
      rerender(<PMTemplateRulesDialog {...defaultProps} open={false} />);

      // Reopen dialog
      rerender(<PMTemplateRulesDialog {...defaultProps} open={true} />);

      // Save button should be disabled again (no changes tracked)
      await waitFor(() => {
        const saveButton = screen.getByRole('button', { name: /save rules/i });
        expect(saveButton).toBeDisabled();
      });
    });
  });

  describe('Query Options', () => {
    it('only fetches rules when dialog is open', () => {
      render(<PMTemplateRulesDialog {...defaultProps} open={false} />);

      // The hook should be called with enabled: false
      expect(usePMTemplateCompatibilityRules).toHaveBeenCalledWith(
        'template-123',
        { enabled: false }
      );
    });

    it('fetches rules when dialog opens', () => {
      render(<PMTemplateRulesDialog {...defaultProps} open={true} />);

      expect(usePMTemplateCompatibilityRules).toHaveBeenCalledWith(
        'template-123',
        { enabled: true }
      );
    });
  });
});
