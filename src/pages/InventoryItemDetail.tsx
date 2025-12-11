import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Trash2, Package, History, Link2, Users, Plus, Minus } from 'lucide-react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useInventoryItem, useInventoryTransactions, useInventoryItemManagers, useDeleteInventoryItem, useAdjustInventoryQuantity } from '@/hooks/useInventory';
import { usePermissions } from '@/hooks/usePermissions';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import Page from '@/components/layout/Page';
import PageHeader from '@/components/layout/PageHeader';
import { InventoryItemForm } from '@/components/inventory/InventoryItemForm';
import { useAppToast } from '@/hooks/useAppToast';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import type { Equipment } from '@/services/EquipmentService';

const InventoryItemDetail = () => {
  const { itemId } = useParams<{ itemId: string }>();
  const navigate = useNavigate();
  const { currentOrganization } = useOrganization();
  const { user } = useAuth();
  const { toast } = useAppToast();
  const { canCreateEquipment } = usePermissions(); // Reuse equipment permissions

  const [activeTab, setActiveTab] = useState('overview');
  const [showEditForm, setShowEditForm] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showAdjustDialog, setShowAdjustDialog] = useState(false);
  const [adjustQuantity, setAdjustQuantity] = useState(0);
  const [adjustReason, setAdjustReason] = useState('');

  const { data: item, isLoading: itemLoading } = useInventoryItem(
    currentOrganization?.id,
    itemId
  );
  const { data: transactions = [] } = useInventoryTransactions(
    currentOrganization?.id,
    itemId
  );
  const { data: managers = [] } = useInventoryItemManagers(
    currentOrganization?.id,
    itemId
  );
  const deleteMutation = useDeleteInventoryItem();
  const adjustMutation = useAdjustInventoryQuantity();

  // Get compatible equipment
  const [compatibleEquipment, setCompatibleEquipment] = useState<Equipment[]>([]);
  
  React.useEffect(() => {
    if (!itemId || !currentOrganization?.id) return;
    
    const fetchCompatibleEquipment = async () => {
      try {
        const { data, error } = await supabase
          .from('equipment_part_compatibility')
          .select('equipment_id, equipment:equipment_id(*)')
          .eq('inventory_item_id', itemId);
        
        if (error) throw error;
        
        const equipment = (data || [])
          .map((row: { equipment: unknown }) => row.equipment)
          .filter(Boolean) as Equipment[];
        
        setCompatibleEquipment(equipment);
      } catch (error) {
        console.error('Error fetching compatible equipment:', error);
      }
    };
    
    fetchCompatibleEquipment();
  }, [itemId, currentOrganization?.id]);

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

  const handleAdjustQuantity = async () => {
    if (!currentOrganization || !itemId || !user || adjustQuantity === 0) return;
    try {
      await adjustMutation.mutateAsync({
        organizationId: currentOrganization.id,
        adjustment: {
          itemId,
          delta: adjustQuantity,
          reason: adjustReason || 'Manual adjustment'
        }
      });
      setShowAdjustDialog(false);
      setAdjustQuantity(0);
      setAdjustReason('');
    } catch {
      // Error handled in mutation
    }
  };

  const canEdit = canCreateEquipment(); // Reuse equipment permission

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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard/inventory')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <PageHeader
              title={item.name}
              description={item.description || 'Inventory item details'}
            />
          </div>
          {canEdit && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowAdjustDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Adjust Quantity
              </Button>
              <Button variant="outline" onClick={() => setShowEditForm(true)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <Button variant="destructive" onClick={() => setShowDeleteDialog(true)}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
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
            <TabsTrigger value="managers">
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
                    <Label className="text-muted-foreground">Name</Label>
                    <p className="font-medium">{item.name}</p>
                  </div>
                  {item.description && (
                    <div>
                      <Label className="text-muted-foreground">Description</Label>
                      <p>{item.description}</p>
                    </div>
                  )}
                  {item.sku && (
                    <div>
                      <Label className="text-muted-foreground">SKU</Label>
                      <p className="font-mono">{item.sku}</p>
                    </div>
                  )}
                  {item.external_id && (
                    <div>
                      <Label className="text-muted-foreground">External ID</Label>
                      <p className="font-mono">{item.external_id}</p>
                    </div>
                  )}
                  {item.location && (
                    <div>
                      <Label className="text-muted-foreground">Location</Label>
                      <p>{item.location}</p>
                    </div>
                  )}
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
              <CardHeader>
                <CardTitle>Compatible Equipment</CardTitle>
              </CardHeader>
              <CardContent>
                {compatibleEquipment.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No compatible equipment linked
                  </p>
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
                          <Button variant="ghost" size="sm">
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
                <CardTitle>Managers</CardTitle>
              </CardHeader>
              <CardContent>
                {managers.length === 0 ? (
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
                            onClick={async () => {
                              if (!currentOrganization || !itemId) return;
                              try {
                                const { assignInventoryManagers } = await import('@/services/inventoryService');
                                const currentManagerIds = managers.map(m => m.userId).filter(id => id !== manager.userId);
                                await assignInventoryManagers(currentOrganization.id, itemId, currentManagerIds);
                                managersQuery.refetch();
                                toast({
                                  title: 'Manager removed',
                                  description: `${manager.userName} is no longer a manager for this item.`
                                });
                              } catch (err) {
                                console.error('Error removing manager:', err);
                                toast({
                                  title: 'Error',
                                  description: 'Failed to remove manager',
                                  variant: 'destructive'
                                });
                              }
                            }}
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
        </Tabs>

        {/* Edit Form */}
        {showEditForm && (
          <InventoryItemForm
            open={showEditForm}
            onClose={() => setShowEditForm(false)}
            editingItem={item}
          />
        )}

        {/* Delete Dialog */}
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Inventory Item</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete "{item.name}"? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDelete}>
                Delete
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Adjust Quantity Dialog */}
        <Dialog open={showAdjustDialog} onOpenChange={setShowAdjustDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adjust Quantity</DialogTitle>
              <DialogDescription>
                Current quantity: {item.quantity_on_hand}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Change Amount</Label>
                <Input
                  type="number"
                  value={adjustQuantity}
                  onChange={(e) => setAdjustQuantity(parseInt(e.target.value) || 0)}
                  placeholder="e.g., +10 or -5"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Use positive numbers to add, negative to subtract
                </p>
              </div>
              <div>
                <Label>Reason</Label>
                <Textarea
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="Reason for adjustment..."
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowAdjustDialog(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleAdjustQuantity}
                  disabled={adjustQuantity === 0 || adjustMutation.isPending}
                >
                  {adjustMutation.isPending ? 'Adjusting...' : 'Adjust Quantity'}
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

