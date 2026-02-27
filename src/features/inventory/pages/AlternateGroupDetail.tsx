import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Package,
  Tag,
  CheckCircle2,
  Star,
  Search,
  ExternalLink,
  Pencil,
} from 'lucide-react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { usePermissions } from '@/hooks/usePermissions';
import { useInventoryItems } from '@/features/inventory/hooks/useInventory';
import {
  useAlternateGroup,
  useAddInventoryItemToGroup,
  useAddPartIdentifierToGroup,
  useRemoveGroupMember,
} from '@/features/inventory/hooks/useAlternateGroups';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import Page from '@/components/layout/Page';
import PageHeader from '@/components/layout/PageHeader';
import { AlternateGroupForm } from '@/features/inventory/components/AlternateGroupForm';
import type { PartIdentifierType } from '@/features/inventory/types/inventory';
import type { AlternateGroupMember } from '@/features/inventory/services/partAlternatesService';

const IDENTIFIER_TYPES: { value: PartIdentifierType; label: string }[] = [
  { value: 'oem', label: 'OEM Part Number' },
  { value: 'aftermarket', label: 'Aftermarket Part Number' },
  { value: 'mpn', label: 'Manufacturer Part Number' },
  { value: 'upc', label: 'UPC Code' },
  { value: 'cross_ref', label: 'Cross-Reference Number' },
  { value: 'sku', label: 'Internal SKU' },
];

const AlternateGroupDetail: React.FC = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const { currentOrganization } = useOrganization();
  const { canCreateEquipment } = usePermissions();
  const canEdit = canCreateEquipment();

  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showAddItemDialog, setShowAddItemDialog] = useState(false);
  const [showAddIdentifierDialog, setShowAddIdentifierDialog] = useState(false);
  const [removingMember, setRemovingMember] = useState<AlternateGroupMember | null>(null);
  
  // Add item dialog state
  const [itemSearch, setItemSearch] = useState('');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isPrimaryItem, setIsPrimaryItem] = useState(false);
  
  // Add identifier dialog state
  const [identifierType, setIdentifierType] = useState<PartIdentifierType>('oem');
  const [identifierValue, setIdentifierValue] = useState('');
  const [identifierManufacturer, setIdentifierManufacturer] = useState('');

  const { data: group, isLoading } = useAlternateGroup(
    currentOrganization?.id,
    groupId
  );
  
  const { data: inventoryItems = [] } = useInventoryItems(currentOrganization?.id);
  
  const addItemMutation = useAddInventoryItemToGroup();
  const addIdentifierMutation = useAddPartIdentifierToGroup();
  const removeMemberMutation = useRemoveGroupMember();

  // Filter out items already in the group
  const availableItems = useMemo(() => {
    if (!group) return inventoryItems;
    const memberItemIds = new Set(
      group.members.filter(m => m.inventory_item_id).map(m => m.inventory_item_id)
    );
    return inventoryItems.filter(item => !memberItemIds.has(item.id));
  }, [inventoryItems, group]);

  // Filter by search
  const filteredItems = useMemo(() => {
    if (!itemSearch.trim()) return availableItems.slice(0, 20);
    const needle = itemSearch.toLowerCase();
    return availableItems
      .filter(
        (item) =>
          item.name.toLowerCase().includes(needle) ||
          item.sku?.toLowerCase().includes(needle)
      )
      .slice(0, 20);
  }, [availableItems, itemSearch]);

  const handleAddItem = async () => {
    if (!currentOrganization || !groupId || !selectedItemId) return;
    try {
      await addItemMutation.mutateAsync({
        organizationId: currentOrganization.id,
        groupId,
        inventoryItemId: selectedItemId,
        isPrimary: isPrimaryItem,
      });
      setShowAddItemDialog(false);
      setSelectedItemId(null);
      setIsPrimaryItem(false);
      setItemSearch('');
    } catch {
      // Error handled by mutation
    }
  };

  const handleAddIdentifier = async () => {
    if (!currentOrganization || !groupId || !identifierValue.trim()) return;
    try {
      await addIdentifierMutation.mutateAsync({
        organizationId: currentOrganization.id,
        groupId,
        identifierType,
        rawValue: identifierValue.trim(),
        manufacturer: identifierManufacturer.trim() || undefined,
      });
      setShowAddIdentifierDialog(false);
      setIdentifierType('oem');
      setIdentifierValue('');
      setIdentifierManufacturer('');
    } catch {
      // Error handled by mutation
    }
  };

  const handleRemoveMember = async () => {
    if (!currentOrganization || !groupId || !removingMember) return;
    try {
      await removeMemberMutation.mutateAsync({
        organizationId: currentOrganization.id,
        groupId,
        memberId: removingMember.id,
      });
      setRemovingMember(null);
    } catch {
      // Error handled by mutation
    }
  };

  if (!currentOrganization) {
    return (
      <Page maxWidth="7xl" padding="responsive">
        <PageHeader title="Alternate Group" description="Please select an organization." />
      </Page>
    );
  }

  if (isLoading) {
    return (
      <Page maxWidth="7xl" padding="responsive">
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10" />
            <Skeleton className="h-8 w-64" />
          </div>
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </Page>
    );
  }

  if (!group) {
    return (
      <Page maxWidth="7xl" padding="responsive">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">
              Alternate group not found or you don't have access.
            </p>
            <Button onClick={() => navigate('/dashboard/alternate-groups')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Groups
            </Button>
          </CardContent>
        </Card>
      </Page>
    );
  }

  const inventoryMembers = group.members.filter(m => m.inventory_item_id);
  const identifierMembers = group.members.filter(m => m.part_identifier_id && !m.inventory_item_id);

  return (
    <Page maxWidth="7xl" padding="responsive">
      <div className="space-y-6">
        {/* Header */}
        <PageHeader
          title={group.name}
          description={group.description || undefined}
          breadcrumbs={[
            { label: 'Alternate Groups', href: '/dashboard/alternate-groups' },
            { label: group.name },
          ]}
          meta={
            <>
              {group.status === 'verified' && (
                <Badge className="bg-green-600">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Verified
                </Badge>
              )}
              {group.status === 'deprecated' && (
                <Badge variant="secondary">Deprecated</Badge>
              )}
            </>
          }
          actions={
            canEdit ? (
              <Button variant="outline" onClick={() => setShowEditDialog(true)}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit Group
              </Button>
            ) : undefined
          }
        />

        {/* Notes/Evidence */}
        {(group.notes || group.evidence_url) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Verification Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {group.notes && <p className="text-sm">{group.notes}</p>}
              {group.evidence_url && (
                <a
                  href={group.evidence_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline flex items-center gap-1"
                  aria-label="View evidence (opens in new tab)"
                >
                  View Evidence
                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                </a>
              )}
            </CardContent>
          </Card>
        )}

        {/* Inventory Items Section */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Inventory Items
                <Badge variant="secondary">{inventoryMembers.length}</Badge>
              </CardTitle>
              <CardDescription>
                Inventory items that belong to this alternate group
              </CardDescription>
            </div>
            {canEdit && (
              <Button size="sm" onClick={() => setShowAddItemDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {inventoryMembers.length === 0 ? (
              <div className="text-center py-8">
                <Package className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground mb-4">
                  No inventory items in this group yet
                </p>
                {canEdit && (
                  <Button variant="outline" onClick={() => setShowAddItemDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Item
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {inventoryMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {member.is_primary && (
                        <Star className="h-4 w-4 text-yellow-500 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p
                          className="font-medium cursor-pointer hover:text-primary truncate"
                          onClick={() =>
                            navigate(`/dashboard/inventory/${member.inventory_item_id}`)
                          }
                        >
                          {member.inventory_name || 'Unknown Item'}
                        </p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          {member.inventory_sku && <span>SKU: {member.inventory_sku}</span>}
                          <span>Qty: {member.quantity_on_hand}</span>
                        </div>
                      </div>
                    </div>
                    {canEdit && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setRemovingMember(member)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Part Identifiers Section */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Tag className="h-5 w-5" />
                Part Numbers
                <Badge variant="secondary">{identifierMembers.length}</Badge>
              </CardTitle>
              <CardDescription>
                OEM, aftermarket, and cross-reference part numbers
              </CardDescription>
            </div>
            {canEdit && (
              <Button size="sm" onClick={() => setShowAddIdentifierDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Part Number
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {identifierMembers.length === 0 ? (
              <div className="text-center py-8">
                <Tag className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground mb-4">
                  No part numbers in this group yet
                </p>
                {canEdit && (
                  <Button variant="outline" onClick={() => setShowAddIdentifierDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Part Number
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {identifierMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="min-w-0">
                        <p className="font-mono font-medium">
                          {member.identifier_value}
                        </p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          {member.identifier_manufacturer && (
                            <span>{member.identifier_manufacturer}</span>
                          )}
                          <Badge variant="outline" className="text-xs uppercase">
                            {member.identifier_type}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    {canEdit && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setRemovingMember(member)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Group Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Alternate Group</DialogTitle>
            <DialogDescription>
              Update the group details.
            </DialogDescription>
          </DialogHeader>
          <AlternateGroupForm
            group={group}
            onSuccess={() => setShowEditDialog(false)}
            onCancel={() => setShowEditDialog(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Add Inventory Item Dialog */}
      <Dialog open={showAddItemDialog} onOpenChange={setShowAddItemDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Inventory Item</DialogTitle>
            <DialogDescription>
              Select an inventory item to add to this alternate group.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search inventory items..."
                value={itemSearch}
                onChange={(e) => setItemSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <div className="max-h-60 overflow-y-auto border rounded-md p-2 space-y-1">
              {filteredItems.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {availableItems.length === 0
                    ? 'All inventory items are already in this group'
                    : 'No items found matching your search'}
                </p>
              ) : (
                filteredItems.map((item) => (
                  <div
                    key={item.id}
                    className={`p-2 rounded cursor-pointer hover:bg-muted/50 ${
                      selectedItemId === item.id ? 'bg-primary/10 border border-primary' : ''
                    }`}
                    onClick={() => setSelectedItemId(item.id)}
                  >
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.sku && `SKU: ${item.sku} • `}
                      Qty: {item.quantity_on_hand}
                    </p>
                  </div>
                ))
              )}
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="is-primary"
                checked={isPrimaryItem}
                onCheckedChange={(checked) => setIsPrimaryItem(checked as boolean)}
              />
              <Label htmlFor="is-primary" className="text-sm">
                Mark as primary part in this group
              </Label>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddItemDialog(false);
                  setSelectedItemId(null);
                  setIsPrimaryItem(false);
                  setItemSearch('');
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddItem}
                disabled={!selectedItemId || addItemMutation.isPending}
              >
                {addItemMutation.isPending ? 'Adding...' : 'Add Item'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Part Identifier Dialog */}
      <Dialog open={showAddIdentifierDialog} onOpenChange={setShowAddIdentifierDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Part Number</DialogTitle>
            <DialogDescription>
              Add an OEM, aftermarket, or cross-reference part number to this group.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="identifier-type">Type</Label>
              <Select
                value={identifierType}
                onValueChange={(value) => setIdentifierType(value as PartIdentifierType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {IDENTIFIER_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="identifier-value">
                Part Number <span className="text-destructive">*</span>
              </Label>
              <Input
                id="identifier-value"
                placeholder="e.g., CAT-1R-0750, WIX 51773"
                value={identifierValue}
                onChange={(e) => setIdentifierValue(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="identifier-manufacturer">Manufacturer</Label>
              <Input
                id="identifier-manufacturer"
                placeholder="e.g., Caterpillar, WIX, Baldwin"
                value={identifierManufacturer}
                onChange={(e) => setIdentifierManufacturer(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Optional. The brand or manufacturer of this part number.
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddIdentifierDialog(false);
                  setIdentifierType('oem');
                  setIdentifierValue('');
                  setIdentifierManufacturer('');
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddIdentifier}
                disabled={!identifierValue.trim() || addIdentifierMutation.isPending}
              >
                {addIdentifierMutation.isPending ? 'Adding...' : 'Add Part Number'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Remove Member Confirmation */}
      <AlertDialog open={!!removingMember} onOpenChange={() => setRemovingMember(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove from Group?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove "
              {removingMember?.inventory_name || removingMember?.identifier_value || 'this item'}
              " from the alternate group?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveMember}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Page>
  );
};

export default AlternateGroupDetail;
