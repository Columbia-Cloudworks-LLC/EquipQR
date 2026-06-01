/** Run-scoped unique data for UI-only Playwright creation flows. */

function formatDateOffset(daysFromNow: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString().slice(0, 10);
}

function buildToken(prefix?: string): string {
  const base = `${Date.now()}`.slice(-8);
  return (prefix ? `${prefix}-${base}` : base).toLowerCase().replace(/[^a-z0-9-]/g, '');
}

export type EquipmentCreationData = {
  name: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  status: 'active' | 'maintenance' | 'inactive';
  location: string;
  installationDate: string;
  notes?: string;
};

export type WorkOrderCreationData = {
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  dueDate: string;
};

export type InventoryItemCreationData = {
  name: string;
  sku: string;
  description: string;
  quantityOnHand: number;
  lowStockThreshold: number;
  location: string;
  defaultUnitCost: number;
};

export type AlternateGroupCreationData = {
  name: string;
  description: string;
  status: 'verified';
  notes: string;
  evidenceUrl: string;
};

export type CreationRunData = {
  token: string;
  equipmentWithDefaultPm: EquipmentCreationData;
  equipmentWithoutDefaultPm: EquipmentCreationData;
  genericWorkOrder: WorkOrderCreationData;
  pmWorkOrderWithDefault: WorkOrderCreationData;
  pmWorkOrderWithoutDefault: WorkOrderCreationData;
  inventoryItems: InventoryItemCreationData[];
  alternateGroup: AlternateGroupCreationData;
};

export function buildCreationRunData(prefix?: string): CreationRunData {
  const token = buildToken(prefix);

  const equipmentWithDefaultPm: EquipmentCreationData = {
    manufacturer: 'Toyota',
    model: '8FBU25',
    serialNumber: `PW-${token}-PM`,
    name: `Playwright Toyota Forklift ${token}`,
    status: 'active',
    location: `Bay PW-${token}`,
    installationDate: formatDateOffset(-30),
    notes: `UI-only creation flow equipment with default PM (${token})`,
  };

  const equipmentWithoutDefaultPm: EquipmentCreationData = {
    manufacturer: 'Atlas Copco',
    model: 'XAS 185',
    serialNumber: `PW-${token}-NOPM`,
    name: `Playwright Atlas Compressor ${token}`,
    status: 'active',
    location: `Yard PW-${token}`,
    installationDate: formatDateOffset(-14),
    notes: `UI-only creation flow equipment without default PM (${token})`,
  };

  const inventoryItems: InventoryItemCreationData[] = [
    {
      name: `Playwright Filter A ${token}`,
      sku: `PW-FLT-A-${token}`,
      description: `Primary alternate-group member ${token}`,
      quantityOnHand: 12,
      lowStockThreshold: 3,
      location: `Shelf PW-A-${token}`,
      defaultUnitCost: 24.99,
    },
    {
      name: `Playwright Filter B ${token}`,
      sku: `PW-FLT-B-${token}`,
      description: `Secondary alternate-group member ${token}`,
      quantityOnHand: 8,
      lowStockThreshold: 2,
      location: `Shelf PW-B-${token}`,
      defaultUnitCost: 19.5,
    },
    {
      name: `Playwright Filter C ${token}`,
      sku: `PW-FLT-C-${token}`,
      description: `Tertiary alternate-group member ${token}`,
      quantityOnHand: 5,
      lowStockThreshold: 1,
      location: `Shelf PW-C-${token}`,
      defaultUnitCost: 15.75,
    },
  ];

  return {
    token,
    equipmentWithDefaultPm,
    equipmentWithoutDefaultPm,
    genericWorkOrder: {
      title: `Playwright Generic WO ${token}`,
      description: `Generic work order created by Playwright (${token})`,
      priority: 'medium',
      dueDate: formatDateOffset(7),
    },
    pmWorkOrderWithDefault: {
      title: `Playwright PM WO Default ${token}`,
      description: `PM work order with default checklist (${token})`,
      priority: 'medium',
      dueDate: formatDateOffset(10),
    },
    pmWorkOrderWithoutDefault: {
      title: `Playwright PM WO Manual ${token}`,
      description: `PM work order with manual template selection (${token})`,
      priority: 'medium',
      dueDate: formatDateOffset(14),
    },
    inventoryItems,
    alternateGroup: {
      name: `Playwright Alternate Group ${token}`,
      description: `Cross-reference group for Playwright inventory items (${token})`,
      status: 'verified',
      notes: `Verified by Playwright UI flow ${token}`,
      evidenceUrl: 'https://example.com/equipqr-playwright-cross-reference',
    },
  };
}
