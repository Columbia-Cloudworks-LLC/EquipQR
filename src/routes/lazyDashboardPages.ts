import { lazy } from 'react';

export const AppSidebar = lazy(() => import('@/components/layout/AppSidebar'));
export const TopBar = lazy(() => import('@/components/layout/TopBar'));
export const BottomNav = lazy(() => import('@/components/navigation/BottomNav'));
export const Dashboard = lazy(() => import('@/features/dashboard/pages/Dashboard'));
export const Equipment = lazy(() => import('@/features/equipment/pages/Equipment'));
export const BulkEquipment = lazy(() => import('@/features/equipment/pages/BulkEquipment'));
export const EquipmentDetails = lazy(() => import('@/features/equipment/pages/EquipmentDetails'));
export const EquipmentScanner = lazy(() => import('@/features/equipment/pages/EquipmentScanner'));
export const WorkOrders = lazy(() => import('@/features/work-orders/pages/WorkOrders'));
export const WorkOrderDetails = lazy(() => import('@/features/work-orders/pages/WorkOrderDetails'));
export const Teams = lazy(() => import('@/features/teams/pages/Teams'));
export const TeamDetails = lazy(() => import('@/features/teams/pages/TeamDetails'));
export const FleetMap = lazy(() => import('@/features/fleet-map/pages/FleetMap'));
export const Organization = lazy(() => import('@/features/organization/pages/Organization'));
export const OrganizationIntegrations = lazy(() => import('@/features/organization/pages/OrganizationIntegrations'));
export const Settings = lazy(() => import('@/pages/Settings'));
export const Reports = lazy(() => import('@/features/reports/pages/Reports'));
export const DashboardSupport = lazy(() =>
  import('@/pages/Support').then((module) => ({ default: module.DashboardSupport })),
);
export const PMTemplates = lazy(() => import('@/features/pm-templates/pages/PMTemplates'));
export const PMTemplateView = lazy(() => import('@/features/pm-templates/pages/PMTemplateView'));
export const PMTemplateEditor = lazy(() => import('@/features/pm-templates/pages/PMTemplateEditor'));
export const Notifications = lazy(() => import('@/pages/Notifications'));
export const WorkspaceOnboarding = lazy(() => import('@/pages/WorkspaceOnboarding'));
export const GettingStartedOnboarding = lazy(
  () => import('@/features/onboarding/pages/GettingStartedOnboarding'),
);
export const InventoryList = lazy(() => import('@/features/inventory/pages/InventoryList'));
export const BulkInventory = lazy(() => import('@/features/inventory/pages/BulkInventory'));
export const InventoryItemDetail = lazy(() => import('@/features/inventory/pages/InventoryItemDetail'));
export const PartLookup = lazy(() => import('@/features/inventory/pages/PartLookup'));
export const AlternateGroupsPage = lazy(() => import('@/features/inventory/pages/AlternateGroupsPage'));
export const AlternateGroupDetail = lazy(() => import('@/features/inventory/pages/AlternateGroupDetail'));
export const AuditLog = lazy(() => import('@/pages/AuditLog'));
export const DSRCockpitPage = lazy(() => import('@/pages/dsr/CockpitPage'));
export const DSRCasePage = lazy(() => import('@/pages/dsr/CasePage'));
