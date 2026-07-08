import React, { useState, useMemo, useEffect } from 'react';
import { Link, useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Package, History, Link2, Plus, QrCode } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useInventoryItem, useInventoryTransactions, useDeleteInventoryItem, useAdjustInventoryQuantity, useUpdateInventoryItem, useCompatibleEquipmentForItem, useBulkLinkEquipmentToItem, useCompatibilityRulesForItem, useBulkSetCompatibilityRules, useEquipmentMatchingItemRules } from '@/features/inventory/hooks/useInventory';
import { useUnlinkItemFromEquipment } from '@/features/inventory/hooks/inventoryEquipmentLinkMutations';
import { useEquipmentSummaries } from '@/features/equipment/hooks/useEquipment';
import { useIsPartsManager } from '@/features/inventory/hooks/usePartsManagers';
import {
  useAlternateGroups,
  useCreateAlternateGroup,
  useAddInventoryItemToGroup,
} from '@/features/inventory/hooks/useAlternateGroups';
import type { PartCompatibilityRuleFormData } from '@/features/inventory/types/inventory';
import { getAlternatesForInventoryItem } from '@/features/inventory/services/partAlternatesService';
import { groupAlternatePartsByGroupId } from '@/features/inventory/utils/groupAlternateParts';
import { usePermissions } from '@/hooks/usePermissions';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import Page from '@/components/layout/Page';
import PageHeader from '@/components/layout/PageHeader';
import { ORGANIZATION_AUDIT_LOG_PATH } from '@/features/organization/constants/routes';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { logger } from '@/utils/logger';
import { getInventoryItemImages, uploadInventoryItemImages, deleteInventoryItemImage } from '@/features/inventory/services/inventoryService';
import { useAppToast } from '@/hooks/useAppToast';
import { inventory as inventoryQueryKeys } from '@/lib/queryKeys';
import InventoryItemOverviewTab from '@/features/inventory/pages/components/InventoryItemOverviewTab';
import InventoryItemTransactionsTab from '@/features/inventory/pages/components/InventoryItemTransactionsTab';
import InventoryItemCompatibilityTab from '@/features/inventory/pages/components/InventoryItemCompatibilityTab';
import { HorizontalChipRow } from '@/components/layout/HorizontalChipRow';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { getStockHealthPresentation } from '@/features/inventory/utils/stockHealth';
import type { InventoryStructuredLocationFields } from '@/features/inventory/utils/inventoryLocationUtils';
import { parseInventoryNumericField } from '@/features/inventory/utils/parseInventoryNumericField';
import { useInventoryItemAdjustQuantity } from '@/features/inventory/hooks/useInventoryItemAdjustQuantity';
import { useInventoryItemEquipmentDialog } from '@/features/inventory/hooks/useInventoryItemEquipmentDialog';
import { useInventoryItemAlternateGroupDialogs } from '@/features/inventory/hooks/useInventoryItemAlternateGroupDialogs';
import { InventoryItemDetailDialogs } from '@/features/inventory/pages/components/InventoryItemDetailDialogs';

const InventoryItemDetail = () => {
  const { itemId } = useParams<{ itemId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentOrganization } = useOrganization();
  const { canManageInventory } = usePermissions();
  const isMobile = useIsMobile();
  const appToast = useAppToast();

  // Check if user is a parts manager for permission calculation
  const { data: isPartsManager = false } = useIsPartsManager(currentOrganization?.id);
  const canEdit = canManageInventory(isPartsManager);
  const isOrgAdmin =
    currentOrganization?.userRole === 'owner' || currentOrganization?.userRole === 'admin';

  const [activeTab, setActiveTab] = useState('overview');
  const [showEditForm, setShowEditForm] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);
  const [showEditRules, setShowEditRules] = useState(false);
  const [editingRules, setEditingRules] = useState<PartCompatibilityRuleFormData[]>([]);
  const [showAddEquipmentDialog, setShowAddEquipmentDialog] = useState(false);
  const [showAddToGroupDialog, setShowAddToGroupDialog] = useState(false);

  useEffect(() => {
    if (searchParams.get('alternateAction') === 'add' && canEdit) {
      setShowAddToGroupDialog(true);
    }
  }, [searchParams, canEdit]);

  const { data: item, isLoading: itemLoading } = useInventoryItem(
    currentOrganization?.id,
    itemId
  );
  
  // Fetch uploaded images for this item
  const { data: itemImages = [], refetch: refetchImages } = useQuery({
    queryKey: inventoryQueryKeys.itemImages(currentOrganization?.id ?? '', itemId ?? ''),
    queryFn: () => getInventoryItemImages(itemId!, currentOrganization!.id),
    enabled: !!itemId && !!currentOrganization?.id,
  });

  const { data: transactionsData } = useInventoryTransactions(
    currentOrganization?.id,
    itemId
  );
  const transactions = transactionsData?.transactions ?? [];

  const { data: compatibleEquipment = [] } = useCompatibleEquipmentForItem(
    currentOrganization?.id,
    itemId
  );
  const { data: compatibilityRules = [], isLoading: rulesLoading } = useCompatibilityRulesForItem(
    currentOrganization?.id,
    itemId
  );
  
  // Query for equipment that matches this item's compatibility rules
  const { data: equipmentMatchedByRules = [], isLoading: matchedEquipmentLoading } = useEquipmentMatchingItemRules(
    currentOrganization?.id,
    itemId
  );
  
  // Query for alternate parts (part-number based interchangeability)
  const { data: alternates = [], isLoading: alternatesLoading, refetch: refetchAlternates } = useQuery({
    queryKey: inventoryQueryKeys.itemAlternates(currentOrganization?.id ?? '', itemId ?? ''),
    queryFn: () => getAlternatesForInventoryItem(currentOrganization!.id, itemId!),
    enabled: !!currentOrganization?.id && !!itemId
  });
  
  // Group alternates by group for display
  const groupedAlternates = useMemo(
    () => groupAlternatePartsByGroupId(alternates),
    [alternates],
  );
  
  const deleteMutation = useDeleteInventoryItem();
  const adjustMutation = useAdjustInventoryQuantity();
  const updateMutation = useUpdateInventoryItem();
  const unlinkEquipmentMutation = useUnlinkItemFromEquipment();
  const bulkLinkEquipmentMutation = useBulkLinkEquipmentToItem();
  const bulkSetRulesMutation = useBulkSetCompatibilityRules();
  const createGroupMutation = useCreateAlternateGroup();
  const addToGroupMutation = useAddInventoryItemToGroup();

  const adjustQuantity = useInventoryItemAdjustQuantity({
    organizationId: currentOrganization?.id,
    itemId,
    adjustMutation,
  });

  const { data: allEquipment = [] } = useEquipmentSummaries(currentOrganization?.id, {
    enabled: showAddEquipmentDialog,
  });

  const { data: allGroups = [] } = useAlternateGroups(currentOrganization?.id, {
    enabled: showAddToGroupDialog,
  });

  const equipmentDialog = useInventoryItemEquipmentDialog({
    organizationId: currentOrganization?.id,
    itemId,
    compatibleEquipment,
    bulkLinkEquipmentMutation,
    showAddEquipmentDialog,
    setShowAddEquipmentDialog,
  });

  const alternateGroups = useInventoryItemAlternateGroupDialogs({
    organizationId: currentOrganization?.id,
    itemId,
    groupedAlternates,
    allGroups,
    createGroupMutation,
    addToGroupMutation,
    refetchAlternates,
    showAddToGroupDialog,
    setShowAddToGroupDialog,
  });

  const handleDelete = async () => {
    if (!currentOrganization || !itemId) return;
    try {
      await deleteMutation.mutateAsync({
        organizationId: currentOrganization.id,
        itemId
      });
      navigate('/dashboard/inventory');
    } catch {
      // Error handled in mutation
    }
  };

  const handleRemoveEquipment = async (equipmentId: string) => {
    if (!currentOrganization || !itemId) return;
    try {
      await unlinkEquipmentMutation.mutateAsync({
        organizationId: currentOrganization.id,
        itemId,
        equipmentId
      });
    } catch {
      // Error handled in mutation
    }
  };

  const handleSaveCompatibilityRules = async () => {
    if (!currentOrganization || !itemId) return;
    try {
      await bulkSetRulesMutation.mutateAsync({
        organizationId: currentOrganization.id,
        itemId,
        rules: editingRules,
      });
      setShowEditRules(false);
    } catch (error) {
      logger.error('Error saving compatibility rules', error);
    }
  };

  // Handle inline field updates
  // Only string fields can be edited inline (name, description, sku, external_id, location)
  const handleFieldUpdate = async (
    field: 'name' | 'description' | 'sku' | 'external_id' | 'location',
    value: string
  ) => {
    if (!currentOrganization || !itemId) return;
    await updateMutation.mutateAsync({
      organizationId: currentOrganization.id,
      itemId: itemId,
      formData: { [field]: value }
    });
  };

  // Inline numeric updates for cost and low-stock threshold (#1165). Changes
  // are recorded in the audit log by the inventory_items audit trigger.
  const handleNumericFieldUpdate = async (
    field: 'low_stock_threshold' | 'default_unit_cost',
    value: string
  ) => {
    if (!currentOrganization || !itemId) return;
    const result = parseInventoryNumericField(field, value);
    if (!result.ok) {
      appToast.error({ description: result.error });
      throw new Error(result.error);
    }
    await updateMutation.mutateAsync({
      organizationId: currentOrganization.id,
      itemId,
      formData: result.formData,
    });
  };

  const handleStructuredLocationUpdate = async (
    location: InventoryStructuredLocationFields,
  ) => {
    if (!currentOrganization || !itemId) return;
    await updateMutation.mutateAsync({
      organizationId: currentOrganization.id,
      itemId,
      formData: location,
    });
  };

  if (!currentOrganization) {
    return (
      <Page maxWidth="7xl" padding="responsive">
        <PageHeader title="Inventory Item" description="Please select an organization." />
      </Page>
    );
  }

  if (itemLoading) {
    return (
      <Page maxWidth="7xl" padding="responsive">
        <PageHeader title="Inventory Item" />
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </Page>
    );
  }

  if (!item) {
    return (
      <Page maxWidth="7xl" padding="responsive">
        <PageHeader title="Inventory Item" description="Item not found" />
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Inventory item not found or you don't have access.</p>
            <Button onClick={() => navigate('/dashboard/inventory')} className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Inventory
            </Button>
          </CardContent>
        </Card>
      </Page>
    );
  }

  const stockHealth = getStockHealthPresentation(item);

  return (
    <Page maxWidth="7xl" padding="responsive">
      <div className="space-y-4 md:space-y-6">
        <PageHeader
          density="compact"
          title={item.name}
          backLink={isMobile ? { label: 'Inventory', href: '/dashboard/inventory' } : undefined}
          meta={
            <Badge
              variant="outline"
              className={cn('shrink-0 rounded-full px-2 py-0.5 text-xs font-medium', stockHealth.className)}
            >
              {stockHealth.label}
            </Badge>
          }
          breadcrumbs={isMobile
            ? undefined
            : [
                { label: 'Inventory', href: '/dashboard/inventory' },
                { label: item.name },
              ]}
          actions={
            <div className="flex flex-wrap items-center gap-2 md:flex-nowrap">
              {canEdit && (
                <Button
                  variant="default"
                  onClick={() => adjustQuantity.setShowAdjustDialog(true)}
                  className="min-h-[44px] flex-1 md:flex-initial"
                  aria-label="Adjust Quantity"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  <span className="inline md:hidden">Adjust Qty</span>
                  <span className="hidden md:inline">Adjust Quantity</span>
                </Button>
              )}
              <TooltipProvider delayDuration={150}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={isMobile ? 'ghost' : 'outline'}
                      size={isMobile ? 'icon' : 'default'}
                      onClick={() => setShowQRCode(true)}
                      aria-label="Show QR code"
                      title="Generate QR Code"
                      className={cn(
                        isMobile &&
                          'h-11 w-11 shrink-0 text-muted-foreground hover:text-foreground border border-transparent hover:border-border/60'
                      )}
                    >
                      <QrCode className="h-4 w-4" aria-hidden />
                      {isMobile ? (
                        <span className="sr-only">QR Code</span>
                      ) : (
                        <span>QR Code</span>
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Generate QR code label</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          }
        />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          {isMobile ? (
            <HorizontalChipRow ariaLabel="Item detail sections" className="w-full" gap="gap-1">
              <TabsList className="flex h-auto w-max min-w-0 shrink-0 justify-start gap-1 rounded-md bg-muted p-1">
                <TabsTrigger value="overview" className="shrink-0">
                  <Package className="h-4 w-4 mr-2" />
                  Overview
                </TabsTrigger>
                <TabsTrigger value="transactions" className="shrink-0">
                  <History className="h-4 w-4 mr-2" />
                  Transaction History
                </TabsTrigger>
                <TabsTrigger value="compatibility" className="shrink-0">
                  <Link2 className="h-4 w-4 mr-2" />
                  Compatibility
                </TabsTrigger>
              </TabsList>
            </HorizontalChipRow>
          ) : (
            <TabsList>
              <TabsTrigger value="overview">
                <Package className="h-4 w-4 mr-2" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="transactions">
                <History className="h-4 w-4 mr-2" />
                Transaction History
              </TabsTrigger>
              <TabsTrigger value="compatibility">
                <Link2 className="h-4 w-4 mr-2" />
                Compatibility
              </TabsTrigger>
            </TabsList>
          )}

          <TabsContent
            value="overview"
            className="space-y-4 data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:duration-150 motion-reduce:data-[state=active]:animate-none"
          >
            <InventoryItemOverviewTab
              item={item}
              organization={currentOrganization}
              canEdit={canEdit}
              itemImages={itemImages}
              onFieldUpdate={handleFieldUpdate}
              onNumericFieldUpdate={handleNumericFieldUpdate}
              onSaveStructuredLocation={handleStructuredLocationUpdate}
              onDeleteImage={async (img) => {
                try {
                  await deleteInventoryItemImage(img.id, img.file_url, currentOrganization.id);
                  appToast.success({ description: 'Image removed' });
                  refetchImages();
                } catch (error) {
                  appToast.error({ description: error instanceof Error ? error.message : 'Failed to remove image' });
                }
              }}
              onUploadImages={async (files) => {
                if (!itemId) return;
                await uploadInventoryItemImages(itemId, currentOrganization.id, files);
                refetchImages();
              }}
              onDeleteItemRequest={() => setShowDeleteConfirmation(true)}
            />
          </TabsContent>

          <TabsContent
            value="transactions"
            className="space-y-4 data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:duration-150 motion-reduce:data-[state=active]:animate-none"
          >
            <InventoryItemTransactionsTab transactions={transactions} />
          </TabsContent>

          <TabsContent
            value="compatibility"
            className="space-y-4 data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:duration-150 motion-reduce:data-[state=active]:animate-none"
          >
            <InventoryItemCompatibilityTab
              itemId={itemId}
              canEdit={canEdit}
              compatibilityRules={compatibilityRules}
              rulesLoading={rulesLoading}
              equipmentMatchedByRules={equipmentMatchedByRules}
              matchedEquipmentLoading={matchedEquipmentLoading}
              compatibleEquipment={compatibleEquipment}
              unlinkEquipmentPending={unlinkEquipmentMutation.isPending}
              groupedAlternates={groupedAlternates}
              alternatesLoading={alternatesLoading}
              availableGroupsCount={alternateGroups.availableGroups.length}
              onEditRules={() => {
                setEditingRules(
                  compatibilityRules.map((r) => ({
                    manufacturer: r.manufacturer,
                    model: r.model,
                    match_type: r.match_type || 'exact',
                    status: r.status || 'unverified',
                    notes: r.notes || null,
                  }))
                );
                setShowEditRules(true);
              }}
              onAddRules={() => {
                setEditingRules([
                  { manufacturer: '', model: null, match_type: 'exact', status: 'unverified' },
                ]);
                setShowEditRules(true);
              }}
              onOpenManageEquipment={equipmentDialog.handleOpenAddEquipmentDialog}
              onRemoveEquipment={handleRemoveEquipment}
              onNavigateToEquipment={(equipmentId) =>
                navigate(`/dashboard/equipment/${equipmentId}`)
              }
              onNavigateToInventoryItem={(inventoryItemId) =>
                navigate(`/dashboard/inventory/${inventoryItemId}`)
              }
              onOpenAddToGroup={() => alternateGroups.setShowAddToGroupDialog(true)}
              onOpenCreateGroup={() => alternateGroups.setShowCreateGroupDialog(true)}
              onRefetchAlternates={() => refetchAlternates()}
            />
          </TabsContent>

        </Tabs>

        {/* Audit data lives on the dedicated org-scoped audit log page (#1122). */}
        {itemId && isOrgAdmin && (
          <Button
            variant="link"
            size="sm"
            asChild
            className="h-auto px-0 text-xs text-muted-foreground"
          >
            <Link
              to={`${ORGANIZATION_AUDIT_LOG_PATH}?entityType=inventory_item&entityId=${itemId}`}
            >
              <History className="mr-1 h-3.5 w-3.5" />
              View change history in the Audit Log
            </Link>
          </Button>
        )}

        {itemId && (
          <InventoryItemDetailDialogs
            item={item}
            itemId={itemId}
            transactionCount={transactions.length}
            isMobile={isMobile}
            showEditForm={showEditForm}
            setShowEditForm={setShowEditForm}
            showDeleteConfirmation={showDeleteConfirmation}
            setShowDeleteConfirmation={setShowDeleteConfirmation}
            showDeleteDialog={showDeleteDialog}
            setShowDeleteDialog={setShowDeleteDialog}
            showQRCode={showQRCode}
            setShowQRCode={setShowQRCode}
            adjustQuantity={adjustQuantity}
            equipmentDialog={equipmentDialog}
            allEquipment={allEquipment}
            showEditRules={showEditRules}
            setShowEditRules={setShowEditRules}
            editingRules={editingRules}
            setEditingRules={setEditingRules}
            bulkSetRulesPending={bulkSetRulesMutation.isPending}
            onSaveCompatibilityRules={handleSaveCompatibilityRules}
            alternateGroups={alternateGroups}
            onDelete={handleDelete}
          />
        )}
      </div>
    </Page>
  );
};

export default InventoryItemDetail;


