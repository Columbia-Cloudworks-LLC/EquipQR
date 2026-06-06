import { Suspense } from 'react';
import { Route } from 'react-router-dom';
import SmartLanding from '@/components/landing/SmartLanding';
import {
  Auth,
  DebugAuth,
  DebugScanFeedback,
  RepairShops,
  PMTemplatesFeature,
  InventoryManagementFeature,
  PartLookupAlternatesFeature,
  QRCodeIntegrationFeature,
  GoogleWorkspaceFeature,
  QuickBooksFeature,
  WorkOrderManagementFeature,
  TeamCollaborationFeature,
  FleetVisualizationFeature,
  CustomerCRMFeature,
  MobileFirstDesignFeature,
  Support,
  InvitationAccept,
  InventoryQRRedirect,
  EquipmentQRScan,
  WorkOrderQRRedirect,
  LegacyEquipmentQRRedirect,
  TermsOfService,
  PrivacyPolicy,
  PrivacyRequest,
  DoNotSellOrShare,
  Security,
} from '@/routes/lazyPublicPages';
import { LandingCanonicalRedirect } from '@/routes/redirects';
import { qrRouteFallback, textRouteFallback } from '@/routes/routerConfig';

const LazyRoute = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={textRouteFallback}>{children}</Suspense>
);

export const publicRouteElements = (
  <>
    <Route path="/" element={<SmartLanding />} />
    <Route path="/landing" element={<LandingCanonicalRedirect />} />
    <Route path="/auth" element={<LazyRoute><Auth /></LazyRoute>} />
    {import.meta.env.DEV && DebugAuth && (
      <Route path="/debug-auth" element={<LazyRoute><DebugAuth /></LazyRoute>} />
    )}
    {import.meta.env.DEV && DebugScanFeedback && (
      <Route path="/debug-scan-feedback" element={<LazyRoute><DebugScanFeedback /></LazyRoute>} />
    )}
    <Route path="/solutions/repair-shops" element={<LazyRoute><RepairShops /></LazyRoute>} />
    <Route path="/features/pm-templates" element={<LazyRoute><PMTemplatesFeature /></LazyRoute>} />
    <Route path="/features/inventory" element={<LazyRoute><InventoryManagementFeature /></LazyRoute>} />
    <Route path="/features/part-lookup-alternates" element={<LazyRoute><PartLookupAlternatesFeature /></LazyRoute>} />
    <Route path="/features/qr-code-integration" element={<LazyRoute><QRCodeIntegrationFeature /></LazyRoute>} />
    <Route path="/features/google-workspace" element={<LazyRoute><GoogleWorkspaceFeature /></LazyRoute>} />
    <Route path="/features/quickbooks" element={<LazyRoute><QuickBooksFeature /></LazyRoute>} />
    <Route path="/features/work-order-management" element={<LazyRoute><WorkOrderManagementFeature /></LazyRoute>} />
    <Route path="/features/team-collaboration" element={<LazyRoute><TeamCollaborationFeature /></LazyRoute>} />
    <Route path="/features/fleet-visualization" element={<LazyRoute><FleetVisualizationFeature /></LazyRoute>} />
    <Route path="/features/customer-crm" element={<LazyRoute><CustomerCRMFeature /></LazyRoute>} />
    <Route path="/features/mobile-first-design" element={<LazyRoute><MobileFirstDesignFeature /></LazyRoute>} />
    <Route path="/support" element={<LazyRoute><Support /></LazyRoute>} />
    <Route path="/invitation/:token" element={<LazyRoute><InvitationAccept /></LazyRoute>} />
    <Route path="/qr/inventory/:itemId" element={<Suspense fallback={qrRouteFallback}><InventoryQRRedirect /></Suspense>} />
    <Route path="/qr/equipment/:equipmentId" element={<Suspense fallback={qrRouteFallback}><EquipmentQRScan /></Suspense>} />
    <Route path="/qr/work-order/:workOrderId" element={<Suspense fallback={qrRouteFallback}><WorkOrderQRRedirect /></Suspense>} />
    {/* Legacy QR route: must remain after the more specific /qr/* routes so they are matched first. */}
    <Route path="/qr/:equipmentId" element={<Suspense fallback={qrRouteFallback}><LegacyEquipmentQRRedirect /></Suspense>} />
    <Route path="/terms-of-service" element={<LazyRoute><TermsOfService /></LazyRoute>} />
    <Route path="/privacy-policy" element={<LazyRoute><PrivacyPolicy /></LazyRoute>} />
    <Route path="/privacy-request" element={<LazyRoute><PrivacyRequest /></LazyRoute>} />
    <Route path="/do-not-sell-or-share" element={<LazyRoute><DoNotSellOrShare /></LazyRoute>} />
    <Route path="/security" element={<LazyRoute><Security /></LazyRoute>} />
  </>
);
