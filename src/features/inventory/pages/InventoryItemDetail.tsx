import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2, Package, History, Link2, Plus, Minus, QrCode, Search, Check, X, Settings2, CheckCircle2, AlertCircle, RefreshCw, Layers, Cpu, LinkIcon } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useInventoryItem, useInventoryTransactions, useDeleteInventoryItem, useAdjustInventoryQuantity, useUpdateInventoryItem, useUnlinkItemFromEquipment, useCompatibleEquipmentForItem, useBulkLinkEquipmentToItem, useCompatibilityRulesForItem, useBulkSetCompatibilityRules, useEquipmentMatchingItemRules } from '@/features/inventory/hooks/useInventory';
import { useIsPartsManager } from '@/features/inventory/hooks/usePartsManagers';
import {
  useAlternateGroups,
  useCreateAlternateGroup,
  useAddInventoryItemToGroup,
} from '@/features/inventory/hooks/useAlternateGroups';
import { CompatibilityRulesEditor } from '@/features/inventory/components/CompatibilityRulesEditor';
import type { PartCompatibilityRuleFormData, ModelMatchType, VerificationStatus, AlternatePartResult } from '@/features/inventory/types/inventory';
import { getAlternatesForInventoryItem } from '@/features/inventory/services/partAlternatesService';
import { useEquipment } from '@/features/equipment/hooks/useEquipment';
import { usePermissions } from '@/hooks/usePermissions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import Page from '@/components/layout/Page';
import PageHeader from '@/components/layout/PageHeader';
import { InventoryItemForm } from '@/features/inventory/components/InventoryItemForm';
import InventoryQRCodeDisplay from '@/features/inventory/components/InventoryQRCodeDisplay';
import InlineEditField from '@/features/equipment/components/InlineEditField';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { HistoryTab } from '@/components/audit';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { logger } from '@/utils/logger';
import type { PartAlternateGroup, InventoryItemImage } from '@/features/inventory/types/inventory';
import { getInventoryItemImages, uploadInventoryItemImages, deleteInventoryItemImage } from '@/features/inventory/services/inventoryService';
import ImageUploadWithNote from '@/components/common/ImageUploadWithNote';
import { useAppToast } from '@/hooks/useAppToast';

const InventoryItemDetail = () => {
  const { itemId } = useParams<{ itemId: string }>();
  const navigate = useNavigate();
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

  const { data: item, isLoading: itemLoading } = useInventoryItem(
    currentOrganization?.id,
    itemId
  );
  
  // Fetch uploaded images for this item
  const { data: itemImages = [], refetch: refetchImages } = useQuery({
    queryKey: ['inventory-item-images', currentOrganization?.id, itemId],
    queryFn: () => getInventoryItemImages(itemId!, currentOrganization!.id),
    enabled: !!itemId && !!currentOrganization?.id,
  });

  const { data: transactionsData } = useInventoryTransactions(
    currentOrganization?.id,
    itemId
  );
  const transactions = transactionsData?.transactions ?? [];
  
  const { data: allEquipment = [] } = useEquipment(currentOrganization?.id);
  
  // Fetch all alternate groups for adding this item to existing groups
  const { data: allGroups = [] } = useAlternateGroups(currentOrganization?.id);
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
    queryKey: ['inventory-item-alternates', currentOrganization?.id, itemId],
    queryFn: () => getAlternatesForInventoryItem(currentOrganization!.id, itemId!),
    enabled: !!currentOrganization?.id && !!itemId
  });
  
  // Group alternates by group for display
  const groupedAlternates = useMemo(() => {
    const groups = new Map<string, AlternatePartResult[]>();
    for (const alt of alternates) {
      const existing = groups.get(alt.group_id) || [];
      existing.push(alt);
      groups.set(alt.group_id, existing);
    }
    return Array.from(groups.entries());
  }, [alternates]);
  
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

  return (
    <Page maxWidth="7xl" padding="responsive">
      <div className="space-y-4 md:space-y-6">
        <PageHeader
          title={item.name}
          breadcrumbs={[
            { label: 'Inventory', href: '/dashboard/inventory' },
            { label: item.name },
          ]}
          actions={
            <div className="flex flex-wrap gap-2 md:flex-nowrap">
              {canEdit && (
                <Button
                  variant="default"
                  onClick={() => setShowAdjustDialog(true)}
                  className="flex-1 md:flex-initial"
                  aria-label="Adjust Quantity"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  <span className="inline md:hidden">Adjust Qty</span>
                  <span className="hidden md:inline">Adjust Quantity</span>
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => setShowQRCode(true)}
                size="icon"
                aria-label="Show QR Code"
              >
                <QrCode className="h-4 w-4" />
              </Button>
            </div>
          }
        />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className={cn(isMobile && "flex flex-col w-full h-auto gap-1")}>
            <TabsTrigger value="overview" className={isMobile ? "w-full justify-start" : ""}>
              <Package className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="transactions" className={isMobile ? "w-full justify-start" : ""}>
              <History className="h-4 w-4 mr-2" />
              Transaction History
            </TabsTrigger>
            <TabsTrigger value="compatibility" className={isMobile ? "w-full justify-start" : ""}>
              <Link2 className="h-4 w-4 mr-2" />
              Compatibility
            </TabsTrigger>
            <TabsTrigger value="history" className={isMobile ? "w-full justify-start" : ""}>
              <History className="h-4 w-4 mr-2" />
              Change History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Basic Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Name</Label>
                    <div className="mt-1">
                      <InlineEditField
                        value={item.name || ''}
                        onSave={(value) => handleFieldUpdate('name', value)}
                        canEdit={canEdit}
                        placeholder="Enter item name"
                        className="text-base"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Description</Label>
                    <div className="mt-1">
                      <InlineEditField
                        value={item.description || ''}
                        onSave={(value) => handleFieldUpdate('description', value)}
                        canEdit={canEdit}
                        type="textarea"
                        placeholder="Enter description"
                        className="text-base"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">SKU</Label>
                    <div className="mt-1">
                      <InlineEditField
                        value={item.sku || ''}
                        onSave={(value) => handleFieldUpdate('sku', value)}
                        canEdit={canEdit}
                        placeholder="Enter SKU"
                        className="text-base font-mono"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">External ID</Label>
                    <div className="mt-1">
                      <InlineEditField
                        value={item.external_id || ''}
                        onSave={(value) => handleFieldUpdate('external_id', value)}
                        canEdit={canEdit}
                        placeholder="Enter external ID"
                        className="text-base font-mono"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Location</Label>
                    <div className="mt-1">
                      <InlineEditField
                        value={item.location || ''}
                        onSave={(value) => handleFieldUpdate('location', value)}
                        canEdit={canEdit}
                        placeholder="Enter location"
                        className="text-base"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Stock Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-muted-foreground">Quantity on Hand</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-2xl font-bold">{item.quantity_on_hand}</p>
                      {item.isLowStock && (
                        <Badge variant="destructive">Low Stock</Badge>
                      )}
                    </div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Low Stock Threshold</Label>
                    <p className="font-medium">{item.low_stock_threshold}</p>
                  </div>
                  {item.default_unit_cost && (
                    <div>
                      <Label className="text-muted-foreground">Default Unit Cost</Label>
                      <p className="font-medium">${Number(item.default_unit_cost).toFixed(2)}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Item Images Section */}
            <Card>
              <CardHeader>
                <CardTitle>Images</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Display existing uploaded images */}
                {itemImages.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {itemImages.map((img: InventoryItemImage) => (
                      <div key={img.id} className="relative group">
                        <div className="aspect-square bg-muted rounded-lg overflow-hidden">
                          <img
                            src={img.file_url}
                            alt={img.file_name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        {canEdit && (
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            aria-label={`Remove image ${img.file_name}`}
                            className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={async () => {
                              try {
                                await deleteInventoryItemImage(img.id, img.file_url, currentOrganization!.id);
                                appToast.success({ description: 'Image removed' });
                                refetchImages();
                              } catch (error) {
                                appToast.error({ description: error instanceof Error ? error.message : 'Failed to remove image' });
                              }
                            }}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        )}
                        <p className="text-xs text-muted-foreground mt-1 truncate">{img.file_name}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Legacy image_url display (backward compatibility) */}
                {item.image_url && itemImages.length === 0 && (
                  <div>
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="max-w-full h-auto rounded-md"
                    />
                    <p className="text-xs text-muted-foreground mt-2">Legacy image (URL-based)</p>
                  </div>
                )}

                {/* Upload new images */}
                {canEdit && itemImages.length < 5 && (
                  <ImageUploadWithNote
                    onUpload={async (files) => {
                      if (!currentOrganization?.id || !itemId) return;
                      await uploadInventoryItemImages(itemId, currentOrganization.id, files);
                      refetchImages();
                    }}
                    maxFiles={5 - itemImages.length}
                    disabled={false}
                  />
                )}

                {/* No images and not editable */}
                {!canEdit && itemImages.length === 0 && !item.image_url && (
                  <p className="text-sm text-muted-foreground">No images uploaded</p>
                )}
              </CardContent>
            </Card>

            {/* Delete Section */}
            {canEdit && (
              <Card className="border-destructive">
                <CardHeader>
                  <CardTitle className="text-destructive">Delete Item</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Once you delete an inventory item, there is no going back. This action cannot be undone.
                  </p>
                  <Button
                    variant="destructive"
                    onClick={() => setShowDeleteConfirmation(true)}
                    className="w-full sm:w-auto"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Inventory Item
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="transactions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Transaction History</CardTitle>
              </CardHeader>
              <CardContent>
                {transactions.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No transactions yet</p>
                ) : (
                  <div className="space-y-4">
                    {transactions.map((transaction) => (
                      <div
                        key={transaction.id}
                        className="flex items-start justify-between p-4 border rounded-lg"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline">{transaction.transaction_type}</Badge>
                            <span className="font-medium">
                              {transaction.change_amount > 0 ? '+' : ''}
                              {transaction.change_amount}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {transaction.previous_quantity} → {transaction.new_quantity}
                          </p>
                          {transaction.notes && (
                            <p className="text-sm mt-1">{transaction.notes}</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            {transaction.userName || 'Unknown'} •{' '}
                            {format(new Date(transaction.created_at), 'PPp')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="compatibility" className="space-y-4">
            {/* Compatibility Rules Card - First */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle>Compatibility Rules</CardTitle>
                {canEdit && (
                  <Button
                    onClick={() => {
                      // Initialize editing state with current rules (including new fields)
                      setEditingRules(compatibilityRules.map(r => ({
                        manufacturer: r.manufacturer,
                        model: r.model,
                        match_type: r.match_type || 'exact',
                        status: r.status || 'unverified',
                        notes: r.notes || null
                      })));
                      setShowEditRules(true);
                    }}
                    size="sm"
                  >
                    <Settings2 className="h-4 w-4 mr-2" />
                    Edit Rules
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {rulesLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-3/4" />
                  </div>
                ) : compatibilityRules.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground mb-2">
                      No compatibility rules defined
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Rules automatically match parts to equipment by manufacturer and model.
                    </p>
                    {canEdit && (
                      <Button
                        onClick={() => {
                          setEditingRules([{ manufacturer: '', model: null, match_type: 'exact', status: 'unverified' }]);
                          setShowEditRules(true);
                        }}
                        variant="outline"
                        className="mt-4"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Rules
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {compatibilityRules.map((rule) => {
                      const matchType = (rule.match_type || 'exact') as ModelMatchType;
                      const status = (rule.status || 'unverified') as VerificationStatus;
                      const matchTypeLabel = {
                        any: 'Any model',
                        exact: rule.model || 'Any model',
                        prefix: `${rule.model}*`,
                        wildcard: rule.model_pattern_raw || rule.model || '?'
                      }[matchType];
                      
                      return (
                        <div 
                          key={rule.id} 
                          className="flex items-center justify-between p-2 border rounded-md"
                        >
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium">{rule.manufacturer}</span>
                            <span className="text-muted-foreground">→</span>
                            <Badge variant="outline" className="text-xs capitalize">
                              {matchType === 'any' ? 'Any' : matchType}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {matchTypeLabel}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {status === 'verified' && (
                              <Badge className="bg-green-600 text-xs">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Verified
                              </Badge>
                            )}
                            {status === 'deprecated' && (
                              <Badge variant="secondary" className="text-xs">
                                Deprecated
                              </Badge>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Equipment Matched by Rules - Shows equipment auto-discovered via rules */}
            {compatibilityRules.length > 0 && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Cpu className="h-5 w-5 text-muted-foreground" />
                      Equipment Matched by Rules
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Equipment auto-discovered via the compatibility rules above
                    </p>
                  </div>
                </CardHeader>
                <CardContent>
                  {matchedEquipmentLoading ? (
                    <div className="space-y-2">
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-3/4" />
                    </div>
                  ) : equipmentMatchedByRules.length === 0 ? (
                    <div className="text-center py-8">
                      <Cpu className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                      <p className="text-muted-foreground mb-2">
                        No equipment matches the current rules
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Equipment with matching manufacturer and model will appear here automatically.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {equipmentMatchedByRules.map((equipment) => (
                        <div
                          key={equipment.equipment_id}
                          className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                          onClick={() => navigate(`/dashboard/equipment/${equipment.equipment_id}`)}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-medium">{equipment.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {equipment.manufacturer} {equipment.model}
                              {equipment.serial_number && ` • S/N: ${equipment.serial_number}`}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 ml-4">
                            <Badge variant="secondary" className="text-xs capitalize">
                              {equipment.matched_rule_match_type}
                            </Badge>
                            {equipment.matched_rule_status === 'verified' && (
                              <Badge className="bg-green-600 text-xs">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Verified
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                      <p className="text-xs text-muted-foreground text-center pt-2">
                        {equipmentMatchedByRules.length} equipment {equipmentMatchedByRules.length === 1 ? 'item' : 'items'} matched
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Direct Associations - Manually linked equipment (regardless of rules) */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <LinkIcon className="h-5 w-5 text-muted-foreground" />
                    Direct Associations
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Equipment manually linked to this part (independent of rules)
                  </p>
                </div>
                {canEdit && (
                  <Button
                    onClick={handleOpenAddEquipmentDialog}
                    size="sm"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Manage
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {compatibleEquipment.length === 0 ? (
                  <div className="text-center py-8">
                    <LinkIcon className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                    <p className="text-muted-foreground mb-2">
                      No equipment directly linked
                    </p>
                    <p className="text-sm text-muted-foreground mb-4">
                      Direct associations are useful for special cases not covered by rules.
                    </p>
                    {canEdit && (
                      <Button onClick={handleOpenAddEquipmentDialog} variant="outline">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Equipment
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {compatibleEquipment.map((equipment) => (
                      <div
                        key={equipment.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div 
                          className="flex-1 min-w-0 cursor-pointer hover:text-primary"
                          onClick={() => navigate(`/dashboard/equipment/${equipment.id}`)}
                        >
                          <p className="font-medium">{equipment.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {equipment.manufacturer} {equipment.model}
                          </p>
                        </div>
                        {canEdit && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveEquipment(equipment.id)}
                            disabled={unlinkEquipmentMutation.isPending}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Part Alternates / Interchange Groups */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div>
                  <CardTitle>Part Alternates</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Interchangeable parts based on part number equivalence groups
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {canEdit && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowAddToGroupDialog(true)}
                        disabled={availableGroups.length === 0}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add to Group
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => setShowCreateGroupDialog(true)}
                      >
                        <Layers className="h-4 w-4 mr-2" />
                        Create Group
                      </Button>
                    </>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => refetchAlternates()}
                    disabled={alternatesLoading}
                  >
                    <RefreshCw className={`h-4 w-4 ${alternatesLoading ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {alternatesLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-3/4" />
                  </div>
                ) : groupedAlternates.length === 0 ? (
                  <div className="text-center py-8">
                    <Layers className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                    <p className="text-muted-foreground mb-2">
                      No alternate part groups found
                    </p>
                    <p className="text-sm text-muted-foreground mb-4">
                      Add this part to an existing group or create a new one to define interchangeable parts.
                    </p>
                    {canEdit && (
                      <div className="flex justify-center gap-2">
                        {availableGroups.length > 0 && (
                          <Button variant="outline" onClick={() => setShowAddToGroupDialog(true)}>
                            <Plus className="h-4 w-4 mr-2" />
                            Add to Existing Group
                          </Button>
                        )}
                        <Button onClick={() => setShowCreateGroupDialog(true)}>
                          <Layers className="h-4 w-4 mr-2" />
                          Create New Group
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {groupedAlternates.map(([groupId, parts]) => {
                      const groupName = parts[0].group_name;
                      const groupVerified = parts[0].group_verified;
                      const groupNotes = parts[0].group_notes;
                      const inventoryParts = parts.filter(p => p.inventory_item_id);
                      const inStockParts = parts.filter(p => p.is_in_stock);
                      
                      return (
                        <div key={groupId} className="border rounded-lg p-4 space-y-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium">{groupName}</h4>
                                {groupVerified && (
                                  <Badge className="bg-green-600 text-xs">
                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                    Verified
                                  </Badge>
                                )}
                              </div>
                              {groupNotes && (
                                <p className="text-sm text-muted-foreground mt-1">{groupNotes}</p>
                              )}
                            </div>
                            <div className="text-right text-sm text-muted-foreground">
                              <div>{inventoryParts.length} in inventory</div>
                              <div className={inStockParts.length > 0 ? 'text-green-600 font-medium' : ''}>
                                {inStockParts.length} in stock
                              </div>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            {parts.map((part, idx) => {
                              const isCurrentItem = part.inventory_item_id === itemId;
                              
                              return (
                                <div
                                  key={idx}
                                  className={`flex items-center justify-between p-2 rounded border ${
                                    isCurrentItem 
                                      ? 'border-primary bg-primary/5' 
                                      : 'border-border hover:bg-muted/50'
                                  } ${part.inventory_item_id && !isCurrentItem ? 'cursor-pointer' : ''}`}
                                  onClick={() => {
                                    if (part.inventory_item_id && !isCurrentItem) {
                                      navigate(`/dashboard/inventory/${part.inventory_item_id}`);
                                    }
                                  }}
                                >
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      {part.inventory_name ? (
                                        <span className="font-medium">{part.inventory_name}</span>
                                      ) : (
                                        <span className="text-muted-foreground">
                                          {part.identifier_manufacturer && `${part.identifier_manufacturer} `}
                                          {part.identifier_value}
                                        </span>
                                      )}
                                      
                                      {isCurrentItem && (
                                        <Badge variant="outline" className="text-xs">
                                          This item
                                        </Badge>
                                      )}
                                      
                                      {part.is_primary && (
                                        <Badge variant="secondary" className="text-xs">
                                          Primary
                                        </Badge>
                                      )}
                                      
                                      {part.identifier_type && (
                                        <Badge variant="outline" className="text-xs uppercase">
                                          {part.identifier_type}
                                        </Badge>
                                      )}
                                    </div>
                                    
                                    {part.inventory_item_id && part.inventory_sku && (
                                      <div className="text-sm text-muted-foreground mt-0.5">
                                        SKU: {part.inventory_sku}
                                        {part.location && ` • ${part.location}`}
                                      </div>
                                    )}
                                  </div>
                                  
                                  {part.inventory_item_id && (
                                    <div className="text-right ml-4">
                                      <div className={`font-medium ${
                                        part.is_low_stock 
                                          ? 'text-destructive' 
                                          : part.is_in_stock 
                                            ? 'text-green-600' 
                                            : 'text-muted-foreground'
                                      }`}>
                                        {part.quantity_on_hand}
                                      </div>
                                      {part.is_low_stock && (
                                        <div className="text-xs text-destructive flex items-center justify-end gap-1">
                                          <AlertCircle className="h-3 w-3" />
                                          Low
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
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

        {/* Adjust Quantity Dialog */}
        <Dialog 
          open={showAdjustDialog} 
          onOpenChange={(open) => {
            setShowAdjustDialog(open);
            if (!open) {
              resetAdjustDialog();
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adjust Quantity</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              {/* Current Quantity Display */}
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">Current quantity</p>
                <p className="text-4xl font-bold">{item.quantity_on_hand}</p>
              </div>

              {/* Add Section */}
              {!showSubtractInput && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Add to inventory</Label>
                  {showAddInput ? (
                    <div className="space-y-3">
                      <Input
                        type="number"
                        min="1"
                        value={adjustmentAmount}
                        onChange={(e) => setAdjustmentAmount(Math.max(1, parseInt(e.target.value) || 1))}
                        placeholder="Enter amount to add"
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={handleCancelInput}
                          className="flex-1"
                        >
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
                      <Button
                        onClick={handleQuickAdd}
                        disabled={adjustMutation.isPending}
                        className="flex-1"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add 1
                      </Button>
                      <Button
                        variant="outline"
                        onClick={handleShowAddMore}
                        className="flex-1"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add More
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Take Section */}
              {!showAddInput && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Take from inventory</Label>
                  {showSubtractInput ? (
                    <div className="space-y-3">
                      <Input
                        type="number"
                        min="1"
                        value={adjustmentAmount}
                        onChange={(e) => setAdjustmentAmount(Math.max(1, parseInt(e.target.value) || 1))}
                        placeholder="Enter amount to take"
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={handleCancelInput}
                          className="flex-1"
                        >
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
                        className="flex-1"
                      >
                        <Minus className="h-4 w-4 mr-2" />
                        Take More
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Reason Field - Always visible */}
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

              {/* Cancel Button - Only show when not in input mode */}
              {!showAddInput && !showSubtractInput && (
                <div className="flex justify-end">
                  <Button variant="outline" onClick={() => setShowAdjustDialog(false)}>
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

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

                  return filteredEquipment.map((equipment) => {
                    const isSelected = selectedEquipmentIds.includes(equipment.id);
                    return (
                      <div
                        key={equipment.id}
                        className="flex items-center space-x-3 p-2 hover:bg-muted/50 rounded"
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) =>
                            handleEquipmentToggle(equipment.id, checked as boolean)
                          }
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium">{equipment.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {equipment.manufacturer} {equipment.model}
                          </div>
                        </div>
                        {isSelected && (
                          <Badge variant="secondary" className="text-xs">
                            <Check className="h-3 w-3 mr-1" />
                            Selected
                          </Badge>
                        )}
                      </div>
                    );
                  });
                })()}
              </div>
              {selectedEquipmentIds.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedEquipmentIds.map((id) => {
                    const equipment = allEquipment.find((eq) => eq.id === id);
                    return equipment ? (
                      <Badge key={id} variant="secondary" className="gap-1">
                        {equipment.name}
                        <button
                          type="button"
                          aria-label={`Remove ${equipment.name} from selected equipment`}
                          onClick={() => handleEquipmentToggle(id, false)}
                          className="ml-1 inline-flex items-center justify-center rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                        >
                          <X className="h-3 w-3" aria-hidden="true" />
                        </button>
                      </Badge>
                    ) : null;
                  })}
                </div>
              )}
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
              <CompatibilityRulesEditor
                rules={editingRules}
                onChange={setEditingRules}
                disabled={bulkSetRulesMutation.isPending}
              />
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
                          <Badge className="bg-green-600 text-xs">
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

