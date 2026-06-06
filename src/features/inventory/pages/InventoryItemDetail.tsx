import React, { useState, useMemo, useEffect, lazy, Suspense } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Package, History, Link2, Plus, Minus, QrCode, Search, Check, X, Settings2, CheckCircle2, AlertCircle, RefreshCw, Layers, Cpu, LinkIcon } from 'lucide-react';
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
// Lazy-mount the rules editor only when the dialog is opened. The editor pulls
// in the full equipment manufacturers/models query (and its own sub-queries),
// none of which are needed unless the user is actively editing rules.
const CompatibilityRulesEditor = lazy(() =>
  import('@/features/inventory/components/CompatibilityRulesEditor').then((m) => ({
    default: m.CompatibilityRulesEditor,
  })),
);
import type { PartCompatibilityRuleFormData, ModelMatchType, VerificationStatus, AlternatePartResult } from '@/features/inventory/types/inventory';
import { getAlternatesForInventoryItem } from '@/features/inventory/services/partAlternatesService';
import { groupAlternatePartsByGroupId } from '@/features/inventory/utils/groupAlternateParts';
import { SelectedEquipmentBadgeList } from '@/components/common/SelectedEquipmentBadgeList';
import { usePermissions } from '@/hooks/usePermissions';
import { InventoryEquipmentPickerRow } from '@/features/inventory/components/InventoryEquipmentPickerRow';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import Page from '@/components/layout/Page';
import PageHeader from '@/components/layout/PageHeader';
import { InventoryItemForm } from '@/features/inventory/components/InventoryItemForm';
import InventoryQRCodeDisplay from '@/features/inventory/components/InventoryQRCodeDisplay';
import { useAuth } from '@/hooks/useAuth';
import { HistoryTab } from '@/components/audit';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { logger } from '@/utils/logger';
import type { PartAlternateGroup } from '@/features/inventory/types/inventory';
import { getInventoryItemImages, uploadInventoryItemImages, deleteInventoryItemImage } from '@/features/inventory/services/inventoryService';
import { useAppToast } from '@/hooks/useAppToast';
import { inventory as inventoryQueryKeys } from '@/lib/queryKeys';
import InventoryItemOverviewTab from '@/features/inventory/pages/components/InventoryItemOverviewTab';
import InventoryItemTransactionsTab from '@/features/inventory/pages/components/InventoryItemTransactionsTab';
import InventoryItemCompatibilityTab from '@/features/inventory/pages/components/InventoryItemCompatibilityTab';
import { HorizontalChipRow } from '@/components/layout/HorizontalChipRow';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { getStockHealthPresentation } from '@/features/inventory/utils/stockHealth';

const InventoryItemDetail = () => {
  const { itemId } = useParams<{ itemId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentOrganization } = useOrganization();
  const { user } = useAuth();
  const { canManageInventory } = usePermissions();
  const isMobile = useIsMobile();
  const appToast = useAppToast();

  // Check if user is a parts manager for permission calculation
  const { data: isPartsManager = false } = useIsPartsManager(currentOrganization?.id);
  const canEdit = canManageInventory(isPartsManager);

  const [activeTab, setActiveTab] = useState('overview');
  const [showEditForm, setShowEditForm] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [showAdjustDialog, setShowAdjustDialog] = useState(false);
  const [showAddInput, setShowAddInput] = useState(false);
  const [showSubtractInput, setShowSubtractInput] = useState(false);
  const [adjustmentAmount, setAdjustmentAmount] = useState(1);
  const [adjustReason, setAdjustReason] = useState('');
  const [showQRCode, setShowQRCode] = useState(false);
  const [showAddEquipmentDialog, setShowAddEquipmentDialog] = useState(false);
  const [equipmentSearch, setEquipmentSearch] = useState('');
  const [selectedEquipmentIds, setSelectedEquipmentIds] = useState<string[]>([]);
  const [showEditRules, setShowEditRules] = useState(false);
  const [editingRules, setEditingRules] = useState<PartCompatibilityRuleFormData[]>([]);
  
  // Alternate group management state
  const [showCreateGroupDialog, setShowCreateGroupDialog] = useState(false);
  const [showAddToGroupDialog, setShowAddToGroupDialog] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [groupSearch, setGroupSearch] = useState('');

  // Open add-to-group dialog when navigated with ?alternateAction=add.
  // Guard on canEdit so a crafted URL cannot drop a read-only user into a
  // write flow they should never see.
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
  
  // Equipment list is only needed when the "Add Equipment Compatibility"
  // dialog is open. Use the lightweight summaries projection so the dropdown
  // load stays fast on Slow 4G and avoid even the request until the dialog
  // is visible.
  const { data: allEquipment = [] } = useEquipmentSummaries(currentOrganization?.id, {
    enabled: showAddEquipmentDialog,
  });

  // Alternate groups list is only used inside the "Add to Existing Group"
  // dialog. Defer until the user opens it.
  const { data: allGroups = [] } = useAlternateGroups(currentOrganization?.id, {
    enabled: showAddToGroupDialog,
  });
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

  const resetAdjustDialog = () => {
    setShowAddInput(false);
    setShowSubtractInput(false);
    setAdjustmentAmount(1);
    setAdjustReason('');
  };

  const handleAdjustQuantity = async (delta: number) => {
    if (!currentOrganization || !itemId || !user || delta === 0) return;
    try {
      await adjustMutation.mutateAsync({
        organizationId: currentOrganization.id,
        adjustment: {
          itemId,
          delta,
          reason: adjustReason || 'Manual adjustment'
        }
      });
      setShowAdjustDialog(false);
      resetAdjustDialog();
    } catch {
      // Error handled in mutation
    }
  };

  const handleQuickAdd = () => {
    handleAdjustQuantity(1);
  };

  const handleQuickTake = () => {
    handleAdjustQuantity(-1);
  };

  const handleShowAddMore = () => {
    setShowAddInput(true);
    setShowSubtractInput(false);
    setAdjustmentAmount(1);
  };

  const handleShowTakeMore = () => {
    setShowSubtractInput(true);
    setShowAddInput(false);
    setAdjustmentAmount(1);
  };

  const handleCancelInput = () => {
    setShowAddInput(false);
    setShowSubtractInput(false);
    setAdjustmentAmount(1);
  };

  const handleSubmitMore = () => {
    if (adjustmentAmount <= 0) return;
    const delta = showAddInput ? adjustmentAmount : -adjustmentAmount;
    handleAdjustQuantity(delta);
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

  const handleOpenAddEquipmentDialog = () => {
    const currentEquipmentIds = compatibleEquipment.map(eq => eq.id);
    setSelectedEquipmentIds(currentEquipmentIds);
    setEquipmentSearch('');
    setShowAddEquipmentDialog(true);
  };

  const handleSaveEquipmentCompatibility = async () => {
    if (!currentOrganization || !itemId) return;

    try {
      // Use bulk operation to avoid multiple toast notifications
      await bulkLinkEquipmentMutation.mutateAsync({
        organizationId: currentOrganization.id,
        itemId,
        equipmentIds: selectedEquipmentIds
      });

      setShowAddEquipmentDialog(false);
    } catch {
      // Errors handled in mutation
    }
  };

  const handleEquipmentToggle = (equipmentId: string, checked: boolean) => {
    if (checked) {
      setSelectedEquipmentIds(prev => [...prev, equipmentId]);
    } else {
      setSelectedEquipmentIds(prev => prev.filter(id => id !== equipmentId));
    }
  };

  // Filter groups for the "Add to Group" dialog - exclude groups this item is already in
  const itemGroupIds = useMemo(() => {
    return new Set(groupedAlternates.map(([groupId]) => groupId));
  }, [groupedAlternates]);

  const availableGroups = useMemo(() => {
    return allGroups.filter((g) => !itemGroupIds.has(g.id));
  }, [allGroups, itemGroupIds]);

  const filteredGroups = useMemo(() => {
    if (!groupSearch.trim()) return availableGroups;
    const needle = groupSearch.toLowerCase();
    return availableGroups.filter(
      (g) =>
        g.name.toLowerCase().includes(needle) ||
        g.description?.toLowerCase().includes(needle)
    );
  }, [availableGroups, groupSearch]);

  // Handlers for alternate group management
  const handleCreateGroupWithItem = async () => {
    if (!currentOrganization || !itemId || !newGroupName.trim()) return;
    try {
      const newGroup = await createGroupMutation.mutateAsync({
        organizationId: currentOrganization.id,
        data: {
          name: newGroupName.trim(),
          status: 'unverified',
        },
      });
      // Add this item to the new group
      await addToGroupMutation.mutateAsync({
        organizationId: currentOrganization.id,
        groupId: newGroup.id,
        inventoryItemId: itemId,
        isPrimary: true,
      });
      setShowCreateGroupDialog(false);
      setNewGroupName('');
      refetchAlternates();
    } catch (error) {
      logger.error('Error creating group with item', error);
    }
  };

  const handleAddToGroup = async () => {
    if (!currentOrganization || !itemId || !selectedGroupId) return;
    try {
      await addToGroupMutation.mutateAsync({
        organizationId: currentOrganization.id,
        groupId: selectedGroupId,
        inventoryItemId: itemId,
      });
      setShowAddToGroupDialog(false);
      setSelectedGroupId(null);
      setGroupSearch('');
      refetchAlternates();
    } catch (error) {
      logger.error('Error adding item to group', error);
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

  const handleAdjustOpenChange = (open: boolean) => {
    setShowAdjustDialog(open);
    if (!open) {
      resetAdjustDialog();
    }
  };

  const outlineSecondaryClass = isMobile ? 'border-2 border-input bg-muted/25 hover:bg-muted/40' : '';

  const adjustQuantityInner = (
    <div
      className={cn(
        'space-y-6',
        isMobile
          ? 'max-h-[min(85dvh,calc(100dvh-8rem))] overflow-y-auto overscroll-contain px-4 pb-2 [-webkit-overflow-scrolling:touch]'
          : 'max-h-[calc(100dvh-11rem)] overflow-y-auto overscroll-contain pr-1 pb-safe-bottom'
      )}
    >
      <div className="text-center">
        <p className="text-sm text-muted-foreground mb-2">Current quantity</p>
        <p className="text-4xl font-bold">{item.quantity_on_hand}</p>
      </div>

      {!showSubtractInput && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Add to inventory</Label>
          {showAddInput ? (
            <div className="space-y-3">
              <Input
                type="number"
                min="1"
                value={adjustmentAmount}
                onChange={(e) => setAdjustmentAmount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                placeholder="Enter amount to add"
                autoFocus
              />
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleCancelInput} className="flex-1">
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmitMore}
                  disabled={adjustmentAmount <= 0 || adjustMutation.isPending}
                  className="flex-1"
                >
                  {adjustMutation.isPending ? 'Adding...' : 'Add'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button onClick={handleQuickAdd} disabled={adjustMutation.isPending} className="flex-1">
                <Plus className="h-4 w-4 mr-2" />
                Add 1
              </Button>
              <Button
                variant="outline"
                onClick={handleShowAddMore}
                className={cn('flex-1', outlineSecondaryClass)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add More
              </Button>
            </div>
          )}
        </div>
      )}

      {!showAddInput && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Take from inventory</Label>
          {showSubtractInput ? (
            <div className="space-y-3">
              <Input
                type="number"
                min="1"
                value={adjustmentAmount}
                onChange={(e) => setAdjustmentAmount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                placeholder="Enter amount to take"
                autoFocus
              />
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleCancelInput} className="flex-1">
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmitMore}
                  disabled={adjustmentAmount <= 0 || adjustMutation.isPending}
                  className="flex-1"
                >
                  {adjustMutation.isPending ? 'Taking...' : 'Take'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button
                onClick={handleQuickTake}
                disabled={adjustMutation.isPending}
                variant="destructive"
                className="flex-1"
              >
                <Minus className="h-4 w-4 mr-2" />
                Take 1
              </Button>
              <Button
                variant="outline"
                onClick={handleShowTakeMore}
                className={cn('flex-1', outlineSecondaryClass)}
              >
                <Minus className="h-4 w-4 mr-2" />
                Take More
              </Button>
            </div>
          )}
        </div>
      )}

      <div>
        <Label htmlFor="adjust-reason" className="text-sm font-medium">
          Reason <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
        <Textarea
          id="adjust-reason"
          value={adjustReason}
          onChange={(e) => setAdjustReason(e.target.value)}
          placeholder="Reason for adjustment..."
          rows={3}
          className="mt-1"
        />
      </div>

      {!showAddInput && !showSubtractInput && (
        isMobile ? (
          <Button
            variant="outline"
            className="w-full min-h-11 border-border/80 bg-transparent"
            onClick={() => handleAdjustOpenChange(false)}
          >
            Cancel
          </Button>
        ) : (
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => handleAdjustOpenChange(false)}>
              Cancel
            </Button>
          </div>
        )
      )}
    </div>
  );

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
                  onClick={() => setShowAdjustDialog(true)}
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
                <TabsTrigger value="history" className="shrink-0">
                  <History className="h-4 w-4 mr-2" />
                  Change History
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
              <TabsTrigger value="history">
                <History className="h-4 w-4 mr-2" />
                Change History
              </TabsTrigger>
            </TabsList>
          )}

          <TabsContent
            value="overview"
            className="space-y-4 data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:duration-150 motion-reduce:data-[state=active]:animate-none"
          >
            <InventoryItemOverviewTab
              item={item}
              canEdit={canEdit}
              itemImages={itemImages}
              onFieldUpdate={handleFieldUpdate}
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
              availableGroupsCount={availableGroups.length}
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
              onOpenManageEquipment={handleOpenAddEquipmentDialog}
              onRemoveEquipment={handleRemoveEquipment}
              onNavigateToEquipment={(equipmentId) =>
                navigate(`/dashboard/equipment/${equipmentId}`)
              }
              onNavigateToInventoryItem={(inventoryItemId) =>
                navigate(`/dashboard/inventory/${inventoryItemId}`)
              }
              onOpenAddToGroup={() => setShowAddToGroupDialog(true)}
              onOpenCreateGroup={() => setShowCreateGroupDialog(true)}
              onRefetchAlternates={() => refetchAlternates()}
            />
          </TabsContent>

          <TabsContent
            value="history"
            className="space-y-4 data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:duration-150 motion-reduce:data-[state=active]:animate-none"
          >
            <Card>
              <CardHeader>
                <CardTitle>Change History</CardTitle>
              </CardHeader>
              <CardContent>
                {itemId && (
                  <HistoryTab
                    entityType="inventory_item"
                    entityId={itemId}
                    organizationId={currentOrganization.id}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>
        {/* Edit Form */}
        {showEditForm && (
          <InventoryItemForm
            open={showEditForm}
            onClose={() => setShowEditForm(false)}
            editingItem={item}
          />
        )}

        {/* Delete Confirmation Dialog - First Step */}
        <Dialog open={showDeleteConfirmation} onOpenChange={setShowDeleteConfirmation}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Inventory Item</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete "{item.name}"? This will permanently delete the item and all its transaction history. This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowDeleteConfirmation(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={() => {
                setShowDeleteConfirmation(false);
                setShowDeleteDialog(true);
              }}>
                Continue
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Dialog - Final Confirmation */}
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Final Confirmation</DialogTitle>
              <DialogDescription>
                This will permanently delete "{item.name}" and all {transactions.length} transaction record{transactions.length !== 1 ? 's' : ''}. This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => {
                setShowDeleteDialog(false);
                setShowDeleteConfirmation(false);
              }}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDelete}>
                Delete Permanently
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* QR Code Display */}
        {itemId && (
          <InventoryQRCodeDisplay
            open={showQRCode}
            onClose={() => setShowQRCode(false)}
            itemId={itemId}
            itemName={item.name}
          />
        )}

        {/* Adjust Quantity: bottom sheet on mobile, centered dialog on desktop */}
        {isMobile ? (
          <Drawer open={showAdjustDialog} onOpenChange={handleAdjustOpenChange}>
            <DrawerContent className="max-h-[92dvh] pb-safe-bottom">
              <DrawerHeader className="text-left">
                <DrawerTitle>Adjust Quantity</DrawerTitle>
                <DrawerDescription className="sr-only">
                  Add or remove inventory quantity. You can optionally record a reason.
                </DrawerDescription>
              </DrawerHeader>
              {adjustQuantityInner}
            </DrawerContent>
          </Drawer>
        ) : (
          <Dialog open={showAdjustDialog} onOpenChange={handleAdjustOpenChange}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Adjust Quantity</DialogTitle>
                <DialogDescription className="sr-only">
                  Add or remove inventory quantity. You can optionally record a reason.
                </DialogDescription>
              </DialogHeader>
              {adjustQuantityInner}
            </DialogContent>
          </Dialog>
        )}

        {/* Add/Manage Equipment Compatibility Dialog */}
        <Dialog open={showAddEquipmentDialog} onOpenChange={setShowAddEquipmentDialog}>
          <DialogContent className="max-w-2xl max-h-[calc(100dvh-2rem)] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Manage Compatible Equipment</DialogTitle>
              <DialogDescription>
                Select equipment that is compatible with this inventory item
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search equipment..."
                  value={equipmentSearch}
                  onChange={(e) => setEquipmentSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="border rounded-md p-2 space-y-2 max-h-96 overflow-y-auto">
                {(() => {
                  const filteredEquipment = allEquipment.filter(
                    (eq) =>
                      eq.name.toLowerCase().includes(equipmentSearch.toLowerCase()) ||
                      (eq.manufacturer ?? '').toLowerCase().includes(equipmentSearch.toLowerCase()) ||
                      (eq.model ?? '').toLowerCase().includes(equipmentSearch.toLowerCase())
                  );

                  if (filteredEquipment.length === 0) {
                    return (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        {allEquipment.length === 0
                          ? 'No equipment available'
                          : 'No equipment found matching your search'}
                      </p>
                    );
                  }

                  return filteredEquipment.map((equipment) => (
                    <InventoryEquipmentPickerRow
                      key={equipment.id}
                      equipment={equipment}
                      isSelected={selectedEquipmentIds.includes(equipment.id)}
                      onToggle={handleEquipmentToggle}
                      selectedBadgeLabel="Selected"
                    />
                  ));
                })()}
              </div>
              <SelectedEquipmentBadgeList
                selectedEquipmentIds={selectedEquipmentIds}
                allEquipment={allEquipment}
                onRemove={(id) => handleEquipmentToggle(id, false)}
                removeControl="button"
              />
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowAddEquipmentDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveEquipmentCompatibility}
                  disabled={bulkLinkEquipmentMutation.isPending}
                >
                  {bulkLinkEquipmentMutation.isPending
                    ? 'Saving...'
                    : 'Save Changes'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Compatibility Rules Dialog */}
        <Dialog open={showEditRules} onOpenChange={setShowEditRules}>
          <DialogContent className="max-w-2xl max-h-[calc(100dvh-2rem)] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Compatibility Rules</DialogTitle>
              <DialogDescription>
                Define manufacturer and model patterns to automatically match this part with compatible equipment.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {showEditRules && (
                <Suspense fallback={<Skeleton className="h-32 w-full" />}>
                  <CompatibilityRulesEditor
                    rules={editingRules}
                    onChange={setEditingRules}
                    disabled={bulkSetRulesMutation.isPending}
                  />
                </Suspense>
              )}
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowEditRules(false)}
                  disabled={bulkSetRulesMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  onClick={async () => {
                    if (!currentOrganization || !itemId) return;
                    try {
                      await bulkSetRulesMutation.mutateAsync({
                        organizationId: currentOrganization.id,
                        itemId,
                        rules: editingRules
                      });
                      setShowEditRules(false);
                    } catch (error) {
                      // Error toast is handled by the mutation hook
                      logger.error('Error saving compatibility rules', error);
                    }
                  }}
                  disabled={bulkSetRulesMutation.isPending}
                >
                  {bulkSetRulesMutation.isPending ? 'Saving...' : 'Save Rules'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Create Alternate Group Dialog */}
        <Dialog open={showCreateGroupDialog} onOpenChange={setShowCreateGroupDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Alternate Group</DialogTitle>
              <DialogDescription>
                Create a new alternate group with this item as the first member.
                Other interchangeable parts can be added later.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="group-name">
                  Group Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="group-name"
                  placeholder="e.g., Oil Filter - CAT D6T Compatible"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  A descriptive name for this group of interchangeable parts.
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCreateGroupDialog(false);
                    setNewGroupName('');
                  }}
                  disabled={createGroupMutation.isPending || addToGroupMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateGroupWithItem}
                  disabled={!newGroupName.trim() || createGroupMutation.isPending || addToGroupMutation.isPending}
                >
                  {createGroupMutation.isPending || addToGroupMutation.isPending
                    ? 'Creating...'
                    : 'Create Group'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Add to Existing Group Dialog */}
        <Dialog open={showAddToGroupDialog} onOpenChange={setShowAddToGroupDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Add to Alternate Group</DialogTitle>
              <DialogDescription>
                Select an existing alternate group to add this item to.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search groups..."
                  value={groupSearch}
                  onChange={(e) => setGroupSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="max-h-60 overflow-y-auto border rounded-md p-2 space-y-1">
                {filteredGroups.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    {availableGroups.length === 0
                      ? 'No available groups. Create a new one instead.'
                      : 'No groups found matching your search'}
                  </p>
                ) : (
                  filteredGroups.map((group: PartAlternateGroup) => (
                    <div
                      key={group.id}
                      className={`p-3 rounded cursor-pointer hover:bg-muted/50 ${
                        selectedGroupId === group.id ? 'bg-primary/10 border border-primary' : 'border border-transparent'
                      }`}
                      onClick={() => setSelectedGroupId(group.id)}
                    >
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{group.name}</p>
                        {group.status === 'verified' && (
                          <Badge className="bg-success text-xs">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Verified
                          </Badge>
                        )}
                      </div>
                      {group.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {group.description}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowAddToGroupDialog(false);
                    setSelectedGroupId(null);
                    setGroupSearch('');
                  }}
                  disabled={addToGroupMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddToGroup}
                  disabled={!selectedGroupId || addToGroupMutation.isPending}
                >
                  {addToGroupMutation.isPending ? 'Adding...' : 'Add to Group'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Page>
  );
};

export default InventoryItemDetail;


