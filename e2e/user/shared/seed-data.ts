/** Local Supabase seed constants for deterministic Playwright assertions. */

export const apexOrgId = '660e8400-e29b-41d4-a716-446655440000';
export const metroOrgId = '660e8400-e29b-41d4-a716-446655440001';
export const valleyOrgId = '660e8400-e29b-41d4-a716-446655440002';
export const industrialOrgId = '660e8400-e29b-41d4-a716-446655440003';
export const freshStartOrgId = '660e8400-e29b-41d4-a716-446655440009';
/** Dedicated org for permanent cursed historical timeline fixtures (#1279). */
export const cursedHistoricalOrgId = '660e8400-e29b-41d4-a716-446655440011';

export const orgIds = {
  apex: apexOrgId,
  metro: metroOrgId,
  valley: valleyOrgId,
  industrial: industrialOrgId,
  cursedHistorical: cursedHistoricalOrgId,
} as const;

export const orgNames = {
  metro: /metro equipment services/i,
} as const;

export const seedEquipment = {
  cat320: {
    id: 'aa0e8400-e29b-41d4-a716-446655440000',
    name: 'CAT 320 Excavator',
    serialNumber: 'CAT320GC2023001',
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
  submitted: {
    id: 'a00e8400-e29b-41d4-a716-446655440002',
    title: 'Replace Hydraulic Filter',
  },
  onHold: {
    id: 'a00e8400-e29b-41d4-a716-446655440003',
    title: 'Light Tower Bulb Replacement',
  },
  completed: {
    id: 'a00e8400-e29b-41d4-a716-446655440004',
    title: 'Track Tension Adjustment',
  },
  cancelled: {
    id: 'a00e8400-e29b-41d4-a716-446655440005',
    title: 'Generator Fuel System Check',
  },
  bobcatPm: {
    id: 'a00e8400-e29b-41d4-a716-446655440114',
    title: '200-Hour PM - Bobcat S770 Skid Steer',
  },
  /** Apex completed WO + completed PM — used for admin Revert PM Completion (#1277). */
  apexCompletedPm: {
    id: 'a00e8400-e29b-41d4-a716-446655440101',
    title: '250-Hour PM - CAT 320 Excavator',
  },
  accepted: {
    id: 'a00e8400-e29b-41d4-a716-446655440012',
    title: 'Scissor Lift Hydraulic Repair',
  },
  assigned: {
    id: 'a00e8400-e29b-41d4-a716-446655440010',
    title: 'Pre-Rental Inspection - Skid Steer',
  },
  viewerBobcatPm: {
    id: 'a00e8400-e29b-41d4-a716-446655440115',
    title: 'Customer Service PM - Bobcat S570',
  },
} as const;

/** Permanent cursed historical timeline WOs (#1279) — see supabase/seeds/31_cursed_historical_timeline.sql */
export const cursedHistoricalWorkOrders = {
  acceptedFirstStub: {
    id: 'a00e8400-e29b-41d4-a716-446655440c01',
    title: 'Cursed Legacy Accepted Stub',
  },
  multiEventInProgress: {
    id: 'a00e8400-e29b-41d4-a716-446655440c02',
    title: 'Cursed Legacy Multi-Event In Progress',
  },
  longInProgressChain: {
    id: 'a00e8400-e29b-41d4-a716-446655440c03',
    title: 'Cursed Long In-Progress Chain',
  },
  happyPathSubmittedFirst: {
    id: 'a00e8400-e29b-41d4-a716-446655440c04',
    title: 'Cursed Happy Path Submitted First',
  },
  missingAssigneeBoundary: {
    id: 'a00e8400-e29b-41d4-a716-446655440c05',
    title: 'Cursed Boundary Missing Assignee',
  },
  outOfOrderTimestampsBoundary: {
    id: 'a00e8400-e29b-41d4-a716-446655440c06',
    title: 'Cursed Boundary Out-Of-Order Timestamps',
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

export const seedTeams = {
  apexHeavyEquipment: {
    id: '880e8400-e29b-41d4-a716-446655440000',
    name: /heavy equipment/i,
  },
} as const;

export const seedPmTemplates = {
  forklift: {
    id: 'cc0e8400-e29b-41d4-a716-446655440001',
    name: /forklift pm/i,
  },
  excavator: {
    id: 'cc0e8400-e29b-41d4-a716-446655440005',
    name: /excavator pm/i,
  },
} as const;

export const pendingInviteeUserId = 'bb0e8400-e29b-41d4-a716-446655440010';
export const pendingInviteePersonalOrgId = '660e8400-e29b-41d4-a716-446655440010';
export const pendingApexInvitationId = 'b00e8400-e29b-41d4-a716-446655440001';

export const seedInvitations = {
  pendingApex: {
    id: pendingApexInvitationId,
    token: 'e2e00000-e29b-41d4-a716-446655440001',
    email: 'e2e.invitee.pending@apex.test',
    userId: pendingInviteeUserId,
  },
} as const;

export const seedDsr = {
  processingCase: {
    id: 'f00e8400-e29b-41d4-a716-446655440001',
  },
} as const;

export const devPassword = 'password123';

export type PersonaKey =
  | 'owner'
  | 'admin'
  | 'technician'
  | 'metroOwner'
  | 'metroTech'
  | 'valleyOwner'
  | 'industrialOwner'
  | 'onboardingOwner'
  | 'multiOrg'
  | 'pendingInvitee';

export const personas: Record<
  PersonaKey,
  { displayName: string; email: string; orgLabel: string; defaultOrgId?: string }
> = {
  owner: {
    displayName: 'Alex Apex',
    email: 'owner@apex.test',
    orgLabel: 'Apex Construction',
    defaultOrgId: apexOrgId,
  },
  admin: {
    displayName: 'Amanda Admin',
    email: 'admin@apex.test',
    orgLabel: 'Apex Construction',
    defaultOrgId: apexOrgId,
  },
  technician: {
    displayName: 'Tom Technician',
    email: 'tech@apex.test',
    orgLabel: 'Apex Construction',
    defaultOrgId: apexOrgId,
  },
  metroOwner: {
    displayName: 'Marcus Metro',
    email: 'owner@metro.test',
    orgLabel: 'Metro Equipment',
    defaultOrgId: metroOrgId,
  },
  metroTech: {
    displayName: 'Mike Mechanic',
    email: 'tech@metro.test',
    orgLabel: 'Metro Equipment',
    defaultOrgId: metroOrgId,
  },
  valleyOwner: {
    displayName: 'Victor Valley',
    email: 'owner@valley.test',
    orgLabel: 'Valley Landscaping',
    defaultOrgId: valleyOrgId,
  },
  industrialOwner: {
    displayName: 'Irene Industrial',
    email: 'owner@industrial.test',
    orgLabel: 'Industrial Rentals',
    defaultOrgId: industrialOrgId,
  },
  onboardingOwner: {
    displayName: 'Fresh Start Owner',
    email: 'owner@freshstart.test',
    orgLabel: 'Fresh Start Equipment Co',
    defaultOrgId: freshStartOrgId,
  },
  multiOrg: {
    displayName: 'Multi Org User',
    email: 'multi@equipqr.test',
    orgLabel: 'ALL Organizations',
    defaultOrgId: apexOrgId,
  },
  pendingInvitee: {
    displayName: 'E2E Pending Invitee',
    email: 'e2e.invitee.pending@apex.test',
    orgLabel: 'Invitee Personal Workspace',
    defaultOrgId: pendingInviteePersonalOrgId,
  },
};

export const setupPersonas: PersonaKey[] = [
  'owner',
  'admin',
  'technician',
  'metroOwner',
  'metroTech',
  'valleyOwner',
  'industrialOwner',
  'onboardingOwner',
  'multiOrg',
  'pendingInvitee',
];

export function authStatePath(persona: PersonaKey): string {
  return `tmp/playwright/auth/${persona}.json`;
}
