import React from 'react';
import { render, screen } from '@/test/utils/test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Tables } from '@/integrations/supabase/types';
import { EquipmentLocationField } from '../EquipmentLocationField';

vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: vi.fn(() => false),
}));

vi.mock('@/components/ui/ClickableAddress', () => ({
  default: ({ address }: { address?: string }) => (
    <span data-testid="clickable-address">{address}</span>
  ),
}));

import { useIsMobile } from '@/hooks/use-mobile';

const mockUseIsMobile = vi.mocked(useIsMobile);

const baseProps = {
  teams: [],
  canEdit: true,
  isEditing: false,
  isSaving: false,
  isMapsLoaded: false,
  onStartEdit: vi.fn(),
  onCancelEdit: vi.fn(),
  onSave: vi.fn().mockResolvedValue(undefined),
};

const structuredAddressEquipment = {
  id: 'eq-1',
  use_team_location: false,
  assigned_location_street: '123 Main St',
  assigned_location_city: 'Austin',
  assigned_location_state: 'TX',
  assigned_location_country: 'USA',
  assigned_location_lat: 30.2672,
  assigned_location_lng: -97.7431,
  location: null,
} as Tables<'equipment'>;

const legacyLocationEquipment = {
  id: 'eq-2',
  use_team_location: false,
  assigned_location_street: null,
  assigned_location_city: null,
  assigned_location_state: null,
  assigned_location_country: null,
  location: 'Old warehouse',
} as Tables<'equipment'>;

describe('EquipmentLocationField', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseIsMobile.mockReturnValue(false);
  });

  describe('structured address readout', () => {
    it('anchors the edit trigger on the right on mobile', () => {
      mockUseIsMobile.mockReturnValue(true);
      render(
        <EquipmentLocationField
          {...baseProps}
          equipment={structuredAddressEquipment}
        />,
      );

      const editButton = screen.getByRole('button', { name: 'Edit location' });
      expect(editButton.parentElement?.className).toContain('justify-between');
      expect(editButton.className).toContain('h-11');
      expect(editButton.className).not.toContain('opacity-0');
    });

    it('keeps desktop hover-reveal on the edit icon', () => {
      mockUseIsMobile.mockReturnValue(false);
      render(
        <EquipmentLocationField
          {...baseProps}
          equipment={structuredAddressEquipment}
        />,
      );

      const editButton = screen.getByRole('button', { name: 'Edit location' });
      expect(editButton.parentElement?.className).toContain('group');
      expect(editButton.className).toContain('opacity-0');
      expect(editButton.className).toContain('group-hover:opacity-100');
    });
  });

  describe('legacy location readout', () => {
    it('anchors the edit trigger on the right on mobile', () => {
      mockUseIsMobile.mockReturnValue(true);
      render(
        <EquipmentLocationField
          {...baseProps}
          equipment={legacyLocationEquipment}
        />,
      );

      const editButton = screen.getByRole('button', { name: 'Edit location' });
      expect(editButton.parentElement?.className).toContain('justify-between');
      expect(editButton.className).toContain('h-11');
      expect(editButton.className).not.toContain('opacity-0');
    });

    it('keeps desktop hover-reveal on the edit icon', () => {
      mockUseIsMobile.mockReturnValue(false);
      render(
        <EquipmentLocationField
          {...baseProps}
          equipment={legacyLocationEquipment}
        />,
      );

      const editButton = screen.getByRole('button', { name: 'Edit location' });
      expect(editButton.parentElement?.className).toContain('group');
      expect(editButton.className).toContain('opacity-0');
      expect(editButton.className).toContain('group-hover:opacity-100');
    });
  });
});
