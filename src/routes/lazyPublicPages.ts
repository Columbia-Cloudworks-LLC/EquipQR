import { lazy } from 'react';

export const Auth = lazy(() => import('@/pages/Auth'));
export const DebugAuth = import.meta.env.DEV ? lazy(() => import('@/pages/DebugAuth')) : null;
export const DebugScanFeedback = import.meta.env.DEV ? lazy(() => import('@/pages/DebugScanFeedback')) : null;
export const RepairShops = lazy(() => import('@/pages/solutions/RepairShops'));
export const PMTemplatesFeature = lazy(() => import('@/pages/features/PMTemplates'));
export const InventoryManagementFeature = lazy(() => import('@/pages/features/InventoryManagement'));
export const PartLookupAlternatesFeature = lazy(() => import('@/pages/features/PartLookupAlternates'));
export const QRCodeIntegrationFeature = lazy(() => import('@/pages/features/QRCodeIntegration'));
export const GoogleWorkspaceFeature = lazy(() => import('@/pages/features/GoogleWorkspace'));
export const QuickBooksFeature = lazy(() => import('@/pages/features/QuickBooks'));
export const WorkOrderManagementFeature = lazy(() => import('@/pages/features/WorkOrderManagement'));
export const TeamCollaborationFeature = lazy(() => import('@/pages/features/TeamCollaboration'));
export const FleetVisualizationFeature = lazy(() => import('@/pages/features/FleetVisualization'));
export const CustomerCRMFeature = lazy(() => import('@/pages/features/CustomerCRM'));
export const MobileFirstDesignFeature = lazy(() => import('@/pages/features/MobileFirstDesign'));

export const EquipmentQRScan = lazy(() => import('@/features/equipment/pages/EquipmentQRScan'));
export const InventoryQRRedirect = lazy(() => import('@/pages/InventoryQRRedirect'));
export const WorkOrderQRRedirect = lazy(() => import('@/pages/WorkOrderQRRedirect'));
export const LegacyEquipmentQRRedirect = lazy(() => import('@/pages/LegacyEquipmentQRRedirect'));
export const Support = lazy(() => import('@/pages/Support'));
export const InvitationAccept = lazy(() => import('@/pages/InvitationAccept'));
export const TermsOfService = lazy(() => import('@/pages/TermsOfService'));
export const PrivacyPolicy = lazy(() => import('@/pages/PrivacyPolicy'));
export const PrivacyRequest = lazy(() => import('@/pages/PrivacyRequest'));
export const DoNotSellOrShare = lazy(() => import('@/pages/DoNotSellOrShare'));
export const Security = lazy(() => import('@/pages/Security'));
export const OperatorCheckInPublicPage = lazy(
  () => import('@/features/operator-check-ins/pages/OperatorCheckInPublicPage'),
);
