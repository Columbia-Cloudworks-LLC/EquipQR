import React from 'react';
import { render, screen, fireEvent } from '@/test/utils/test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InventoryItemForm } from '../InventoryItemForm';
import { inventoryItemFormSchema, compatibilityRuleSchema } from '@/features/inventory/schemas/inventorySchema';

// Mock organization context
vi.mock('@/contexts/OrganizationContext', () => ({
  useOrganization: vi.fn(() => ({
    currentOrganization: { id: 'org-1', name: 'Test Org' }
  }))
}));

// Mock toast
vi.mock('@/hooks/useAppToast', () => ({
  useAppToast: vi.fn(() => ({ toast: vi.fn() }))
}));

// Mock inventory mutation hooks
vi.mock('@/features/inventory/hooks/useInventory', () => ({
  useCreateInventoryItem: vi.fn(() => ({
    mutateAsync: vi.fn().mockResolvedValue({ id: 'new-item-1' }),
    isPending: false
  })),
  useUpdateInventoryItem: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false
  })),
  // Editor hook
  useEquipmentMatchCount: vi.fn(() => ({ data: 0 }))
}));

// Mock alternate-group hooks
vi.mock('@/features/inventory/hooks/useAlternateGroups', () => ({
  useAlternateGroups: vi.fn(() => ({ data: [] })),
  useCreateAlternateGroup: vi.fn(() => ({
    mutateAsync: vi.fn().mockResolvedValue({ id: 'alt-group-1' }),
    isPending: false
  })),
  useAddInventoryItemToGroup: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false
  }))
}));

// Mock equipment hooks (used both directly in the form and inside the editor)
vi.mock('@/features/equipment/hooks/useEquipment', () => ({
  useEquipment: vi.fn(() => ({ data: [] })),
  useEquipmentSummaries: vi.fn(() => ({ data: [] })),
  useEquipmentManufacturersAndModels: vi.fn(() => ({
    data: [
      { manufacturer: 'Caterpillar', models: ['D6T', 'D8T', '320'] },
      { manufacturer: 'John Deere', models: ['450J', '650K'] }
    ],
    isLoading: false
  }))
}));

// Stub out direct supabase usage in the form (only consumed when editingItem is set)
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: [], error: null })
    }))
  }
}));

describe('InventoryItemForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('compatibility rules persistence (regression for issue #602)', () => {
    it('keeps an added rule row when the parent re-renders with a new onClose ref', () => {
      const { rerender } = render(
        <InventoryItemForm open onClose={vi.fn()} editingItem={null} />
      );

      // Sanity: the editor renders the Add Rule button (manufacturers > 0 in mock)
      const addRuleButton = screen.getByRole('button', { name: /add rule/i });
      fireEvent.click(addRuleButton);

      // The new row exposes a Manufacturer Select with the placeholder
      expect(
        screen.getByText(/select manufacturer/i)
      ).toBeInTheDocument();

      // Force a parent re-render with a fresh onClose callback ref. Before the fix
      // this caused the init useEffect to re-fire (because `form` was in deps and
      // editingItem was a new prop reference each render), wiping the rule row.
      rerender(
        <InventoryItemForm open onClose={vi.fn()} editingItem={null} />
      );

      // The row must still be in the DOM after the re-render.
      expect(
        screen.getByText(/select manufacturer/i)
      ).toBeInTheDocument();
    });

    it('keeps an added rule row when a sibling form field (alternate group mode) changes', () => {
      render(<InventoryItemForm open onClose={vi.fn()} editingItem={null} />);

      // Add a compatibility rule row first.
      fireEvent.click(screen.getByRole('button', { name: /add rule/i }));
      expect(screen.getByText(/select manufacturer/i)).toBeInTheDocument();

      // Open the Alternate Parts Group collapsible and switch the mode to "new".
      fireEvent.click(screen.getByRole('button', { name: /alternate parts group/i }));
      fireEvent.click(screen.getByLabelText(/create new group/i));

      // The rule row must still be present after the alternate-group interaction.
      expect(screen.getByText(/select manufacturer/i)).toBeInTheDocument();
    });
  });
});

describe('compatibilityRuleSchema (parity with editor payload)', () => {
  it('accepts the blank rule shape produced by CompatibilityRulesEditor.handleAddRule', () => {
    // This is the exact shape returned by createBlankRule() in the editor.
    const blankRule = {
      manufacturer: 'Caterpillar',
      model: null,
      match_type: 'exact' as const,
      status: 'unverified' as const
    };

    const parsed = compatibilityRuleSchema.parse(blankRule);

    expect(parsed.manufacturer).toBe('Caterpillar');
    expect(parsed.model).toBeNull();
    expect(parsed.match_type).toBe('exact');
    expect(parsed.status).toBe('unverified');
  });

  it('preserves match_type, status, and notes for a fully populated rule (no silent stripping)', () => {
    const fullRule = {
      manufacturer: 'John Deere',
      model: 'D*T',
      match_type: 'wildcard' as const,
      status: 'verified' as const,
      notes: 'Confirmed by site supervisor'
    };

    const parsed = compatibilityRuleSchema.parse(fullRule);

    expect(parsed.match_type).toBe('wildcard');
    expect(parsed.status).toBe('verified');
    expect(parsed.notes).toBe('Confirmed by site supervisor');
  });

  it('normalizes empty notes to null and applies match_type/status defaults', () => {
    const minimalRule = {
      manufacturer: 'Komatsu',
      model: 'PC200',
      notes: '   '
    };

    const parsed = compatibilityRuleSchema.parse(minimalRule);

    expect(parsed.match_type).toBe('exact');
    expect(parsed.status).toBe('unverified');
    expect(parsed.notes).toBeNull();
  });

  it('rejects invalid match_type values', () => {
    const badRule = {
      manufacturer: 'Caterpillar',
      model: null,
      match_type: 'bogus'
    };

    expect(() => compatibilityRuleSchema.parse(badRule)).toThrow();
  });

  it('round-trips a rule through inventoryItemFormSchema without losing fields', () => {
    const formData = {
      name: 'Filter Element',
      quantity_on_hand: 1,
      compatibilityRules: [
        {
          manufacturer: 'Caterpillar',
          model: 'D6T',
          match_type: 'exact' as const,
          status: 'verified' as const,
          notes: 'OEM'
        }
      ]
    };

    const parsed = inventoryItemFormSchema.parse(formData);
    expect(parsed.compatibilityRules).toHaveLength(1);
    expect(parsed.compatibilityRules[0]).toMatchObject({
      manufacturer: 'Caterpillar',
      model: 'D6T',
      match_type: 'exact',
      status: 'verified',
      notes: 'OEM'
    });
  });
});
