/** Local Supabase seed constants for deterministic Playwright assertions. */

export const apexOrgId = '660e8400-e29b-41d4-a716-446655440000';

export const seedEquipment = {
  cat320: {
    id: 'aa0e8400-e29b-41d4-a716-446655440000',
    name: 'CAT 320 Excavator',
  },
  johnDeereDozer: {
    id: 'aa0e8400-e29b-41d4-a716-446655440001',
    name: 'John Deere 850L Dozer',
  },
} as const;

export const seedWorkOrders = {
  oilChange: {
    id: 'a00e8400-e29b-41d4-a716-446655440001',
    title: 'Oil Change - CAT 320 Excavator',
  },
  hydraulicFilter: {
    id: 'a00e8400-e29b-41d4-a716-446655440002',
    title: 'Replace Hydraulic Filter',
  },
} as const;

export const seedInventory = {
  hydraulicOil: {
    id: 'a20e8400-e29b-41d4-a716-446655440001',
    name: 'Hydraulic Oil 15W-40 (5 Gal)',
    sku: 'HYD-OIL-15W40-5G',
  },
  lowStockFilter: {
    id: 'a20e8400-e29b-41d4-a716-446655440002',
    name: 'Air Filter - Heavy Equipment',
    sku: 'AF-HVY-CAT320',
  },
} as const;

export type PersonaKey = 'owner' | 'admin' | 'technician';

export const personas: Record<
  PersonaKey,
  { displayName: string; email: string; orgLabel: string }
> = {
  owner: {
    displayName: 'Alex Apex',
    email: 'owner@apex.test',
    orgLabel: 'Apex Construction',
  },
  admin: {
    displayName: 'Amanda Admin',
    email: 'admin@apex.test',
    orgLabel: 'Apex Construction',
  },
  technician: {
    displayName: 'Tom Technician',
    email: 'tech@apex.test',
    orgLabel: 'Apex Construction',
  },
};

export function authStatePath(persona: PersonaKey): string {
  return `tmp/playwright/auth/${persona}.json`;
}
