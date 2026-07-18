import { describe, it, expect, vi } from 'vitest';
import { getEquipmentCardDisplayModel } from './getEquipmentCardDisplayModel';
import { testUserSettingsSydney } from '@vitest-harness/utils/TestProviders';
import { formatDate } from '@/utils/dateFormatter';

const settings = testUserSettingsSydney;

describe('getEquipmentCardDisplayModel', () => {
  describe('imageAlt', () => {
    it('generates alt text from equipment name', () => {
      const result = getEquipmentCardDisplayModel(
        {
          name: 'Forklift XL',
          status: 'active',
        },
        settings
      );

      expect(result.imageAlt).toBe('Forklift XL equipment');
    });
  });

  describe('imageFallbackSrc', () => {
    it('returns placeholder.svg path', () => {
      const result = getEquipmentCardDisplayModel(
        {
          name: 'Test Equipment',
          status: 'active',
        },
        settings
      );

      expect(result.imageFallbackSrc).toBe('/placeholder.svg');
    });
  });

  describe('statusLabel', () => {
    it('returns human-readable label for active status', () => {
      const result = getEquipmentCardDisplayModel(
        {
          name: 'Test Equipment',
          status: 'active',
        },
        settings
      );

      expect(result.statusLabel).toBe('Active');
    });

    it('returns human-readable label for maintenance status', () => {
      const result = getEquipmentCardDisplayModel(
        {
          name: 'Test Equipment',
          status: 'maintenance',
        },
        settings
      );

      expect(result.statusLabel).toBe('Under Maintenance');
    });

    it('returns human-readable label for inactive status', () => {
      const result = getEquipmentCardDisplayModel(
        {
          name: 'Test Equipment',
          status: 'inactive',
        },
        settings
      );

      expect(result.statusLabel).toBe('Inactive');
    });
  });

  describe('statusClassName', () => {
    it('returns CSS variable-based classes for active status', () => {
      const result = getEquipmentCardDisplayModel(
        {
          name: 'Test Equipment',
          status: 'active',
        },
        settings
      );

      expect(result.statusClassName).toBe('bg-success/20 text-success border-success/30');
    });

    it('returns CSS variable-based classes for maintenance status', () => {
      const result = getEquipmentCardDisplayModel(
        {
          name: 'Test Equipment',
          status: 'maintenance',
        },
        settings
      );

      expect(result.statusClassName).toBe('bg-warning/20 text-warning border-warning/30');
    });

    it('returns CSS variable-based classes for inactive status', () => {
      const result = getEquipmentCardDisplayModel(
        {
          name: 'Test Equipment',
          status: 'inactive',
        },
        settings
      );

      expect(result.statusClassName).toBe('bg-muted text-muted-foreground border-border');
    });
  });

  describe('lastMaintenanceText', () => {
    it('formats valid date with user timezone settings', () => {
      const lastMaintenance = '2026-01-15';
      const result = getEquipmentCardDisplayModel(
        {
          name: 'Test Equipment',
          status: 'active',
          last_maintenance: lastMaintenance,
        },
        settings
      );

      expect(result.lastMaintenanceText).toBe(
        `Last maintenance: ${formatDate(lastMaintenance, settings)}`
      );
    });

    it('returns undefined when last_maintenance is not provided', () => {
      const result = getEquipmentCardDisplayModel(
        {
          name: 'Test Equipment',
          status: 'active',
        },
        settings
      );

      expect(result.lastMaintenanceText).toBeUndefined();
      expect(result.lastMaintenanceDisplay).toBe('—');
    });

    it('returns undefined for invalid date string', () => {
      const result = getEquipmentCardDisplayModel(
        {
          name: 'Test Equipment',
          status: 'active',
          last_maintenance: 'invalid-date',
        },
        settings
      );

      expect(result.lastMaintenanceText).toBeUndefined();
    });

    it('appends days-ago suffix for mobile display', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2026, 5, 8, 12, 0, 0));

      const result = getEquipmentCardDisplayModel(
        {
          name: 'Test Equipment',
          status: 'active',
          last_maintenance: '2026-06-07',
        },
        settings
      );

      expect(result.lastMaintenanceMobileDisplay).toBe(
        `${formatDate('2026-06-07', settings)} (1 d ago)`,
      );

      vi.useRealTimers();
    });

    it('uses em dash for mobile display when last_maintenance is missing', () => {
      const result = getEquipmentCardDisplayModel(
        {
          name: 'Test Equipment',
          status: 'active',
        },
        settings
      );

      expect(result.lastMaintenanceMobileDisplay).toBe('—');
    });
  });

  describe('workingHoursText', () => {
    it('formats working hours with locale string', () => {
      const result = getEquipmentCardDisplayModel(
        {
          name: 'Test Equipment',
          status: 'active',
          working_hours: 1234,
        },
        settings
      );

      expect(result.workingHoursText).toBe('1,234 hours');
    });

    it('defaults to 0 when working_hours is null', () => {
      const result = getEquipmentCardDisplayModel(
        {
          name: 'Test Equipment',
          status: 'active',
          working_hours: null,
        },
        settings
      );

      expect(result.workingHoursText).toBe('0 hours');
    });

    it('defaults to 0 when working_hours is undefined', () => {
      const result = getEquipmentCardDisplayModel(
        {
          name: 'Test Equipment',
          status: 'active',
        },
        settings
      );

      expect(result.workingHoursText).toBe('0 hours');
    });

    it('handles zero working hours', () => {
      const result = getEquipmentCardDisplayModel(
        {
          name: 'Test Equipment',
          status: 'active',
          working_hours: 0,
        },
        settings
      );

      expect(result.workingHoursText).toBe('0 hours');
    });
  });

  describe('workingHoursShortText', () => {
    it('formats hours with abbreviated unit', () => {
      const result = getEquipmentCardDisplayModel(
        {
          name: 'Test Equipment',
          status: 'active',
          working_hours: 1234,
        },
        settings
      );

      expect(result.workingHoursShortText).toBe('1,234 hrs');
    });

    it('defaults to 0 when working_hours is null', () => {
      const result = getEquipmentCardDisplayModel(
        {
          name: 'Test Equipment',
          status: 'active',
          working_hours: null,
        },
        settings
      );

      expect(result.workingHoursShortText).toBe('0 hrs');
    });
  });
});
