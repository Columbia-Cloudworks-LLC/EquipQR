import {
  organization,
  team,
  teams,
  teamStats,
  workspacePersonalOrgMerge,
  dashboardPreferences,
  productOnboarding,
} from './organization';
import { equipment, equipmentWorkingHours } from './equipment';
import {
  workOrders,
  workOrderEquipment,
  workOrderMetrics,
  exportArtifacts,
} from './workOrders';
import { preventiveMaintenance, pmTemplates, pmTemplateMatching, pmStatus, pmIntervalPolicies } from './pm';
import { quickBooks, googleWorkspace } from './integrations';
import { notifications, inventory, tickets, userAvatars } from './misc';

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
  userAvatars,
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
  productOnboarding,
  pmStatus,
  pmIntervalPolicies,
  exportArtifacts,
};
