import React, { useState, useEffect, lazy, Suspense } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, ArrowLeft, Forklift, QrCode, Trash2 } from 'lucide-react';
import type { EquipmentQRVariant } from '@/features/equipment/components/QRCodeDisplay';
import { useGoogleMapsLoader } from '@/hooks/useGoogleMapsLoader';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useEquipmentById } from '@/features/equipment/hooks/useEquipment';
import { useSaveEquipmentAssignedLocation } from '@/features/equipment/hooks/useSaveEquipmentAssignedLocation';
import type { EquipmentTeamSummary } from '@/features/equipment/services/EquipmentService';
import { useIsMobile } from '@/hooks/use-mobile';
import { useUnifiedPermissions } from '@/hooks/useUnifiedPermissions';
import { useInventoryAccess } from '@/features/inventory/hooks/useInventoryAccess';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';
import Page from '@/components/layout/Page';
import PageHeader from '@/components/layout/PageHeader';
import EquipmentDetailsTab from '@/features/equipment/components/EquipmentDetailsTab';
import MobileEquipmentHeader from '@/features/equipment/components/MobileEquipmentHeader';
import MobileEquipmentActionBar from '@/features/equipment/components/MobileEquipmentActionBar';
import ResponsiveEquipmentTabs from '@/features/equipment/components/ResponsiveEquipmentTabs';
import { EquipmentDetailsDesktopSummary } from '@/features/equipment/components/EquipmentDetailsDesktopSummary';
import { EquipmentLocationMapPanel } from '@/components/location/EquipmentLocationMapPanel';
import { EquipmentDetailsModals } from '@/features/equipment/components/EquipmentDetailsModals';
import { EquipmentQuickAccessDrawer } from '@/features/equipment/components/EquipmentQuickAccessDrawer';
import { useEquipmentScanLogger } from '@/features/equipment/hooks/useEquipmentScanLogger';
import { getEquipmentViewTransitionStyle } from '@/features/equipment/transitions/equipmentViewTransitionNames';
import { useEquipmentCardTransitionState } from '@/features/equipment/transitions/useEquipmentCardTransitionState';
import { useScrollMainContentToTopOnMount } from '@/features/equipment/transitions/useScrollMainContentToTopOnMount';

const EquipmentNotesTab = lazy(() => import('@/features/equipment/components/EquipmentNotesTab'));
const EquipmentWorkOrdersTab = lazy(() => import('@/features/equipment/components/EquipmentWorkOrdersTab'));
const EquipmentPartsTab = lazy(() => import('@/features/equipment/components/EquipmentPartsTab'));
const EquipmentImagesTab = lazy(() => import('@/features/equipment/components/EquipmentImagesTab'));
const EquipmentScanHistoryTab = lazy(() => import('@/features/equipment/components/EquipmentScanHistoryTab'));
const EquipmentOperatorCheckinLedgerTab = lazy(
  () => import('@/features/equipment/components/EquipmentOperatorCheckinLedgerTab'),
);

const TabContentSkeleton = () => (
  <div className="space-y-4 mt-2" role="status" aria-label="Loading tab content">
    {[0, 1, 2].map(i => (
      <div key={i} className="h-24 w-full animate-pulse rounded-lg bg-muted" />
    ))}
  </div>
);

const EQUIPMENT_TAB_VALUES = [
  'details',
  'work-orders',
  'notes',
  'parts',
  'images',
  'check-ins',
  'scan-history',
] as const;

function normalizeTabParam(tab: string | null): string {
  if (!tab) return 'details';
  if (tab === 'scans' || tab === 'history') return 'scan-history';
  return (EQUIPMENT_TAB_VALUES as readonly string[]).includes(tab) ? tab : 'details';
}

const EquipmentDetails = () => {
  const { equipmentId } = useParams<{ equipmentId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { currentOrganization, isLoading: orgLoading } = useOrganization();
  const { data: equipment, isLoading: equipmentLoading } = useEquipmentById(
    currentOrganization?.id || '',
    equipmentId,
  );
  const isMobile = useIsMobile();
  const isQRScan = searchParams.get('qr') === 'true';
  const { canView: canViewInventory, isLoading: inventoryAccessLoading } = useInventoryAccess();
  const { activeEquipmentId } = useEquipmentCardTransitionState();
  const isTransitionActive = !!equipmentId && activeEquipmentId === equipmentId;

  useScrollMainContentToTopOnMount(equipmentId);

  const [activeTab, setActiveTab] = useState(() => normalizeTabParam(searchParams.get('tab')));
  const [isWorkOrderFormOpen, setIsWorkOrderFormOpen] = useState(false);
  const [isQRCodeOpen, setIsQRCodeOpen] = useState(false);
  const [qrInitialVariant, setQrInitialVariant] = useState<EquipmentQRVariant>('equipment');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isWorkingHoursModalOpen, setIsWorkingHoursModalOpen] = useState(false);
  const [isEditingSummaryLocation, setIsEditingSummaryLocation] = useState(false);

  const tabParam = searchParams.get('tab');
  useEffect(() => {
    if (tabParam) {
      setActiveTab(normalizeTabParam(tabParam));
    }
  }, [tabParam]);

  // Users without inventory access must see no evidence of parts — bounce
  // direct ?tab=parts navigation back to the details tab once access resolves.
  useEffect(() => {
    if (inventoryAccessLoading) {
      return;
    }

    if (!canViewInventory && (activeTab === 'parts' || tabParam === 'parts')) {
      setActiveTab('details');
      if (tabParam === 'parts') {
        const nextSearchParams = new URLSearchParams(searchParams);
        nextSearchParams.delete('tab');
        setSearchParams(nextSearchParams, { replace: true });
      }
    }
  }, [
    inventoryAccessLoading,
    canViewInventory,
    activeTab,
    tabParam,
    searchParams,
    setSearchParams,
  ]);

  useEffect(() => {
    if (!equipment) return;

    const createParam = searchParams.get('createWorkOrder');
    if (!createParam) return;

    setIsWorkOrderFormOpen(true);

    const nextSearchParams = new URLSearchParams(searchParams);
    nextSearchParams.delete('createWorkOrder');
    setSearchParams(nextSearchParams, { replace: true });
  }, [equipment, searchParams, setSearchParams]);

  useEquipmentScanLogger({
    equipmentId,
    organizationId: currentOrganization?.id,
    scanLocationCollectionEnabled: currentOrganization?.scanLocationCollectionEnabled,
    isQRScan,
    equipment,
    equipmentName: equipment?.name,
    organizationName: currentOrganization?.name,
  });

  const assignedTeam = (equipment?.team ?? null) as EquipmentTeamSummary | null;
  const permissions = useUnifiedPermissions();
  const canEditLocation = equipment
    ? permissions.equipment.getPermissions(equipment.team_id || undefined).canEdit
    : false;
  const { saveAssignedLocation, isSavingLocation: isSavingSummaryLocation } =
    useSaveEquipmentAssignedLocation(currentOrganization?.id, equipmentId);
  const { isLoaded: isPlacesLoadedForSummary } = useGoogleMapsLoader({
    enabled: isEditingSummaryLocation,
  });
  const isLoading = orgLoading || equipmentLoading;
  const isAdmin =
    currentOrganization?.userRole === 'owner' || currentOrganization?.userRole === 'admin';

  const handleOpenQrCode = (initialVariant: EquipmentQRVariant = 'equipment') => {
    setQrInitialVariant(initialVariant);
    setIsQRCodeOpen(true);
  };

  const handleCloseQrCode = () => {
    setIsQRCodeOpen(false);
    setQrInitialVariant('equipment');
  };

  if (!currentOrganization) {
    return (
      <Page maxWidth="7xl" padding="responsive">
        <PageHeader
          title="Equipment Details"
          description="Please select an organization to view equipment details."
        />
        <Card>
          <CardContent className="text-center py-12">
            <Forklift className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Organization Selected</h3>
            <p className="text-muted-foreground">
              Please select an organization to view equipment details.
            </p>
          </CardContent>
        </Card>
      </Page>
    );
  }

  if (isLoading) {
    return (
      <Page maxWidth="7xl" padding="responsive">
        <div
          className="space-y-6"
          style={getEquipmentViewTransitionStyle('shell', isTransitionActive)}
        >
          <PageHeader title="Equipment Details" description="Loading equipment information..." />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <Skeleton className="h-64 w-full rounded-lg" />
            </div>
            <div className="lg:col-span-2 space-y-4">
              <Skeleton className="h-32 w-full rounded-lg" />
              <Skeleton className="h-32 w-full rounded-lg" />
            </div>
          </div>
        </div>
      </Page>
    );
  }

  if (!equipment) {
    return (
      <Page maxWidth="7xl" padding="responsive">
        <PageHeader title="Equipment Details" description="Equipment not found" />
        <Card>
          <CardContent className="text-center py-12">
            <Forklift className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Equipment not found</h3>
            <p className="text-muted-foreground">
              The equipment you're looking for doesn't exist or you don't have access to it.
            </p>
            <Button
              variant="outline"
              onClick={() => navigate('/dashboard/equipment')}
              className="mt-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Equipment
            </Button>
          </CardContent>
        </Card>
      </Page>
    );
  }

  return (
    <Page maxWidth="7xl" padding="responsive">
      <div
        className="space-y-6"
        style={getEquipmentViewTransitionStyle('shell', isTransitionActive)}
      >
        {isMobile ? (
          <>
            <MobileEquipmentHeader
              equipment={equipment}
              onShowQRCode={() => handleOpenQrCode()}
              onShowWorkingHours={() => setIsWorkingHoursModalOpen(true)}
            />
            <Card className="shadow-elevation-2">
              <EquipmentLocationMapPanel
                layout="card"
                equipment={equipment}
                assignedTeam={assignedTeam}
                organizationId={currentOrganization.id}
                scanLocationCollectionEnabled={currentOrganization.scanLocationCollectionEnabled}
                canEditLocation={canEditLocation}
                isEditingAddress={isEditingSummaryLocation}
                isSavingAddress={isSavingSummaryLocation}
                isPlacesLoaded={isPlacesLoadedForSummary}
                onStartAddressEdit={() => setIsEditingSummaryLocation(true)}
                onCancelAddressEdit={() => setIsEditingSummaryLocation(false)}
                onSaveAddress={async (data) => {
                  try {
                    await saveAssignedLocation(data);
                    setIsEditingSummaryLocation(false);
                  } catch (error) {
                    logger.error('Error updating equipment location from map card', error);
                    toast.error('Failed to update equipment location');
                  }
                }}
                mapHeight="180px"
              />
            </Card>
          </>
        ) : (
          <>
            <PageHeader
              density="compact"
              title={equipment.name}
              description={`${equipment.manufacturer} ${equipment.model} • ${equipment.serial_number}`}
              titleStyle={getEquipmentViewTransitionStyle('name', isTransitionActive)}
              descriptionStyle={getEquipmentViewTransitionStyle('meta', isTransitionActive)}
              breadcrumbs={[
                { label: 'Equipment', href: '/dashboard/equipment' },
                { label: equipment.name },
              ]}
              actions={
                <div className="flex items-center gap-2">
                  <Button size="sm" onClick={() => handleOpenQrCode()}>
                    <QrCode className="h-4 w-4 mr-2" />
                    QR Code
                  </Button>
                </div>
              }
            />
            <EquipmentDetailsDesktopSummary
              equipment={equipment}
              assignedTeam={assignedTeam}
              organizationId={currentOrganization.id}
              scanLocationCollectionEnabled={currentOrganization.scanLocationCollectionEnabled}
              canEditLocation={canEditLocation}
              isEditingLocation={isEditingSummaryLocation}
              isSavingLocation={isSavingSummaryLocation}
              isPlacesLoaded={isPlacesLoadedForSummary}
              mediaStyle={getEquipmentViewTransitionStyle('image', isTransitionActive)}
              onStartLocationEdit={() => setIsEditingSummaryLocation(true)}
              onCancelLocationEdit={() => setIsEditingSummaryLocation(false)}
              onSaveLocation={async (data) => {
                try {
                  await saveAssignedLocation(data);
                  setIsEditingSummaryLocation(false);
                } catch (error) {
                  logger.error('Error updating equipment location from map card', error);
                  toast.error('Failed to update equipment location');
                }
              }}
            />
          </>
        )}

        {isMobile && (
          <>
            <MobileEquipmentActionBar
              equipmentId={equipment.id}
              onCreateWorkOrder={() => setIsWorkOrderFormOpen(true)}
              onAddNote={() => setActiveTab('notes')}
            />
            <EquipmentQuickAccessDrawer
              equipmentId={equipment.id}
              equipmentName={equipment.name}
              organizationId={currentOrganization.id}
              onShowQrCode={(variant) => handleOpenQrCode(variant)}
              onCreateWorkOrder={() => setIsWorkOrderFormOpen(true)}
              onAddNote={() => setActiveTab('notes')}
            />
          </>
        )}

        <ResponsiveEquipmentTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          showPartsTab={canViewInventory}
        >
          <TabsContent value="details">
            <EquipmentDetailsTab
              equipment={equipment}
              assignedTeam={assignedTeam}
            />
          </TabsContent>

          <TabsContent value="notes">
            {activeTab === 'notes' && (
              <Suspense fallback={<TabContentSkeleton />}>
                <EquipmentNotesTab
                  equipmentId={equipment.id}
                  organizationId={currentOrganization.id}
                  equipmentTeamId={equipment.team_id || undefined}
                  currentDisplayImage={equipment.image_url}
                />
              </Suspense>
            )}
          </TabsContent>

          <TabsContent value="work-orders">
            {activeTab === 'work-orders' && (
              <Suspense fallback={<TabContentSkeleton />}>
                <EquipmentWorkOrdersTab
                  equipmentId={equipment.id}
                  organizationId={currentOrganization.id}
                  onCreateWorkOrder={() => setIsWorkOrderFormOpen(true)}
                  equipmentManufacturer={equipment.manufacturer}
                  equipmentModel={equipment.model}
                  equipmentSerialNumber={equipment.serial_number}
                  equipment={equipment}
                  assignedTeamName={assignedTeam?.name ?? null}
                />
              </Suspense>
            )}
          </TabsContent>

          {canViewInventory && (
            <TabsContent value="parts">
              {activeTab === 'parts' && (
                <Suspense fallback={<TabContentSkeleton />}>
                  <EquipmentPartsTab
                    equipmentId={equipment.id}
                    organizationId={currentOrganization.id}
                  />
                </Suspense>
              )}
            </TabsContent>
          )}

          <TabsContent value="images">
            {activeTab === 'images' && (
              <Suspense fallback={<TabContentSkeleton />}>
                <EquipmentImagesTab
                  equipmentId={equipment.id}
                  organizationId={currentOrganization.id}
                  equipmentTeamId={equipment.team_id || undefined}
                  currentDisplayImage={equipment.image_url || undefined}
                  equipmentName={equipment.name}
                />
              </Suspense>
            )}
          </TabsContent>

          <TabsContent value="check-ins">
            {activeTab === 'check-ins' && (
              <Suspense fallback={<TabContentSkeleton />}>
                <EquipmentOperatorCheckinLedgerTab
                  organizationId={currentOrganization.id}
                  equipmentId={equipment.id}
                  equipmentName={equipment.name}
                  isAdmin={isAdmin}
                  onOpenQrCodeForAssignment={(assignmentId) =>
                    handleOpenQrCode(`assignment:${assignmentId}`)
                  }
                />
              </Suspense>
            )}
          </TabsContent>

          <TabsContent value="scan-history">
            {activeTab === 'scan-history' && (
              <Suspense fallback={<TabContentSkeleton />}>
                <EquipmentScanHistoryTab
                  equipmentId={equipment.id}
                  organizationId={currentOrganization.id}
                  scanLocationCollectionEnabled={currentOrganization.scanLocationCollectionEnabled}
                />
              </Suspense>
            )}
          </TabsContent>
        </ResponsiveEquipmentTabs>

        {isAdmin && (
          <div className="mt-8 space-y-4">
            <Card className="border-destructive/80 bg-destructive/[0.06] dark:bg-destructive/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg font-semibold tracking-tight text-destructive">
                  <AlertTriangle className="h-4 w-4" />
                  Delete Equipment
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Deleting equipment permanently removes it and cannot be undone.
                </p>
                <Button
                  variant="destructive"
                  onClick={() => setIsDeleteDialogOpen(true)}
                  className="w-full sm:w-auto"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Equipment
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        <EquipmentDetailsModals
          equipmentId={equipmentId}
          equipmentName={equipment.name}
          organizationId={currentOrganization.id}
          isAdmin={isAdmin}
          isWorkOrderFormOpen={isWorkOrderFormOpen}
          isQRCodeOpen={isQRCodeOpen}
          qrInitialVariant={qrInitialVariant}
          isDeleteDialogOpen={isDeleteDialogOpen}
          isWorkingHoursModalOpen={isWorkingHoursModalOpen}
          onCloseWorkOrderForm={() => {
            setIsWorkOrderFormOpen(false);
          }}
          onCloseQRCode={handleCloseQrCode}
          onDeleteDialogOpenChange={setIsDeleteDialogOpen}
          onDeleteSuccess={() => navigate('/dashboard/equipment')}
          onCloseWorkingHours={() => setIsWorkingHoursModalOpen(false)}
        />
      </div>
    </Page>
  );
};

export default EquipmentDetails;
