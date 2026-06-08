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
  OrganizationIntegrations,
  PMTemplates,
  PMTemplateEditor,
  PMTemplateView,
  Notifications,
  Settings,
  WorkspaceOnboarding,
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
} from '@/routes/lazyDashboardPages';

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
    <Route path="/organization/integrations" element={<OrganizationIntegrations />} />
    <Route path="/pm-templates" element={<PMTemplates />} />
    <Route path="/pm-templates/new" element={<PMTemplateEditor />} />
    <Route path="/pm-templates/:templateId/edit" element={<PMTemplateEditor />} />
    <Route path="/pm-templates/:templateId" element={<PMTemplateView />} />
    <Route path="/pm-templates/:templateId/view" element={<PMTemplateView />} />
    <Route path="/notifications" element={<Notifications />} />
    <Route path="/settings" element={<Settings />} />
    <Route path="/onboarding/workspace" element={<WorkspaceOnboarding />} />
    <Route path="/reports" element={<Reports />} />
    <Route path="/inventory" element={<InventoryList />} />
    <Route path="/inventory/bulk" element={<BulkInventory />} />
    <Route path="/inventory/:itemId" element={<InventoryItemDetail />} />
    <Route path="/part-lookup" element={<PartLookup />} />
    <Route path="/alternate-groups" element={<AlternateGroupsPage />} />
    <Route path="/alternate-groups/:groupId" element={<AlternateGroupDetail />} />
    <Route path="/support" element={<DashboardSupport />} />
    <Route path="/audit-log" element={<AuditLog />} />
    <Route path="/dsr" element={<DSRCockpitPage />} />
    <Route path="/dsr/:requestId" element={<DSRCasePage />} />
  </>
);
