import type { SelectedTeamId } from '@/contexts/selected-team-context';

export const dashboard = (orgId: string, selectedTeamId: SelectedTeamId | undefined = null) => ({
  teamBasedStats: (userTeamIds: string[], isManager: boolean) =>
    ['team-based-dashboard-stats', orgId, selectedTeamId ?? 'all', userTeamIds, isManager] as const,
  teamBasedEquipment: (userTeamIds: string[], isManager: boolean) =>
    ['team-based-equipment', orgId, selectedTeamId ?? 'all', userTeamIds, isManager] as const,
  teamBasedRecentWorkOrders: (userTeamIds: string[], isManager: boolean) =>
    ['team-based-recent-work-orders', orgId, selectedTeamId ?? 'all', userTeamIds, isManager] as const,
  teamFleetEfficiency: (userTeamIds: string[], isManager: boolean) =>
    ['team-fleet-efficiency', orgId, selectedTeamId ?? 'all', userTeamIds, isManager] as const,
  pmCompliance: (userTeamIds: string[], isManager: boolean) =>
    ['dashboard-pm-compliance', orgId, selectedTeamId ?? 'all', userTeamIds, isManager] as const,
  equipmentByStatus: (userTeamIds: string[], isManager: boolean) =>
    ['dashboard-equipment-by-status', orgId, selectedTeamId ?? 'all', userTeamIds, isManager] as const,
  costTrend: (userTeamIds: string[], isManager: boolean) =>
    ['dashboard-cost-trend', orgId, selectedTeamId ?? 'all', userTeamIds, isManager] as const,
  trends: (days: number) => ['dashboard-trends', orgId, selectedTeamId ?? 'all', days] as const,
});
