/**
 * Every flow in the screen catalog, in gallery order.
 *
 * Not catalogued on mobile, on purpose:
 * - /dashboard/equipment/bulk and /dashboard/inventory/bulk redirect to their lists below md.
 * - /dashboard/operator/provision is for DFY operator accounts only.
 * - /dashboard/onboarding/* only renders for orgs that have not finished onboarding.
 * - /debug-* routes are dev diagnostics.
 */
import type { CatalogFlow } from '../types';
import { accountFlow, fieldOpsFlow, organizationFlow, teamsFlow } from './organization';
import { dashboardFlow, notificationsFlow } from './home';
import { equipmentFlow, fleetMapFlow, scanFlow } from './fleet';
import { inventoryFlow, partLookupFlow } from './inventory';
import { pmTemplatesFlow, workOrdersFlow } from './maintenance';
import { authFlow, operatorCheckInPublicFlow, publicLegalFlow, publicMarketingFlow } from './public';

export const catalogFlows: CatalogFlow[] = [
  authFlow,
  publicMarketingFlow,
  publicLegalFlow,
  dashboardFlow,
  notificationsFlow,
  equipmentFlow,
  fleetMapFlow,
  workOrdersFlow,
  pmTemplatesFlow,
  inventoryFlow,
  partLookupFlow,
  scanFlow,
  fieldOpsFlow,
  operatorCheckInPublicFlow,
  teamsFlow,
  organizationFlow,
  accountFlow,
];
