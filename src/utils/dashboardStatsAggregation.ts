type StatusRow = { status: string };

export type BasicDashboardStats = {
  totalEquipment: number;
  activeEquipment: number;
  maintenanceEquipment: number;
  totalWorkOrders: number;
};

export function aggregateBasicDashboardStats(
  equipment: StatusRow[],
  workOrders: StatusRow[],
): BasicDashboardStats {
  return {
    totalEquipment: equipment.length,
    activeEquipment: equipment.filter((e) => e.status === 'active').length,
    maintenanceEquipment: equipment.filter((e) => e.status === 'maintenance').length,
    totalWorkOrders: workOrders.length,
  };
}

export type ExtendedDashboardStats = BasicDashboardStats & {
  completedWorkOrders: number;
  pendingWorkOrders: number;
};

export function aggregateExtendedDashboardStats(
  equipment: StatusRow[],
  workOrders: StatusRow[],
): ExtendedDashboardStats {
  return {
    ...aggregateBasicDashboardStats(equipment, workOrders),
    completedWorkOrders: workOrders.filter((wo) => wo.status === 'completed').length,
    pendingWorkOrders: workOrders.filter(
      (wo) => !['completed', 'cancelled'].includes(wo.status),
    ).length,
  };
}
