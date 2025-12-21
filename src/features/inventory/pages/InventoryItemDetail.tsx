import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2, Package, History, Link2, Users, Plus, Minus, QrCode, Search, Check, X } from 'lucide-react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useInventoryItem, useInventoryTransactions, useInventoryItemManagers, useDeleteInventoryItem, useAdjustInventoryQuantity, useUpdateInventoryItem, useUnlinkItemFromEquipment, useCompatibleEquipmentForItem, useAssignInventoryManagers, useBulkLinkEquipmentToItem } from '@/hooks/useInventory';
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
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { useOrganizationMembers } from '@/hooks/useOrganizationMembers';
import { logger } from '@/utils/logger';

const InventoryItemDetail = () => {
  const { itemId } = useParams<{ itemId: string }>();
  const navigate = useNavigate();
  const { currentOrganization } = useOrganization();
  const { user } = useAuth();
  const { canCreateEquipment } = usePermissions(); // Reuse equipment permissions
  const isMobile = useIsMobile();

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
  const [showManageManagers, setShowManageManagers] = useState(false);
  const [managerSearch, setManagerSearch] = useState('');
  const [selectedManagerIds, setSelectedManagerIds] = useState<string[]>([]);

  const { data: item, isLoading: itemLoading } = useInventoryItem(
    currentOrganization?.id,
    itemId
  );
  const { data: transactionsData } = useInventoryTransactions(
    currentOrganization?.id,
    itemId
  );
  const transactions = transactionsData?.transactions ?? [];
  
  const { data: managers = [], isLoading: managersLoading, isError: managersIsError } = useInventoryItemManagers(
    currentOrganization?.id,
    itemId
  );
  const { data: members = [] } = useOrganizationMembers(currentOrganization?.id ?? "");
  const { data: allEquipment = [] } = useEquipment(currentOrganization?.id);
  const { data: compatibleEquipment = [] } = useCompatibleEquipmentForItem(
    currentOrganization?.id,
    itemId
  );
  const deleteMutation = useDeleteInventoryItem();
  const adjustMutation = useAdjustInventoryQuantity();
  const updateMutation = useUpdateInventoryItem();
  const unlinkEquipmentMutation = useUnlinkItemFromEquipment();
  const bulkLinkEquipmentMutation = useBulkLinkEquipmentToItem();
  const assignManagersMutation = useAssignInventoryManagers();

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

  const canEdit = canCreateEquipment(); // Reuse equipment permission

  const activeMembers = members.filter((m) => m.status === 'active');
  const filteredMembers = activeMembers.filter((member) => {
    const needle = managerSearch.toLowerCase();
    return (
      (member.name ?? '').toLowerCase().includes(needle) ||
      (member.email ?? '').toLowerCase().includes(needle)
    );
  });

  const handleToggleManager = (userId: string, checked: boolean) => {
    setSelectedManagerIds((current) => {
      if (checked) return current.includes(userId) ? current : [...current, userId];
      return current.filter((id) => id !== userId);
    });
  };

  const handleRemoveManager = async (userId: string) => {
    if (!currentOrganization || !itemId) return;
    const currentManagerIds = managers.map((m) => m.userId).filter((id) => id !== userId);
    try {
      await assignManagersMutation.mutateAsync({
        organizationId: currentOrganization.id,
        itemId,
        userIds: currentManagerIds
      });
    } catch (error) {
      // Error toast is handled by the mutation hook; we just log for diagnostics.
      logger.error('Error removing inventory manager', error);
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
        {/* Mobile-first header: stack vertically on mobile, horizontal on desktop */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Title section - always on top */}
          <div className="flex items-center gap-4 min-w-0 flex-1">
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard/inventory')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight break-words">
                {item.name}
              </h1>
            </div>
          </div>
          
          {/* Action buttons - below title on mobile, to the right on desktop */}
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
        </div>

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
            <TabsTrigger value="managers" className={isMobile ? "w-full justify-start" : ""}>
              <Users className="h-4 w-4 mr-2" />
              Managers
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

            {item.image_url && (
              <Card>
                <CardHeader>
                  <CardTitle>Image</CardTitle>
                </CardHeader>
                <CardContent>
                  <img
                    src={item.image_url}
                    alt={item.name}
                    className="max-w-full h-auto rounded-md"
                  />
                </CardContent>
              </Card>
            )}

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
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle>Compatible Equipment</CardTitle>
                {canEdit && (
                  <Button
                    onClick={handleOpenAddEquipmentDialog}
                    size="sm"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Manage Equipment
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {compatibleEquipment.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground mb-4">
                      No compatible equipment linked
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
                        <div>
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
          </TabsContent>

          <TabsContent value="managers" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <CardTitle>Managers</CardTitle>
                  {canEdit && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedManagerIds(managers.map((m) => m.userId));
                        setManagerSearch('');
                        setShowManageManagers(true);
                      }}
                    >
                      <Users className="h-4 w-4 mr-2" />
                      Manage
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {managersLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : managersIsError ? (
                  <p className="text-muted-foreground text-center py-8">
                    Failed to load managers for this item.
                  </p>
                ) : managers.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No managers assigned</p>
                ) : (
                  <div className="space-y-2">
                    {managers.map((manager) => (
                      <div
                        key={manager.userId}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div>
                          <p className="font-medium">{manager.userName}</p>
                          <p className="text-sm text-muted-foreground">{manager.userEmail}</p>
                        </div>
                        {canEdit && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => void handleRemoveManager(manager.userId)}
                            disabled={assignManagersMutation.isPending}
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

            {/* Manage Managers Dialog */}
            <Dialog open={showManageManagers} onOpenChange={setShowManageManagers}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Manage Managers</DialogTitle>
                  <DialogDescription>
                    Choose which organization members are managers for this inventory item.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="Search members..."
                      value={managerSearch}
                      onChange={(e) => setManagerSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>

                  <div className="max-h-72 overflow-y-auto border rounded-md p-2 space-y-2">
                    {filteredMembers.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-6">
                        No members found
                      </p>
                    ) : (
                      filteredMembers.map((member) => {
                        const isSelected = selectedManagerIds.includes(member.id);
                        return (
                          <div
                            key={member.id}
                            className="flex items-center space-x-3 p-2 hover:bg-muted/50 rounded"
                          >
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={(checked) =>
                                handleToggleManager(member.id, checked as boolean)
                              }
                            />
                            <div className="flex-1 min-w-0">
                              <div className="font-medium">{member.name || 'Unknown'}</div>
                              <div className="text-sm text-muted-foreground">{member.email}</div>
                            </div>
                            {/* Selection is already indicated by the checkbox */}
                          </div>
                        );
                      })
                    )}
                  </div>

                  {selectedManagerIds.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {selectedManagerIds.map((id) => {
                        const member = activeMembers.find((m) => m.id === id);
                        return member ? (
                          <Badge key={id} variant="secondary" className="gap-1">
                            {member.name || member.email}
                            <button
                              type="button"
                              className="inline-flex items-center"
                              onClick={() => handleToggleManager(id, false)}
                              aria-label={`Remove ${member.name || member.email}`}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ) : null;
                      })}
                    </div>
                  )}

                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setShowManageManagers(false)}
                      disabled={assignManagersMutation.isPending}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={async () => {
                        if (!currentOrganization || !itemId) return;
                        try {
                          await assignManagersMutation.mutateAsync({
                            organizationId: currentOrganization.id,
                            itemId,
                            userIds: selectedManagerIds
                          });
                          setShowManageManagers(false);
                        } catch (error) {
                          // Error toast is handled by the mutation hook; keep dialog open.
                          logger.error('Error saving inventory managers', error);
                        }
                      }}
                      disabled={assignManagersMutation.isPending}
                    >
                      {assignManagersMutation.isPending ? 'Saving...' : 'Save'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
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
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
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
      </div>
    </Page>
  );
};

export default InventoryItemDetail;

