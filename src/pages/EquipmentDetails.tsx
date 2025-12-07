import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, MapPin, Calendar, Package, QrCode, Trash2 } from 'lucide-react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useEquipmentById } from '@/hooks/useEquipment';
import { useIsMobile } from '@/hooks/use-mobile';
import Page from '@/components/layout/Page';
import PageHeader from '@/components/layout/PageHeader';
import EquipmentDetailsTab from '@/components/equipment/EquipmentDetailsTab';
import EquipmentNotesTab from '@/components/equipment/EquipmentNotesTab';
import EquipmentWorkOrdersTab from '@/components/equipment/EquipmentWorkOrdersTab';
import EquipmentImagesTab from '@/components/equipment/EquipmentImagesTab';
import EquipmentScansTab from '@/components/equipment/EquipmentScansTab';

import MobileEquipmentHeader from '@/components/equipment/MobileEquipmentHeader';
import ResponsiveEquipmentTabs from '@/components/equipment/ResponsiveEquipmentTabs';
import WorkOrderForm from '@/components/work-orders/WorkOrderForm';
import QRCodeDisplay from '@/components/equipment/QRCodeDisplay';
import { DeleteEquipmentDialog } from '@/components/equipment/DeleteEquipmentDialog';
import { WorkingHoursTimelineModal } from '@/components/equipment/WorkingHoursTimelineModal';
import { useCreateScan } from '@/hooks/useEquipment';
import { useOrganizationMembers } from '@/hooks/useOrganizationMembers';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

const EquipmentDetails = () => {
  const { equipmentId } = useParams<{ equipmentId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { currentOrganization, isLoading: orgLoading } = useOrganization();
  const { data: equipment, isLoading: equipmentLoading } = useEquipmentById(currentOrganization?.id || '', equipmentId);
  const createScanMutation = useCreateScan(currentOrganization?.id || '');
  const isMobile = useIsMobile();
  
  const [activeTab, setActiveTab] = useState('details');
  const [isWorkOrderFormOpen, setIsWorkOrderFormOpen] = useState(false);
  const [isQRCodeOpen, setIsQRCodeOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isWorkingHoursModalOpen, setIsWorkingHoursModalOpen] = useState(false);
  const [scanLogged, setScanLogged] = useState(false);

  const { user } = useAuth();
  const { data: organizationMembers } = useOrganizationMembers(currentOrganization?.id || '');

  const isLoading = orgLoading || equipmentLoading;

  const logScan = useCallback(async () => {
    if (!equipmentId || !currentOrganization || scanLogged) {
      return;
    }
    
    // Mark as logged immediately to prevent duplicate logs
    setScanLogged(true);
    
    try {
      // Try to get user's location with consent
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const location = `${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`;
            
            try {
              await createScanMutation.mutateAsync({
                equipmentId,
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
  }, [equipmentId, currentOrganization, scanLogged, createScanMutation]);

  // Detect if this page was accessed via QR code scan
  useEffect(() => {
    const isQRScan = searchParams.get('qr') === 'true';
    
    if (isQRScan && equipment && equipmentId && currentOrganization && !scanLogged) {
      // Show success message for QR scan
      toast.success('QR Code scanned successfully!', {
        description: `Viewing ${equipment.name} in ${currentOrganization.name}`,
        duration: 4000
      });
      
      logScan();
    }
  }, [equipment, equipmentId, currentOrganization, searchParams, scanLogged, logScan]);

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

  const handleShowWorkingHours = () => {
    setIsWorkingHoursModalOpen(true);
  };

  const handleCloseWorkingHours = () => {
    setIsWorkingHoursModalOpen(false);
  };

  // Check if current user is admin/owner
  const currentUserMember = organizationMembers?.find(member => member.id === user?.id);
  const isAdmin = currentUserMember?.role === 'owner' || currentUserMember?.role === 'admin';

  if (!currentOrganization) {
    return (
      <Page maxWidth="7xl" padding="responsive">
        <PageHeader 
          title="Equipment Details" 
          description="Please select an organization to view equipment details." 
        />
        <Card>
          <CardContent className="text-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
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
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
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
            canDelete={isAdmin}
            onDelete={handleDeleteEquipment}
            onShowWorkingHours={handleShowWorkingHours}
          />
        ) : (
        <>
          {/* Desktop Header */}
          <PageHeader
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
                {isAdmin && (
                  <Button size="sm" variant="destructive" onClick={handleDeleteEquipment}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                )}
              </div>
            }
          />

          {/* Desktop Equipment Image and Basic Info */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <Card>
                <CardContent className="p-0">
                  {equipment.image_url ? (
                    <img
                      src={equipment.image_url}
                      alt={equipment.name}
                      className="w-full h-64 object-cover rounded-lg"
                    />
                  ) : (
                    <div className="w-full h-64 bg-muted rounded-lg flex items-center justify-center">
                      <Package className="h-16 w-16 text-muted-foreground" />
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-2 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Location
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-lg font-semibold">{equipment.location}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Last Maintenance
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-lg font-semibold">
                      {equipment.last_maintenance ? 
                        new Date(equipment.last_maintenance).toLocaleDateString() : 
                        'Not recorded'
                      }
                    </p>
                  </CardContent>
                </Card>
              </div>

              {equipment.notes && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Description</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{equipment.notes}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </>
      )}

      {/* Responsive Tabs */}
      <ResponsiveEquipmentTabs 
        activeTab={activeTab}
        onTabChange={setActiveTab}
      >
        <TabsContent value="details">
          <EquipmentDetailsTab equipment={equipment} />
        </TabsContent>

        <TabsContent value="notes">
          <EquipmentNotesTab 
            equipmentId={equipment.id}
          />
        </TabsContent>

        <TabsContent value="work-orders">
          <EquipmentWorkOrdersTab 
            equipmentId={equipment.id} 
            organizationId={currentOrganization.id}
            onCreateWorkOrder={handleCreateWorkOrder}
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
      </ResponsiveEquipmentTabs>

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
