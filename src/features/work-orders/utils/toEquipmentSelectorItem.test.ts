import { describe, expect, it } from 'vitest';
import { toEquipmentSelectorItem } from './toEquipmentSelectorItem';

describe('toEquipmentSelectorItem', () => {
  it('keeps a named last-known location object', () => {
    const item = toEquipmentSelectorItem({
      id: 'eq-1',
      name: 'Loader',
      last_known_location: { name: 'Yard A', latitude: 1 },
    });

    expect(item.last_known_location).toEqual({ name: 'Yard A' });
  });

  it('drops Json last-known location values that are not objects', () => {
    expect(toEquipmentSelectorItem({
      id: 'eq-1',
      name: 'Loader',
      last_known_location: 'Yard A',
    }).last_known_location).toBeNull();

    expect(toEquipmentSelectorItem({
      id: 'eq-1',
      name: 'Loader',
      last_known_location: null,
    }).last_known_location).toBeNull();
  });
});
