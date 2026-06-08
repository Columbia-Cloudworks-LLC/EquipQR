import { describe, it, expect } from 'vitest';
import {
  getEquipmentStatusBackgroundTint,
  getEquipmentStatusBorderClass,
  getEquipmentStatusRailClass,
} from '@/lib/status-colors';

describe('equipment status rail classes', () => {
  it('returns no border, rail, or tint for active equipment', () => {
    expect(getEquipmentStatusBorderClass('active')).toBe('');
    expect(getEquipmentStatusRailClass('active')).toBe('');
    expect(getEquipmentStatusBackgroundTint('active')).toBe('');
  });

  it('returns maintenance rail and tint for maintenance status', () => {
    expect(getEquipmentStatusBorderClass('maintenance')).toContain('border-l-equipment-maintenance');
    expect(getEquipmentStatusRailClass('maintenance')).toBe('bg-equipment-maintenance');
    expect(getEquipmentStatusBackgroundTint('maintenance')).toContain('equipment-maintenance');
  });

  it('returns retired rail for inactive status', () => {
    expect(getEquipmentStatusBorderClass('inactive')).toContain('border-l-equipment-retired');
    expect(getEquipmentStatusRailClass('inactive')).toBe('bg-equipment-retired');
  });
});
