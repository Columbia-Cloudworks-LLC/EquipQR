import { lazyWithRetry } from '@/routes/lazyWithRetry';

export const AppSidebar = lazyWithRetry(() => import('@/components/layout/AppSidebar'), 'AppSidebar');
export const TopBar = lazyWithRetry(() => import('@/components/layout/TopBar'), 'TopBar');
export const BottomNav = lazyWithRetry(() => import('@/components/navigation/BottomNav'), 'BottomNav');
export const Dashboard = lazyWithRetry(() => import('@/features/dashboard/pages/Dashboard'), 'Dashboard');
export const Equipment = lazyWithRetry(() => import('@/features/equipment/pages/Equipment'), 'Equipment');
export const BulkEquipment = lazyWithRetry(() => import('@/features/equipment/pages/BulkEquipment'), 'BulkEquipment');
export const EquipmentDetails = lazyWithRetry(() => import('@/features/equipment/pages/EquipmentDetails'), 'EquipmentDetails');
export const EquipmentScanner = lazyWithRetry(() => import('@/features/equipment/pages/EquipmentScanner'), 'EquipmentScanner');
export const WorkOrders = lazyWithRetry(() => import('@/features/work-orders/pages/WorkOrders'), 'WorkOrders');
export const WorkOrderDetails = lazyWithRetry(() => import('@/features/work-orders/pages/WorkOrderDetails'), 'WorkOrderDetails');
export const Teams = lazyWithRetry(() => import('@/features/teams/pages/Teams'), 'Teams');
export const TeamDetails = lazyWithRetry(() => import('@/features/teams/pages/TeamDetails'), 'TeamDetails');
export const FleetMap = lazyWithRetry(() => import('@/features/fleet-map/pages/FleetMap'), 'FleetMap');
export const Organization = lazyWithRetry(() => import('@/features/organization/pages/Organization'), 'Organization');
export const OrganizationMembers = lazyWithRetry(() => import('@/features/organization/pages/OrganizationMembers'), 'OrganizationMembers');
export const OrganizationIntegrations = lazyWithRetry(() => import('@/features/organization/pages/OrganizationIntegrations'), 'OrganizationIntegrations');
export const Settings = lazyWithRetry(() => import('@/pages/Settings'), 'Settings');
export const Reports = lazyWithRetry(() => import('@/features/reports/pages/Reports'), 'Reports');
export const DashboardSupport = lazyWithRetry(
  () => import('@/pages/Support').then((module) => ({ default: module.DashboardSupport })),
  'DashboardSupport',
);
export const PMTemplates = lazyWithRetry(() => import('@/features/pm-templates/pages/PMTemplates'), 'PMTemplates');
export const PMTemplateView = lazyWithRetry(() => import('@/features/pm-templates/pages/PMTemplateView'), 'PMTemplateView');
export const PMTemplateEditor = lazyWithRetry(() => import('@/features/pm-templates/pages/PMTemplateEditor'), 'PMTemplateEditor');
export const Notifications = lazyWithRetry(() => import('@/pages/Notifications'), 'Notifications');
export const WorkspaceOnboarding = lazyWithRetry(() => import('@/pages/WorkspaceOnboarding'), 'WorkspaceOnboarding');
export const GettingStartedOnboarding = lazyWithRetry(
  () => import('@/features/onboarding/pages/GettingStartedOnboarding'),
  'GettingStartedOnboarding',
);
export const InventoryList = lazyWithRetry(() => import('@/features/inventory/pages/InventoryList'), 'InventoryList');
export const BulkInventory = lazyWithRetry(() => import('@/features/inventory/pages/BulkInventory'), 'BulkInventory');
export const InventoryItemDetail = lazyWithRetry(() => import('@/features/inventory/pages/InventoryItemDetail'), 'InventoryItemDetail');
export const PartLookup = lazyWithRetry(() => import('@/features/inventory/pages/PartLookup'), 'PartLookup');
export const AlternateGroupsPage = lazyWithRetry(() => import('@/features/inventory/pages/AlternateGroupsPage'), 'AlternateGroupsPage');
export const AlternateGroupDetail = lazyWithRetry(() => import('@/features/inventory/pages/AlternateGroupDetail'), 'AlternateGroupDetail');
export const AuditLog = lazyWithRetry(() => import('@/pages/AuditLog'), 'AuditLog');
export const DSRCockpitPage = lazyWithRetry(() => import('@/pages/dsr/CockpitPage'), 'DSRCockpitPage');
export const DSRCasePage = lazyWithRetry(() => import('@/pages/dsr/CasePage'), 'DSRCasePage');
