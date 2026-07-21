import React from 'react';
import { render, screen, fireEvent, waitFor } from '@vitest-harness/utils/test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InventoryItemForm } from './InventoryItemForm';
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

vi.mock('@/hooks/useGoogleMapsLoader', () => ({
  useGoogleMapsLoader: vi.fn(() => ({ isLoaded: true })),
}));

vi.mock('@/hooks/useGoogleMapsKey', () => ({
  useGoogleMapsKey: vi.fn(() => ({
    googleMapsKey: 'test-key',
    mapId: 'test-map-id',
    isLoading: false,
    error: null,
    retry: vi.fn(),
  })),
}));

vi.mock('@/hooks/useThemeVersion', () => ({
  useIsDarkTheme: vi.fn(() => false),
  useThemeVersion: vi.fn(() => 0),
}));

vi.mock('@/components/ui/GooglePlacesAutocomplete', () => ({
  default: ({
    onPlaceSelect,
  }: {
    onPlaceSelect: (data: {
      formatted_address: string;
      street: string;
      city: string;
      state: string;
      country: string;
      lat: number;
      lng: number;
    }) => void;
  }) => (
    <button
      type="button"
      data-testid="inventory-places-autocomplete"
      onClick={() =>
        onPlaceSelect({
          formatted_address: '100 Storage Ln, Austin, TX, USA',
          street: '100 Storage Ln',
          city: 'Austin',
          state: 'TX',
          country: 'USA',
          lat: 30.27,
          lng: -97.74,
        })
      }
    >
      Search storage address
    </button>
  ),
}));

vi.mock('@/components/location/CenterPinMapPicker', () => ({
  CenterPinMapPicker: () => <div data-testid="center-pin-map-picker" />,
}));

vi.mock('@/components/location/LiveLocationCaptureDialog', () => ({
  LiveLocationCaptureDialog: () => null,
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

// Lightweight editor stub: #602 form-wiring coverage only needs Add Rule + row persistence.
// Full Select UX lives in CompatibilityRulesEditor.test.tsx (#1314).
vi.mock('@/features/inventory/components/CompatibilityRulesEditor', () => ({
  CompatibilityRulesEditor: ({
    rules,
    onChange,
    disabled,
  }: {
    rules: Array<Record<string, unknown>>;
    onChange: (rules: Array<Record<string, unknown>>) => void;
    disabled?: boolean;
  }) => (
    <div>
      <button
        type="button"
        disabled={disabled}
        onClick={() =>
          onChange([
            ...rules,
            {
              manufacturer: '',
              model: null,
              match_type: 'exact',
              status: 'unverified',
            },
          ])
        }
      >
        Add Rule
      </button>
      {rules.length > 0 ? <span>Select manufacturer</span> : null}
    </div>
  ),
}));

describe('InventoryItemForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows Location Name field with nickname-oriented placeholder', () => {
    render(<InventoryItemForm open onClose={vi.fn()} editingItem={null} />);

    expect(screen.getByLabelText(/location name/i)).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/yard cage|storage nickname/i),
    ).toBeInTheDocument();
    expect(screen.getByText('Storage Address')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /use my current location/i })).toBeInTheDocument();
  });

  it('includes structured storage address fields in submitted form data', async () => {
    const { useCreateInventoryItem } = await import('@/features/inventory/hooks/useInventory');
    const mutateAsync = vi.fn().mockResolvedValue({ id: 'new-item-1' });
    vi.mocked(useCreateInventoryItem).mockReturnValue({
      mutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof useCreateInventoryItem>);

    render(<InventoryItemForm open onClose={vi.fn()} editingItem={null} />);

    fireEvent.change(screen.getByLabelText(/^name/i), {
      target: { value: 'Filter Element' },
    });
    fireEvent.change(screen.getByLabelText(/location name/i), {
      target: { value: 'Shelf A' },
    });
    fireEvent.click(screen.getByTestId('inventory-places-autocomplete'));
    fireEvent.click(screen.getByRole('button', { name: /^create item$/i }));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalled();
    });

    const payload = mutateAsync.mock.calls[0][0].formData;
    expect(payload.location).toBe('Shelf A');
    expect(payload.location_address).toBe('100 Storage Ln');
    expect(payload.location_lat).toBe(30.27);
    expect(payload.location_lng).toBe(-97.74);
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
