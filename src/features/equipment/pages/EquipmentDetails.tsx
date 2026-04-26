import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, ArrowLeft, MapPin, Forklift, QrCode, Trash2, Users } from 'lucide-react';
import { GoogleMap, MarkerF } from '@react-google-maps/api';
import ClickableAddress from '@/components/ui/ClickableAddress';
import { resolveEffectiveLocation } from '@/utils/effectiveLocation';
import { useGoogleMapsLoader } from '@/hooks/useGoogleMapsLoader';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useEquipmentById } from '@/features/equipment/hooks/useEquipment';
import type { EquipmentTeamSummary } from '@/features/equipment/services/EquipmentService';
import { useIsMobile } from '@/hooks/use-mobile';
import Page from '@/components/layout/Page';
import PageHeader from '@/components/layout/PageHeader';
import EquipmentDetailsTab from '@/features/equipment/components/EquipmentDetailsTab';
import EquipmentNotesTab from '@/features/equipment/components/EquipmentNotesTab';
import EquipmentWorkOrdersTab from '@/features/equipment/components/EquipmentWorkOrdersTab';
import EquipmentPartsTab from '@/features/equipment/components/EquipmentPartsTab';
import EquipmentImagesTab from '@/features/equipment/components/EquipmentImagesTab';
import EquipmentScansTab from '@/features/equipment/components/EquipmentScansTab';
import { HistoryTab } from '@/components/audit';

import MobileEquipmentHeader from '@/features/equipment/components/MobileEquipmentHeader';
import MobileEquipmentActionBar from '@/features/equipment/components/MobileEquipmentActionBar';
import ResponsiveEquipmentTabs from '@/features/equipment/components/ResponsiveEquipmentTabs';
import WorkOrderForm from '@/features/work-orders/components/WorkOrderForm';
import QRCodeDisplay from '@/features/equipment/components/QRCodeDisplay';
import { DeleteEquipmentDialog } from '@/features/equipment/components/DeleteEquipmentDialog';
import { WorkingHoursTimelineModal } from '@/features/equipment/components/WorkingHoursTimelineModal';
import { useCreateScan } from '@/features/equipment/hooks/useEquipment';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const EquipmentDetails = () => {
  const { equipmentId } = useParams<{ equipmentId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { currentOrganization, isLoading: orgLoading } = useOrganization();
  const { data: equipment, isLoading: equipmentLoading } = useEquipmentById(currentOrganization?.id || '', equipmentId);
  const createScanMutation = useCreateScan(currentOrganization?.id || '');
  const isMobile = useIsMobile();
  const isQRScan = searchParams.get('qr') === 'true';
  
  const [activeTab, setActiveTab] = useState('details');
  const [isWorkOrderFormOpen, setIsWorkOrderFormOpen] = useState(false);
  const [isQRCodeOpen, setIsQRCodeOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isWorkingHoursModalOpen, setIsWorkingHoursModalOpen] = useState(false);
  const [scanLogged, setScanLogged] = useState(false);

  const { user } = useAuth();

  const { data: userPrivacyPrefs, isLoading: privacyPrefsLoading } = useQuery({
    queryKey: ['profile-privacy', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from('profiles')
        .select('limit_sensitive_pi')
        .eq('id', user.id)
        .single();
      return data as { limit_sensitive_pi?: boolean } | null;
    },
    enabled: !!user && isQRScan,
    staleTime: 5 * 60 * 1000,
  });

  const assignedTeam = (equipment?.team ?? null) as EquipmentTeamSummary | null;
  const { isLoaded: isMapsLoaded } = useGoogleMapsLoader({ enabled: true });

  const isLoading = orgLoading || equipmentLoading;

  const logScan = useCallback(async () => {
    if (!equipmentId || !currentOrganization || scanLogged) {
      return;
    }
    
    // Mark as logged immediately to prevent duplicate logs
    setScanLogged(true);
    
    try {
      const scanLocationEnabled = currentOrganization.scanLocationCollectionEnabled;
      const userLimitedSensitivePi = userPrivacyPrefs?.limit_sensitive_pi === true;

      if (scanLocationEnabled === false || userLimitedSensitivePi) {
        try {
          await createScanMutation.mutateAsync({
            equipmentId,
            includeProfile: false,
            notes: 'QR code scan'
          });
          toast.success('Equipment scanned successfully!');
        } catch (error) {
          console.error('Failed to log scan:', error);
          toast.error('Failed to log scan');
        }
        return;
      }
      
      // Try to get user's location with consent
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const location = `${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`;
            
            try {
              await createScanMutation.mutateAsync({
                equipmentId,
                includeProfile: false,
                location,
                notes: 'QR code scan with location'
              });
              toast.success('Equipment scanned successfully!');
            } catch (error) {
              console.error('Failed to log scan with location:', error);
              toast.error('Failed to log scan');
            }
          },
          async () => {
            try {
              // Log scan without location
              await createScanMutation.mutateAsync({
                equipmentId,
                includeProfile: false,
                notes: 'QR code scan (location denied)'
              });
              toast.success('Equipment scanned successfully!');
            } catch (scanError) {
              console.error('Failed to log scan without location:', scanError);
              toast.error('Failed to log scan');
            }
          },
          {
            enableHighAccuracy: false,
            timeout: 5000,
            maximumAge: 300000 // 5 minutes
          }
        );
      } else {
        try {
          // Log scan without location support
          await createScanMutation.mutateAsync({
            equipmentId,
            includeProfile: false,
            notes: 'QR code scan (no location support)'
          });
          toast.success('Equipment scanned successfully!');
        } catch (error) {
          console.error('Failed to log scan without location support:', error);
          toast.error('Failed to log scan');
        }
      }
    } catch (error) {
      console.error('Unexpected error during scan logging:', error);
      toast.error('Failed to log scan');
    }
  }, [equipmentId, currentOrganization, scanLogged, createScanMutation, userPrivacyPrefs]);

  // Detect if this page was accessed via QR code scan
  useEffect(() => {
    // Wait for privacy prefs to finish loading before calling logScan so that
    // the opt-out preference is known before geolocation is requested.
    if (isQRScan && equipment && equipmentId && currentOrganization && !scanLogged && !privacyPrefsLoading) {
      // Show success message for QR scan
      toast.success('QR Code scanned successfully!', {
        description: `Viewing ${equipment.name} in ${currentOrganization.name}`,
        duration: 4000
      });
      
      logScan();
    }
  }, [equipment, equipmentId, currentOrganization, isQRScan, scanLogged, logScan, privacyPrefsLoading]);

  const handleCreateWorkOrder = () => {
    setIsWorkOrderFormOpen(true);
  };

  const handleCloseWorkOrderForm = () => {
    setIsWorkOrderFormOpen(false);
  };

  const handleShowQRCode = () => {
    setIsQRCodeOpen(true);
  };

  const handleCloseQRCode = () => {
    setIsQRCodeOpen(false);
  };

  const handleDeleteEquipment = () => {
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteSuccess = () => {
    navigate('/dashboard/equipment');
  };

  const handleAddNote = () => {
    setActiveTab('notes');
  };

  const handleShowWorkingHours = () => {
    setIsWorkingHoursModalOpen(true);
  };

  const handleCloseWorkingHours = () => {
    setIsWorkingHoursModalOpen(false);
  };

  // Check if current user is admin/owner.
  // Use optional chaining because `currentOrganization` may be null during
  // initial load or organization switching — the `if (!currentOrganization)`
  // guard below executes AFTER this line, and the project runs with
  // `strictNullChecks: false` so the compiler will not catch a direct access.
  const isAdmin =
    currentOrganization?.userRole === 'owner' || currentOrganization?.userRole === 'admin';

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
        <PageHeader 
          title="Equipment Details" 
          description="Loading equipment information..." 
        />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <Skeleton className="h-64 w-full rounded-lg" />
          </div>
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-32 w-full rounded-lg" />
            <Skeleton className="h-32 w-full rounded-lg" />
          </div>
        </div>
      </Page>
    );
  }

  if (!equipment) {
    return (
      <Page maxWidth="7xl" padding="responsive">
        <PageHeader 
          title="Equipment Details" 
          description="Equipment not found" 
        />
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
      <div className="space-y-6">
        {/* Mobile Header */}
        {isMobile ? (
          <MobileEquipmentHeader 
            equipment={equipment}
            onShowQRCode={handleShowQRCode}
            onShowWorkingHours={handleShowWorkingHours}
          />
        ) : (
        <>
          {/* Desktop Header */}
          <PageHeader
            density="compact"
            title={equipment.name}
            description={`${equipment.manufacturer} ${equipment.model} • ${equipment.serial_number}`}
            breadcrumbs={[
              { label: 'Equipment', href: '/dashboard/equipment' },
              { label: equipment.name }
            ]}
            actions={
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={handleShowQRCode}>
                  <QrCode className="h-4 w-4 mr-2" />
                  QR Code
                </Button>
              </div>
            }
          />

          {/* Desktop: Image | Team Info | Map */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Column 1: Equipment Image */}
            <Card>
              <CardContent className="p-0">
                {equipment.image_url ? (
                  <img
                    src={equipment.image_url}
                    alt={equipment.name}
                    className="w-full h-64 object-cover rounded-lg"
                    decoding="async"
                  />
                ) : (
                  <div className="w-full h-64 bg-muted rounded-lg flex items-center justify-center">
                    <Forklift className="h-16 w-16 text-muted-foreground" />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Column 2: Team Info */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Assigned Team
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {(() => {
                  const team = assignedTeam ?? undefined;

                  if (!team) {
                    return (
                      <div className="flex flex-col items-center justify-center h-40 text-center">
                        <Users className="h-8 w-8 text-muted-foreground/50 mb-2" />
                        <p className="text-sm font-medium text-muted-foreground">Unassigned</p>
                        <p className="text-xs text-muted-foreground mt-1">Assign a team in the Details tab</p>
                      </div>
                    );
                  }

                  const teamAddr = [
                    team.location_address,
                    team.location_city,
                    team.location_state,
                    team.location_country,
                  ].filter(Boolean).join(', ');

                  return (
                    <>
                      <Link
                        to={`/dashboard/teams/${team.id}`}
                        className="text-lg font-semibold text-primary hover:underline transition-colors"
                      >
                        {team.name}
                      </Link>
                      <p className="text-sm text-muted-foreground line-clamp-3">
                        {team.description || 'No description'}
                      </p>
                      {teamAddr && (
                        <div className="flex items-start gap-1.5 pt-1">
                          <MapPin className="h-3.5 w-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                          <ClickableAddress
                            address={teamAddr}
                            lat={team.location_lat}
                            lng={team.location_lng}
                            className="text-xs"
                          />
                        </div>
                      )}
                    </>
                  );
                })()}
              </CardContent>
            </Card>

            {/* Column 3: Location Map */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Location
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 px-6 pb-4 space-y-2">
                {(() => {
                  // Resolve effective location using shared 3-tier hierarchy
                  const team = assignedTeam ?? undefined;

                  // Parse last_known_location (Json) for scan fallback
                  let lastScan: { lat: number; lng: number } | undefined;
                  if (equipment.last_known_location && typeof equipment.last_known_location === 'object') {
                    const loc = equipment.last_known_location as Record<string, unknown>;
                    const lat = Number(loc.latitude ?? loc.lat);
                    const lng = Number(loc.longitude ?? loc.lng);
                    if (!isNaN(lat) && !isNaN(lng)) {
                      lastScan = { lat, lng };
                    }
                  }

                  const resolved = resolveEffectiveLocation({
                    team: team ? {
                      override_equipment_location: team.override_equipment_location,
                      location_lat: team.location_lat,
                      location_lng: team.location_lng,
                      location_address: team.location_address,
                      location_city: team.location_city,
                      location_state: team.location_state,
                      location_country: team.location_country,
                    } : undefined,
                    equipment: {
                      use_team_location: equipment.use_team_location ?? undefined,
                      assigned_location_lat: equipment.assigned_location_lat,
                      assigned_location_lng: equipment.assigned_location_lng,
                      assigned_location_street: equipment.assigned_location_street,
                      assigned_location_city: equipment.assigned_location_city,
                      assigned_location_state: equipment.assigned_location_state,
                      assigned_location_country: equipment.assigned_location_country,
                    },
                    lastScan,
                  });

                  const effectiveLat = resolved?.lat;
                  const effectiveLng = resolved?.lng;
                  const effectiveAddr = resolved?.formattedAddress || '';
                  const isTeamOverride = resolved?.source === 'team';
                  const hasCoords = effectiveLat != null && effectiveLng != null;

                  if (hasCoords && isMapsLoaded) {
                    const center = { lat: effectiveLat as number, lng: effectiveLng as number };
                    return (
                      <>
                        <div className="rounded-lg overflow-hidden border" style={{ height: '180px' }}>
                          <GoogleMap
                            mapContainerStyle={{ width: '100%', height: '100%' }}
                            center={center}
                            zoom={14}
                            options={{
                              disableDefaultUI: true,
                              zoomControl: false,
                              mapTypeControl: false,
                              streetViewControl: false,
                              fullscreenControl: false,
                            }}
                          >
                            <MarkerF position={center} />
                          </GoogleMap>
                        </div>
                        {effectiveAddr && (
                          <div className="flex items-start gap-1.5">
                            <MapPin className="h-3.5 w-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                            <ClickableAddress
                              address={effectiveAddr}
                              lat={effectiveLat as number}
                              lng={effectiveLng as number}
                              className="text-xs"
                            />
                          </div>
                        )}
                        {isTeamOverride && (
                          <p className="text-xs text-muted-foreground">via {team!.name}</p>
                        )}
                        {resolved?.source === 'scan' && (
                          <p className="text-xs text-muted-foreground">via last scan</p>
                        )}
                      </>
                    );
                  }

                  if (hasCoords && !isMapsLoaded) {
                    return (
                      <div className="h-[180px] rounded-lg bg-muted/50 border-2 border-dashed border-muted-foreground/25 flex items-center justify-center">
                        <div className="text-center px-4">
                          <MapPin className="h-6 w-6 text-muted-foreground/50 mx-auto" />
                          <p className="text-xs text-muted-foreground mt-1">
                            {effectiveAddr || 'Location coordinates available'}
                          </p>
                        </div>
                      </div>
                    );
                  }

                  // Fallback: show legacy text location if available
                  if (equipment.location) {
                    return (
                      <div className="h-[180px] rounded-lg bg-muted/50 border-2 border-dashed border-muted-foreground/25 flex items-center justify-center">
                        <div className="text-center px-4">
                          <MapPin className="h-6 w-6 text-muted-foreground/50 mx-auto" />
                          <p className="text-xs text-muted-foreground mt-1">{equipment.location}</p>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div className="h-[180px] rounded-lg bg-muted/50 border-2 border-dashed border-muted-foreground/25 flex items-center justify-center">
                      <div className="text-center">
                        <MapPin className="h-6 w-6 text-muted-foreground/50 mx-auto" />
                        <p className="text-xs text-muted-foreground mt-1">No location set</p>
                      </div>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Mobile Action Bar */}
      {isMobile && equipment && (
        <MobileEquipmentActionBar
          equipmentId={equipment.id}
          onCreateWorkOrder={handleCreateWorkOrder}
          onLogHours={handleShowWorkingHours}
          onAddNote={handleAddNote}
        />
      )}

      {/* Responsive Tabs */}
      <ResponsiveEquipmentTabs 
        activeTab={activeTab}
        onTabChange={setActiveTab}
      >
        <TabsContent value="details">
          <EquipmentDetailsTab equipment={equipment} assignedTeam={assignedTeam} />
        </TabsContent>

        <TabsContent value="notes">
          <EquipmentNotesTab
            equipmentId={equipment.id}
            currentDisplayImage={equipment.image_url}
          />
        </TabsContent>

        <TabsContent value="work-orders">
          <EquipmentWorkOrdersTab 
            equipmentId={equipment.id} 
            organizationId={currentOrganization.id}
            onCreateWorkOrder={handleCreateWorkOrder}
            equipmentManufacturer={equipment.manufacturer}
            equipmentModel={equipment.model}
            equipmentSerialNumber={equipment.serial_number}
          />
        </TabsContent>

        <TabsContent value="parts">
          <EquipmentPartsTab 
            equipmentId={equipment.id} 
            organizationId={currentOrganization.id}
          />
        </TabsContent>

        <TabsContent value="images">
          <EquipmentImagesTab 
            equipmentId={equipment.id} 
            organizationId={currentOrganization.id}
            equipmentTeamId={equipment.team_id || undefined}
            currentDisplayImage={equipment.image_url || undefined}
          />
        </TabsContent>


        <TabsContent value="scans">
          <EquipmentScansTab 
            equipmentId={equipment.id} 
            organizationId={currentOrganization.id}
          />
        </TabsContent>

        <TabsContent value="history">
          <HistoryTab 
            entityType="equipment"
            entityId={equipment.id} 
            organizationId={currentOrganization.id}
          />
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
                onClick={handleDeleteEquipment}
                className="w-full sm:w-auto"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Equipment
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Work Order Form */}
      <WorkOrderForm
        open={isWorkOrderFormOpen}
        onClose={handleCloseWorkOrderForm}
        equipmentId={equipmentId}
      />

      {/* QR Code Display */}
      <QRCodeDisplay
        open={isQRCodeOpen}
        onClose={handleCloseQRCode}
        equipmentId={equipment.id}
        equipmentName={equipment.name}
      />

      {/* Delete Equipment Dialog */}
      {isAdmin && (
        <DeleteEquipmentDialog
          open={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
          equipmentId={equipment.id}
          equipmentName={equipment.name}
          orgId={currentOrganization.id}
          onSuccess={handleDeleteSuccess}
        />
      )}

      {/* Working Hours Timeline Modal */}
      <WorkingHoursTimelineModal
        open={isWorkingHoursModalOpen}
        onClose={handleCloseWorkingHours}
        equipmentId={equipment.id}
        equipmentName={equipment.name}
      />
      </div>
    </Page>
  );
};

export default EquipmentDetails;
