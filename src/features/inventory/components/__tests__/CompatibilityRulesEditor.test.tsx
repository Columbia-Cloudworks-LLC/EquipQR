import React from 'react';
import { render, screen, fireEvent, waitFor } from '@/test/utils/test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CompatibilityRulesEditor } from '../CompatibilityRulesEditor';
import type { PartCompatibilityRuleFormData } from '@/features/inventory/types/inventory';

// Mock dependencies
vi.mock('@/contexts/OrganizationContext', () => ({
  useOrganization: vi.fn(() => ({
    currentOrganization: { id: 'org-1', name: 'Test Org' }
  }))
}));

vi.mock('@/features/equipment/hooks/useEquipment', () => ({
  useEquipmentManufacturersAndModels: vi.fn(() => ({
    data: [
      { manufacturer: 'Caterpillar', models: ['D6T', 'D8T', '320'] },
      { manufacturer: 'John Deere', models: ['450J', '650K'] },
      { manufacturer: 'Komatsu', models: ['PC200', 'PC300'] },
      { manufacturer: 'JLG', models: ['JL-100', 'JL-200', 'JL-300A'] }
    ],
    isLoading: false
  }))
}));

vi.mock('@/features/inventory/hooks/useInventory', () => ({
  useEquipmentMatchCount: vi.fn(() => ({
    data: 5
  }))
}));

describe('CompatibilityRulesEditor', () => {
  const mockOnChange = vi.fn();
  const defaultRules: PartCompatibilityRuleFormData[] = [];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Core Rendering', () => {
    it('renders the component with title and description', () => {
      render(
        <CompatibilityRulesEditor
          rules={defaultRules}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByText('Compatibility Rules')).toBeInTheDocument();
      expect(screen.getByText(/Match parts to equipment by manufacturer and model/)).toBeInTheDocument();
    });

    it('renders add rule button', () => {
      render(
        <CompatibilityRulesEditor
          rules={defaultRules}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByRole('button', { name: /add rule/i })).toBeInTheDocument();
    });

    it('displays existing rules', () => {
      const existingRules: PartCompatibilityRuleFormData[] = [
        { manufacturer: 'Caterpillar', model: 'D6T' },
        { manufacturer: 'John Deere', model: null }
      ];

      render(
        <CompatibilityRulesEditor
          rules={existingRules}
          onChange={mockOnChange}
        />
      );

      // The select triggers should show the selected values
      const triggers = screen.getAllByRole('combobox');
      expect(triggers.length).toBeGreaterThanOrEqual(4); // 2 manufacturers + 2 models
    });

    it('shows match count badge when rules are valid', () => {
      const rules: PartCompatibilityRuleFormData[] = [
        { manufacturer: 'Caterpillar', model: null }
      ];

      render(
        <CompatibilityRulesEditor
          rules={rules}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByText(/Matches 5 equipment/)).toBeInTheDocument();
    });
  });

  describe('Adding Rules', () => {
    it('adds a new empty rule when add button is clicked', () => {
      render(
        <CompatibilityRulesEditor
          rules={defaultRules}
          onChange={mockOnChange}
        />
      );

      const addButton = screen.getByRole('button', { name: /add rule/i });
      fireEvent.click(addButton);

      expect(mockOnChange).toHaveBeenCalledWith([
        expect.objectContaining({ manufacturer: '', model: null, match_type: 'exact', status: 'unverified' })
      ]);
    });

    it('appends to existing rules when adding', () => {
      const existingRules: PartCompatibilityRuleFormData[] = [
        { manufacturer: 'Caterpillar', model: 'D6T', match_type: 'exact', status: 'unverified' }
      ];

      render(
        <CompatibilityRulesEditor
          rules={existingRules}
          onChange={mockOnChange}
        />
      );

      const addButton = screen.getByRole('button', { name: /add rule/i });
      fireEvent.click(addButton);

      expect(mockOnChange).toHaveBeenCalledWith([
        { manufacturer: 'Caterpillar', model: 'D6T', match_type: 'exact', status: 'unverified' },
        expect.objectContaining({ manufacturer: '', model: null, match_type: 'exact', status: 'unverified' })
      ]);
    });
  });

  describe('Removing Rules', () => {
    it('removes a rule when remove button is clicked', () => {
      const existingRules: PartCompatibilityRuleFormData[] = [
        { manufacturer: 'Caterpillar', model: 'D6T' },
        { manufacturer: 'John Deere', model: null }
      ];

      render(
        <CompatibilityRulesEditor
          rules={existingRules}
          onChange={mockOnChange}
        />
      );

      // Find remove buttons (X icons)
      const removeButtons = screen.getAllByRole('button').filter(
        btn => btn.querySelector('svg.lucide-x')
      );
      
      expect(removeButtons.length).toBe(2);
      fireEvent.click(removeButtons[0]);

      expect(mockOnChange).toHaveBeenCalledWith([
        { manufacturer: 'John Deere', model: null }
      ]);
    });
  });

  describe('Disabled State', () => {
    it('disables add button when disabled prop is true', () => {
      render(
        <CompatibilityRulesEditor
          rules={defaultRules}
          onChange={mockOnChange}
          disabled={true}
        />
      );

      const addButton = screen.getByRole('button', { name: /add rule/i });
      expect(addButton).toBeDisabled();
    });

    it('disables remove buttons when disabled prop is true', () => {
      const existingRules: PartCompatibilityRuleFormData[] = [
        { manufacturer: 'Caterpillar', model: 'D6T' }
      ];

      render(
        <CompatibilityRulesEditor
          rules={existingRules}
          onChange={mockOnChange}
          disabled={true}
        />
      );

      const removeButtons = screen.getAllByRole('button').filter(
        btn => btn.querySelector('svg.lucide-x')
      );
      
      removeButtons.forEach(btn => {
        expect(btn).toBeDisabled();
      });
    });
  });

  describe('Empty State', () => {
    it('shows empty state when no manufacturers exist', async () => {
      // Override the mock for this test
      const useEquipmentModule = await import('@/features/equipment/hooks/useEquipment');
      vi.mocked(useEquipmentModule.useEquipmentManufacturersAndModels).mockReturnValue({
        data: [],
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn()
      } as unknown as ReturnType<typeof useEquipmentModule.useEquipmentManufacturersAndModels>);

      render(
        <CompatibilityRulesEditor
          rules={defaultRules}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByText(/No equipment found in your organization/)).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('shows loading skeleton when manufacturers are loading', async () => {
      const useEquipmentModule = await import('@/features/equipment/hooks/useEquipment');
      vi.mocked(useEquipmentModule.useEquipmentManufacturersAndModels).mockReturnValue({
        data: [],
        isLoading: true,
        isError: false,
        error: null,
        refetch: vi.fn()
      } as unknown as ReturnType<typeof useEquipmentModule.useEquipmentManufacturersAndModels>);

      render(
        <CompatibilityRulesEditor
          rules={defaultRules}
          onChange={mockOnChange}
        />
      );

      // Should show loading skeletons
      const skeletons = document.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe('Help Text', () => {
    it('shows help text when rules exist', async () => {
      // Reset the mock to return manufacturers (may have been modified by previous tests)
      const useEquipmentModule = await import('@/features/equipment/hooks/useEquipment');
      vi.mocked(useEquipmentModule.useEquipmentManufacturersAndModels).mockReturnValue({
        data: [
          { manufacturer: 'Caterpillar', models: ['D6T', 'D8T', '320'] },
          { manufacturer: 'John Deere', models: ['450J', '650K'] }
        ],
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn()
      } as unknown as ReturnType<typeof useEquipmentModule.useEquipmentManufacturersAndModels>);

      const rules: PartCompatibilityRuleFormData[] = [
        { manufacturer: 'Caterpillar', model: null }
      ];

      render(
        <CompatibilityRulesEditor
          rules={rules}
          onChange={mockOnChange}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Rules use case-insensitive matching/)).toBeInTheDocument();
      });
    });

    it('does not show help text when no rules', () => {
      render(
        <CompatibilityRulesEditor
          rules={[]}
          onChange={mockOnChange}
        />
      );

      expect(screen.queryByText(/Rules use case-insensitive matching/)).not.toBeInTheDocument();
    });
  });

  describe('Match Type Support', () => {
    it('adds rule with match_type and status when add button clicked', () => {
      render(
        <CompatibilityRulesEditor
          rules={defaultRules}
          onChange={mockOnChange}
        />
      );

      const addButton = screen.getByRole('button', { name: /add rule/i });
      fireEvent.click(addButton);

      expect(mockOnChange).toHaveBeenCalledWith([
        expect.objectContaining({
          manufacturer: '',
          model: null,
          match_type: 'exact',
          status: 'unverified'
        })
      ]);
    });

    it('displays rules with different match types', () => {
      const rulesWithMatchTypes: PartCompatibilityRuleFormData[] = [
        { manufacturer: 'Caterpillar', model: null, match_type: 'any', status: 'verified' },
        { manufacturer: 'John Deere', model: '450J', match_type: 'exact', status: 'unverified' },
        { manufacturer: 'JLG', model: 'JL-', match_type: 'prefix', status: 'unverified' }
      ];

      render(
        <CompatibilityRulesEditor
          rules={rulesWithMatchTypes}
          onChange={mockOnChange}
        />
      );

      // Should render all rules
      const triggers = screen.getAllByRole('combobox');
      expect(triggers.length).toBeGreaterThan(0);
    });

    it('shows pattern input for prefix match type', () => {
      const rules: PartCompatibilityRuleFormData[] = [
        { manufacturer: 'JLG', model: 'JL-', match_type: 'prefix', status: 'unverified' }
      ];

      render(
        <CompatibilityRulesEditor
          rules={rules}
          onChange={mockOnChange}
        />
      );

      // Should have a text input for the pattern
      const patternInput = screen.getByPlaceholderText(/enter prefix/i);
      expect(patternInput).toBeInTheDocument();
    });

    it('shows pattern input for wildcard match type', () => {
      const rules: PartCompatibilityRuleFormData[] = [
        { manufacturer: 'Caterpillar', model: 'D*T', match_type: 'wildcard', status: 'unverified' }
      ];

      render(
        <CompatibilityRulesEditor
          rules={rules}
          onChange={mockOnChange}
        />
      );

      // Should have a text input for the pattern
      const patternInput = screen.getByPlaceholderText(/enter pattern/i);
      expect(patternInput).toBeInTheDocument();
    });

    it('shows notes input for verified rules', () => {
      const rules: PartCompatibilityRuleFormData[] = [
        { manufacturer: 'Caterpillar', model: 'D6T', match_type: 'exact', status: 'verified', notes: 'Tested on job #123' }
      ];

      render(
        <CompatibilityRulesEditor
          rules={rules}
          onChange={mockOnChange}
        />
      );

      // Should show notes input for verified status
      const notesInput = screen.getByPlaceholderText(/verification notes/i);
      expect(notesInput).toBeInTheDocument();
    });

    it('does not show notes input for unverified rules', () => {
      const rules: PartCompatibilityRuleFormData[] = [
        { manufacturer: 'Caterpillar', model: 'D6T', match_type: 'exact', status: 'unverified' }
      ];

      render(
        <CompatibilityRulesEditor
          rules={rules}
          onChange={mockOnChange}
        />
      );

      // Should NOT show notes input for unverified status
      expect(screen.queryByPlaceholderText(/verification notes/i)).not.toBeInTheDocument();
    });
  });

  describe('Pattern Validation Display', () => {
    it('shows pattern preview for prefix patterns', () => {
      const rules: PartCompatibilityRuleFormData[] = [
        { manufacturer: 'JLG', model: 'jl-', match_type: 'prefix', status: 'unverified' }
      ];

      render(
        <CompatibilityRulesEditor
          rules={rules}
          onChange={mockOnChange}
        />
      );

      // Should show the normalized pattern preview
      expect(screen.getByText(/pattern:/i)).toBeInTheDocument();
      expect(screen.getByText(/jl-\*/)).toBeInTheDocument();
    });

    it('shows error for invalid prefix patterns with wildcards', () => {
      const rules: PartCompatibilityRuleFormData[] = [
        { manufacturer: 'JLG', model: 'JL-*', match_type: 'prefix', status: 'unverified' }
      ];

      render(
        <CompatibilityRulesEditor
          rules={rules}
          onChange={mockOnChange}
        />
      );

      // Should show error about wildcards
      expect(screen.getByText(/cannot contain wildcards/i)).toBeInTheDocument();
    });

    it('shows error for wildcard patterns with too many asterisks', () => {
      const rules: PartCompatibilityRuleFormData[] = [
        { manufacturer: 'CAT', model: 'D*T*X*', match_type: 'wildcard', status: 'unverified' }
      ];

      render(
        <CompatibilityRulesEditor
          rules={rules}
          onChange={mockOnChange}
        />
      );

      // Should show error about too many wildcards
      expect(screen.getByText(/at most 2 wildcards/i)).toBeInTheDocument();
    });

    it('shows error for wildcard patterns that match everything', () => {
      const rules: PartCompatibilityRuleFormData[] = [
        { manufacturer: 'CAT', model: '*', match_type: 'wildcard', status: 'unverified' }
      ];

      render(
        <CompatibilityRulesEditor
          rules={rules}
          onChange={mockOnChange}
        />
      );

      // Should show error about needing non-wildcard characters
      expect(screen.getByText(/at least 2 non-wildcard/i)).toBeInTheDocument();
    });
  });

  describe('Verification Status', () => {
    it('shows verified badge for verified status', () => {
      const rules: PartCompatibilityRuleFormData[] = [
        { manufacturer: 'Caterpillar', model: 'D6T', match_type: 'exact', status: 'verified' }
      ];

      render(
        <CompatibilityRulesEditor
          rules={rules}
          onChange={mockOnChange}
        />
      );

      // The status dropdown should be present
      const comboboxes = screen.getAllByRole('combobox');
      expect(comboboxes.length).toBeGreaterThan(0);
    });
  });
});
