import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Pencil,
} from 'lucide-react';
import { useInventoryPartsManagerAccess } from '@/features/inventory/hooks/useInventoryPartsManagerAccess';
import { useInventoryItems } from '@/features/inventory/hooks/useInventory';
import { useAlternateGroup } from '@/features/inventory/hooks/useAlternateGroups';
import { useAlternateGroupDetailDialogs } from '@/features/inventory/hooks/useAlternateGroupDetailDialogs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import Page from '@/components/layout/Page';
import PageHeader from '@/components/layout/PageHeader';
import { AlternateGroupForm } from '@/features/inventory/components/AlternateGroupForm';
import { AlternateGroupMembersSection } from '@/features/inventory/components/AlternateGroupMembersSection';
import { AlternateGroupAddItemDialog } from '@/features/inventory/components/AlternateGroupAddItemDialog';
import { AlternateGroupAddIdentifierDialog } from '@/features/inventory/components/AlternateGroupAddIdentifierDialog';
import { AlternateGroupRemoveMemberDialog } from '@/features/inventory/components/AlternateGroupRemoveMemberDialog';
import { useIsMobile } from '@/hooks/use-mobile';

const AlternateGroupDetail: React.FC = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { currentOrganization, canEdit } = useInventoryPartsManagerAccess();

  const { data: group, isLoading } = useAlternateGroup(
    currentOrganization?.id,
    groupId,
  );

  const { data: inventoryItems = [] } = useInventoryItems(currentOrganization?.id);

  const dialogs = useAlternateGroupDetailDialogs({
    organizationId: currentOrganization?.id,
    groupId,
    group,
    inventoryItems,
  });

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

  const inventoryMembers = group.members.filter((m) => m.inventory_item_id);
  const identifierMembers = group.members.filter(
    (m) => m.part_identifier_id && !m.inventory_item_id,
  );

  return (
    <Page maxWidth="7xl" padding="responsive">
      <div className="space-y-6">
        <PageHeader
          density="compact"
          title={group.name}
          description={group.description || undefined}
          breadcrumbs={[
            { label: 'Alternate Groups', href: '/dashboard/alternate-groups' },
          ]}
          meta={
            <>
              {group.status === 'verified' && (
                <Badge className="bg-success">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Verified
                </Badge>
              )}
              {group.status === 'deprecated' && (
                <Badge variant="outline" className="border-warning text-warning bg-warning/10">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Deprecated
                </Badge>
              )}
              {group.status === 'unverified' && (
                <Badge variant="outline" className="text-muted-foreground">
                  Unverified
                </Badge>
              )}
            </>
          }
          actions={
            canEdit ? (
              <Button variant="outline" onClick={() => dialogs.setShowEditDialog(true)}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit Group
              </Button>
            ) : undefined
          }
        />

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

        <AlternateGroupMembersSection
          inventoryMembers={inventoryMembers}
          identifierMembers={identifierMembers}
          canEdit={canEdit}
          isMobile={isMobile}
          onAddItem={() => dialogs.setShowAddItemDialog(true)}
          onAddIdentifier={() => dialogs.setShowAddIdentifierDialog(true)}
          onRemoveMember={dialogs.setRemovingMember}
        />
      </div>

      {isMobile ? (
        <Drawer open={dialogs.showEditDialog} onOpenChange={dialogs.setShowEditDialog}>
          <DrawerContent className="max-h-[85dvh]">
            <DrawerHeader>
              <DrawerTitle>Edit Alternate Group</DrawerTitle>
              <DrawerDescription>Update the group details.</DrawerDescription>
            </DrawerHeader>
            <div className="px-4 pb-4 overflow-y-auto">
              <AlternateGroupForm
                group={group}
                onSuccess={() => dialogs.setShowEditDialog(false)}
                onCancel={() => dialogs.setShowEditDialog(false)}
              />
            </div>
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={dialogs.showEditDialog} onOpenChange={dialogs.setShowEditDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit Alternate Group</DialogTitle>
              <DialogDescription>Update the group details.</DialogDescription>
            </DialogHeader>
            <AlternateGroupForm
              group={group}
              onSuccess={() => dialogs.setShowEditDialog(false)}
              onCancel={() => dialogs.setShowEditDialog(false)}
            />
          </DialogContent>
        </Dialog>
      )}

      <AlternateGroupAddItemDialog
        isMobile={isMobile}
        open={dialogs.showAddItemDialog}
        onOpenChange={(open) => (open ? dialogs.setShowAddItemDialog(true) : dialogs.closeAddItemDialog())}
        itemSearch={dialogs.itemSearch}
        onItemSearchChange={dialogs.setItemSearch}
        filteredItems={dialogs.filteredItems}
        availableItemsCount={dialogs.availableItems.length}
        selectedItemId={dialogs.selectedItemId}
        onSelectItem={dialogs.setSelectedItemId}
        isPrimaryItem={dialogs.isPrimaryItem}
        onPrimaryItemChange={dialogs.setIsPrimaryItem}
        onCancel={dialogs.closeAddItemDialog}
        onSubmit={dialogs.handleAddItem}
        isPending={dialogs.addItemMutation.isPending}
      />

      <AlternateGroupAddIdentifierDialog
        isMobile={isMobile}
        open={dialogs.showAddIdentifierDialog}
        onOpenChange={(open) =>
          open ? dialogs.setShowAddIdentifierDialog(true) : dialogs.closeAddIdentifierDialog()
        }
        identifierType={dialogs.identifierType}
        onIdentifierTypeChange={dialogs.setIdentifierType}
        identifierValue={dialogs.identifierValue}
        onIdentifierValueChange={dialogs.setIdentifierValue}
        identifierManufacturer={dialogs.identifierManufacturer}
        onIdentifierManufacturerChange={dialogs.setIdentifierManufacturer}
        onCancel={dialogs.closeAddIdentifierDialog}
        onSubmit={dialogs.handleAddIdentifier}
        isPending={dialogs.addIdentifierMutation.isPending}
      />

      <AlternateGroupRemoveMemberDialog
        member={dialogs.removingMember}
        onOpenChange={() => dialogs.setRemovingMember(null)}
        onConfirm={dialogs.handleRemoveMember}
      />
    </Page>
  );
};

export default AlternateGroupDetail;
