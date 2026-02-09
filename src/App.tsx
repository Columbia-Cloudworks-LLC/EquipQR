
import { Routes, Route, Navigate, useParams } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { AppProviders } from '@/components/providers/AppProviders';
import { TeamProvider } from '@/contexts/TeamContext';
import { SimpleOrganizationProvider } from '@/contexts/SimpleOrganizationProvider'; // Fixed import path
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import WorkspaceOnboardingGuard from '@/components/auth/WorkspaceOnboardingGuard';
import { BugReportProvider } from '@/features/tickets/context/BugReportContext';

// Critical components loaded eagerly to prevent loading issues for unauthenticated users
import Auth from '@/pages/Auth';
import SmartLanding from '@/components/landing/SmartLanding';
const DebugAuth = import.meta.env.DEV ? lazy(() => import('@/pages/DebugAuth')) : null;
import Landing from '@/pages/Landing';
const RepairShops = lazy(() => import('@/pages/solutions/RepairShops'));
const PMTemplatesFeature = lazy(() => import('@/pages/features/PMTemplates'));
const InventoryManagementFeature = lazy(() => import('@/pages/features/InventoryManagement'));
const PartLookupAlternatesFeature = lazy(() => import('@/pages/features/PartLookupAlternates'));
const QRCodeIntegrationFeature = lazy(() => import('@/pages/features/QRCodeIntegration'));
const GoogleWorkspaceFeature = lazy(() => import('@/pages/features/GoogleWorkspace'));
const QuickBooksFeature = lazy(() => import('@/pages/features/QuickBooks'));
const WorkOrderManagementFeature = lazy(() => import('@/pages/features/WorkOrderManagement'));
const TeamCollaborationFeature = lazy(() => import('@/pages/features/TeamCollaboration'));
const FleetVisualizationFeature = lazy(() => import('@/pages/features/FleetVisualization'));
const CustomerCRMFeature = lazy(() => import('@/pages/features/CustomerCRM'));
const MobileFirstDesignFeature = lazy(() => import('@/pages/features/MobileFirstDesign'));

// Dashboard components can be lazy-loaded since they're only needed after auth
const AppSidebar = lazy(() => import('@/components/layout/AppSidebar'));
const TopBar = lazy(() => import('@/components/layout/TopBar'));
const LegalFooter = lazy(() => import('@/components/layout/LegalFooter'));
const BottomNav = lazy(() => import('@/components/navigation/BottomNav'));
const Dashboard = lazy(() => import('@/features/dashboard/pages/Dashboard'));
const Equipment = lazy(() => import('@/features/equipment/pages/Equipment'));
const EquipmentDetails = lazy(() => import('@/features/equipment/pages/EquipmentDetails'));
const WorkOrders = lazy(() => import('@/features/work-orders/pages/WorkOrders'));
const WorkOrderDetails = lazy(() => import('@/features/work-orders/pages/WorkOrderDetails'));
const Teams = lazy(() => import('@/features/teams/pages/Teams'));
const TeamDetails = lazy(() => import('@/features/teams/pages/TeamDetails'));
const FleetMap = lazy(() => import('@/features/fleet-map/pages/FleetMap'));
const Organization = lazy(() => import('@/features/organization/pages/Organization'));
const QRScanner = lazy(() => import('@/pages/QRScanner'));
const QRRedirect = lazy(() => import('@/pages/QRRedirect'));
const InventoryQRRedirect = lazy(() => import('@/pages/InventoryQRRedirect'));
const LegacyEquipmentQRRedirect = lazy(() => import('@/pages/LegacyEquipmentQRRedirect'));
// Billing and monetization features removed
// const Billing = lazy(() => import('@/pages/Billing'));
const Settings = lazy(() => import('@/pages/Settings'));
const Reports = lazy(() => import('@/features/reports/pages/Reports'));
const Support = lazy(() => import('@/pages/Support'));
const DashboardSupport = lazy(() => import('@/pages/Support').then(module => ({ default: module.DashboardSupport })));
const PMTemplates = lazy(() => import('@/features/pm-templates/pages/PMTemplates'));
const Notifications = lazy(() => import('@/pages/Notifications'));
const InvitationAccept = lazy(() => import('@/pages/InvitationAccept'));
const TermsOfService = lazy(() => import('@/pages/TermsOfService'));
const PrivacyPolicy = lazy(() => import('@/pages/PrivacyPolicy'));
const WorkspaceOnboarding = lazy(() => import('@/pages/WorkspaceOnboarding'));
// const DebugBilling = lazy(() => import('@/pages/DebugBilling'));
// const BillingExemptionsAdmin = lazy(() => import('@/pages/BillingExemptionsAdmin'));
const PMTemplateView = lazy(() => import('@/features/pm-templates/pages/PMTemplateView'));
const InventoryList = lazy(() => import('@/features/inventory/pages/InventoryList'));
const InventoryItemDetail = lazy(() => import('@/features/inventory/pages/InventoryItemDetail'));
const PartLookup = lazy(() => import('@/features/inventory/pages/PartLookup'));
const AlternateGroupsPage = lazy(() => import('@/features/inventory/pages/AlternateGroupsPage'));
const AlternateGroupDetail = lazy(() => import('@/features/inventory/pages/AlternateGroupDetail'));
const AuditLog = lazy(() => import('@/pages/AuditLog'));


const BrandedTopBar = () => {
  return <TopBar />;
};

// Redirect components for backward compatibility
const RedirectToEquipment = () => {
  const { equipmentId } = useParams();
  return <Navigate to={`/dashboard/equipment/${equipmentId}`} replace />;
};

const RedirectToWorkOrder = () => {
  const { workOrderId } = useParams();
  return <Navigate to={`/dashboard/work-orders/${workOrderId}`} replace />;
};

function App() {
  return (
    <AppProviders>
      <Routes>
        {/* Public routes - no suspense needed, loaded eagerly */}
        <Route path="/" element={<SmartLanding />} />
        {/* Direct landing page route - bypasses SmartLanding redirect for authenticated users */}
        <Route path="/landing" element={<Suspense fallback={<div>Loading...</div>}><Landing /></Suspense>} />
        <Route path="/auth" element={<Auth />} />
        {import.meta.env.DEV && DebugAuth && (
          <Route path="/debug-auth" element={<Suspense fallback={<div>Loading...</div>}><DebugAuth /></Suspense>} />
        )}
        
        {/* Other public routes with suspense for lazy loading */}
        <Route path="/solutions/repair-shops" element={<Suspense fallback={<div>Loading...</div>}><RepairShops /></Suspense>} />
        <Route path="/features/pm-templates" element={<Suspense fallback={<div>Loading...</div>}><PMTemplatesFeature /></Suspense>} />
        <Route path="/features/inventory" element={<Suspense fallback={<div>Loading...</div>}><InventoryManagementFeature /></Suspense>} />
        <Route path="/features/part-lookup-alternates" element={<Suspense fallback={<div>Loading...</div>}><PartLookupAlternatesFeature /></Suspense>} />
        <Route path="/features/qr-code-integration" element={<Suspense fallback={<div>Loading...</div>}><QRCodeIntegrationFeature /></Suspense>} />
        <Route path="/features/google-workspace" element={<Suspense fallback={<div>Loading...</div>}><GoogleWorkspaceFeature /></Suspense>} />
        <Route path="/features/quickbooks" element={<Suspense fallback={<div>Loading...</div>}><QuickBooksFeature /></Suspense>} />
        <Route path="/features/work-order-management" element={<Suspense fallback={<div>Loading...</div>}><WorkOrderManagementFeature /></Suspense>} />
        <Route path="/features/team-collaboration" element={<Suspense fallback={<div>Loading...</div>}><TeamCollaborationFeature /></Suspense>} />
        <Route path="/features/fleet-visualization" element={<Suspense fallback={<div>Loading...</div>}><FleetVisualizationFeature /></Suspense>} />
        <Route path="/features/customer-crm" element={<Suspense fallback={<div>Loading...</div>}><CustomerCRMFeature /></Suspense>} />
        <Route path="/features/mobile-first-design" element={<Suspense fallback={<div>Loading...</div>}><MobileFirstDesignFeature /></Suspense>} />
        <Route path="/support" element={<Suspense fallback={<div>Loading...</div>}><Support /></Suspense>} />
        <Route path="/invitation/:token" element={<Suspense fallback={<div>Loading...</div>}><InvitationAccept /></Suspense>} />
        <Route path="/qr/inventory/:itemId" element={<Suspense fallback={<div>Loading...</div>}><InventoryQRRedirect /></Suspense>} />
        <Route path="/qr/equipment/:equipmentId" element={<Suspense fallback={<div>Loading...</div>}><QRRedirect /></Suspense>} />
        {/* Legacy QR route: must remain after the more specific /qr/inventory/:itemId and /qr/equipment/:equipmentId
           routes so they are matched first. React Router v6 prioritizes static segments, but this ordering is
           documented here to prevent accidental reordering. */}
        <Route path="/qr/:equipmentId" element={<Suspense fallback={<div>Loading...</div>}><LegacyEquipmentQRRedirect /></Suspense>} />
        <Route path="/terms-of-service" element={<Suspense fallback={<div>Loading...</div>}><TermsOfService /></Suspense>} />
        <Route path="/privacy-policy" element={<Suspense fallback={<div>Loading...</div>}><PrivacyPolicy /></Suspense>} />

          {/* Redirect routes for backward compatibility */}
          <Route
            path="/equipment/:equipmentId"
            element={
              <ProtectedRoute>
                <SimpleOrganizationProvider>
                  <RedirectToEquipment />
                </SimpleOrganizationProvider>
              </ProtectedRoute>
            }
          />
          <Route
            path="/work-orders/:workOrderId"
            element={
              <ProtectedRoute>
                <SimpleOrganizationProvider>
                  <RedirectToWorkOrder />
                </SimpleOrganizationProvider>
              </ProtectedRoute>
            }
          />

          {/* Protected routes with persistent layout */}
          <Route
            path="/dashboard/*"
            element={
              <ProtectedRoute>
                <SimpleOrganizationProvider>
                  <WorkspaceOnboardingGuard>
                    <TeamProvider>
                      <SidebarProvider>
                      <BugReportProvider>
                      <div className="flex min-h-screen w-full">
                        <Suspense fallback={
                          <div className="w-64 border-r bg-sidebar">
                            <div className="animate-pulse h-full bg-sidebar-accent/20" />
                          </div>
                        }>
                          <AppSidebar />
                        </Suspense>
                        <SidebarInset className="flex-1 min-w-0">
                          <Suspense fallback={
                            <div className="h-14 sm:h-16 border-b">
                              <div className="animate-pulse h-full bg-muted/20" />
                            </div>
                          }>
                            <BrandedTopBar />
                          </Suspense>
                          <main className="flex-1 overflow-auto min-w-0 pb-16 md:pb-0">
                            <Suspense fallback={
                              <div className="flex items-center justify-center h-64">
                                <div className="text-center">
                                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                                  <p className="text-muted-foreground">Loading...</p>
                                </div>
                              </div>
                            }>
                              <Routes>
                                <Route path="/" element={<Dashboard />} />
                                <Route path="/equipment" element={<Equipment />} />
                                <Route path="/equipment/:equipmentId" element={<EquipmentDetails />} />
                                <Route path="/work-orders" element={<WorkOrders />} />
                                <Route path="/work-orders/:workOrderId" element={<WorkOrderDetails />} />
                                <Route path="/teams" element={<Teams />} />
                                <Route path="/teams/:teamId" element={<TeamDetails />} />
                                <Route path="/fleet-map" element={<FleetMap />} />
                                <Route path="/organization" element={<Organization />} />
                                <Route path="/scanner" element={<QRScanner />} />
                                {/* Billing route removed - billing is now free */}
                                {/* <Route path="/billing" element={<Billing />} /> */}
                                <Route path="/pm-templates" element={<PMTemplates />} />
                                <Route path="/pm-templates/:templateId" element={<PMTemplateView />} />
                                <Route path="/pm-templates/:templateId/view" element={<PMTemplateView />} />
                                <Route path="/notifications" element={<Notifications />} />
                                <Route path="/settings" element={<Settings />} />
                                <Route path="/onboarding/workspace" element={<WorkspaceOnboarding />} />
                                <Route path="/reports" element={<Reports />} />
                                <Route path="/inventory" element={<InventoryList />} />
                                <Route path="/inventory/:itemId" element={<InventoryItemDetail />} />
                                <Route path="/part-lookup" element={<PartLookup />} />
                                <Route path="/alternate-groups" element={<AlternateGroupsPage />} />
                                <Route path="/alternate-groups/:groupId" element={<AlternateGroupDetail />} />
                                <Route path="/support" element={<DashboardSupport />} />
                                <Route path="/audit-log" element={<AuditLog />} />
                                {/* Billing debug routes removed */}
                                {/* {import.meta.env.DEV && <Route path="/debug/billing" element={<DebugBilling />} />} */}
                                {/* {import.meta.env.DEV && <Route path="/debug/exemptions-admin" element={<BillingExemptionsAdmin />} />} */}
                              </Routes>
                            </Suspense>
                          </main>
                          <Suspense fallback={null}>
                            <LegalFooter />
                          </Suspense>
                        </SidebarInset>
                        {/* Mobile bottom navigation - only visible on mobile */}
                        <Suspense fallback={null}>
                          <BottomNav />
                        </Suspense>
                      </div>
                      </BugReportProvider>
                      </SidebarProvider>
                    </TeamProvider>
                  </WorkspaceOnboardingGuard>
                </SimpleOrganizationProvider>
              </ProtectedRoute>
            }
          />
        </Routes>
    </AppProviders>
  );
}

export default App;
