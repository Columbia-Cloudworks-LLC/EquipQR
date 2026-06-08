import { organization, team, teams, teamStats, workspacePersonalOrgMerge, dashboardPreferences } from './organization';
import { equipment, equipmentWorkingHours } from './equipment';
import {
  workOrders,
  workOrderEquipment,
  workOrderMetrics,
  workOrderExports,
  exportArtifacts,
} from './workOrders';
import { preventiveMaintenance, pmTemplates, pmTemplateMatching, pmStatus } from './pm';
import { quickBooks, googleWorkspace } from './integrations';
import { notifications, inventory, tickets } from './misc';

// Legacy query keys for backward compatibility - these should eventually be migrated
export const queryKeys = {
  organization,
  team,
  teams,
  teamStats,
  equipment,
  workOrders,
  preventiveMaintenance,
  notifications,
  pmTemplates,
  pmTemplateMatching,
  inventory,
  quickBooks,
  googleWorkspace,
  workOrderEquipment,
  workOrderMetrics,
  equipmentWorkingHours,
  workspacePersonalOrgMerge,
  tickets,
  dashboardPreferences,
  pmStatus,
  exportArtifacts,
};
