import { Route } from 'react-router-dom';
import {
  Dashboard,
  Equipment,
  BulkEquipment,
  EquipmentDetails,
  EquipmentScanner,
  WorkOrders,
  WorkOrderDetails,
  Teams,
  TeamDetails,
  FleetMap,
  Organization,
  OrganizationMembers,
  OrganizationIntegrations,
  PMTemplates,
  PMTemplateEditor,
  PMTemplateView,
  Notifications,
  Settings,
  WorkspaceOnboarding,
  GettingStartedOnboarding,
  Reports,
  InventoryList,
  BulkInventory,
  InventoryItemDetail,
  PartLookup,
  AlternateGroupsPage,
  AlternateGroupDetail,
  DashboardSupport,
  AuditLog,
  DSRCockpitPage,
  DSRCasePage,
  OperatorCheckInsPage,
} from '@/routes/lazyDashboardPages';
import { InventoryAccessGuard } from '@/features/inventory/components/InventoryAccessGuard';

export const dashboardRouteElements = (
  <>
    <Route path="/" element={<Dashboard />} />
    <Route path="/equipment" element={<Equipment />} />
    <Route path="/equipment/bulk" element={<BulkEquipment />} />
    <Route path="/equipment/:equipmentId" element={<EquipmentDetails />} />
    <Route path="/scan" element={<EquipmentScanner />} />
    <Route path="/work-orders" element={<WorkOrders />} />
    <Route path="/work-orders/:workOrderId" element={<WorkOrderDetails />} />
    <Route path="/teams" element={<Teams />} />
    <Route path="/teams/:teamId" element={<TeamDetails />} />
    <Route path="/fleet-map" element={<FleetMap />} />
    <Route path="/organization" element={<Organization />} />
    <Route path="/organization/members" element={<OrganizationMembers />} />
    <Route path="/organization/integrations" element={<OrganizationIntegrations />} />
    <Route path="/pm-templates" element={<PMTemplates />} />
    <Route path="/pm-templates/new" element={<PMTemplateEditor />} />
    <Route path="/pm-templates/:templateId/edit" element={<PMTemplateEditor />} />
    <Route path="/pm-templates/:templateId" element={<PMTemplateView />} />
    <Route path="/pm-templates/:templateId/view" element={<PMTemplateView />} />
    <Route path="/notifications" element={<Notifications />} />
    <Route path="/settings" element={<Settings />} />
    <Route path="/onboarding/workspace" element={<WorkspaceOnboarding />} />
    <Route path="/onboarding/getting-started" element={<GettingStartedOnboarding />} />
    <Route path="/reports" element={<Reports />} />
    <Route path="/operator-check-ins" element={<OperatorCheckInsPage />} />
    <Route path="/inventory" element={<InventoryAccessGuard><InventoryList /></InventoryAccessGuard>} />
    <Route path="/inventory/bulk" element={<InventoryAccessGuard><BulkInventory /></InventoryAccessGuard>} />
    <Route path="/inventory/:itemId" element={<InventoryAccessGuard><InventoryItemDetail /></InventoryAccessGuard>} />
    <Route path="/part-lookup" element={<InventoryAccessGuard title="Part lookup access required"><PartLookup /></InventoryAccessGuard>} />
    <Route path="/alternate-groups" element={<InventoryAccessGuard title="Alternate groups access required"><AlternateGroupsPage /></InventoryAccessGuard>} />
    <Route path="/alternate-groups/:groupId" element={<InventoryAccessGuard title="Alternate groups access required"><AlternateGroupDetail /></InventoryAccessGuard>} />
    <Route path="/support" element={<DashboardSupport />} />
    <Route path="/audit-log" element={<AuditLog />} />
    <Route path="/dsr" element={<DSRCockpitPage />} />
    <Route path="/dsr/:requestId" element={<DSRCasePage />} />
  </>
);
