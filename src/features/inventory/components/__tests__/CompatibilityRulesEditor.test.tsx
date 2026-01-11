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
      { manufacturer: 'Komatsu', models: ['PC200', 'PC300'] }
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

      expect(mockOnChange).toHaveBeenCalledWith([{ manufacturer: '', model: null }]);
    });

    it('appends to existing rules when adding', () => {
      const existingRules: PartCompatibilityRuleFormData[] = [
        { manufacturer: 'Caterpillar', model: 'D6T' }
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
        { manufacturer: 'Caterpillar', model: 'D6T' },
        { manufacturer: '', model: null }
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
});
