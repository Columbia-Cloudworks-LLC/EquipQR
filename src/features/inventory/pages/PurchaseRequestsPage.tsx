import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle2,
  Clock,
  PackageCheck,
  Plus,
  Search,
  ShoppingCart,
  Truck,
  XCircle,
} from 'lucide-react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { usePermissions } from '@/hooks/usePermissions';
import { useIsPartsManager } from '@/features/inventory/hooks/usePartsManagers';
import { useInventoryItems } from '@/features/inventory/hooks/useInventory';
import {
  useCancelPurchaseRequest,
  useInventoryPurchaseRequests,
  useMarkPurchaseRequestOrdered,
} from '@/features/inventory/hooks/usePurchaseRequests';
import { RequestRestockDialog } from '@/features/inventory/components/RequestRestockDialog';
import { ReceivePurchaseRequestDialog } from '@/features/inventory/components/ReceivePurchaseRequestDialog';
import Page from '@/components/layout/Page';
import PageHeader from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatDateTime, defaultUserSettings } from '@/utils/dateFormatter';
import type {
  InventoryPurchaseRequest,
  InventoryPurchaseRequestStatus,
} from '@/features/inventory/types/inventory';

type StatusTabValue = 'all' | InventoryPurchaseRequestStatus;

function renderStatusBadge(status: InventoryPurchaseRequestStatus) {
  switch (status) {
    case 'requested':
      return (
        <Badge variant="secondary" className="gap-1">
          <Clock className="h-3 w-3" />
          Requested
        </Badge>
      );
    case 'ordered':
      return (
        <Badge variant="outline" className="gap-1 border-primary/40 text-primary">
          <Truck className="h-3 w-3" />
          Ordered
        </Badge>
      );
    case 'received':
      return (
        <Badge variant="default" className="gap-1">
          <CheckCircle2 className="h-3 w-3" />
          Received
        </Badge>
      );
    case 'cancelled':
      return (
        <Badge variant="outline" className="gap-1 text-muted-foreground">
          <XCircle className="h-3 w-3" />
          Cancelled
        </Badge>
      );
  }
}

const PurchaseRequestsPage: React.FC = () => {
  const { currentOrganization } = useOrganization();
  const { canManageInventory } = usePermissions();
  const { data: isPartsManager = false } = useIsPartsManager(currentOrganization?.id);
  const canManage = canManageInventory(isPartsManager);

  const [statusFilter, setStatusFilter] = useState<StatusTabValue>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [receivingRequest, setReceivingRequest] = useState<InventoryPurchaseRequest | null>(null);

  const { data: requests = [], isLoading } = useInventoryPurchaseRequests(
    currentOrganization?.id,
  );
  const { data: inventoryItems = [] } = useInventoryItems(currentOrganization?.id);

  const markOrderedMutation = useMarkPurchaseRequestOrdered();
  const cancelMutation = useCancelPurchaseRequest();

  const statusCounts = useMemo(() => {
    const counts: Record<StatusTabValue, number> = {
      all: requests.length,
      requested: 0,
      ordered: 0,
      received: 0,
      cancelled: 0,
    };
    for (const req of requests) {
      counts[req.status] = (counts[req.status] ?? 0) + 1;
    }
    return counts;
  }, [requests]);

  const filteredRequests = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    return requests.filter((req) => {
      if (statusFilter !== 'all' && req.status !== statusFilter) {
        return false;
      }
      if (!normalizedQuery) return true;
      const haystacks = [
        req.inventoryItemName ?? '',
        req.inventoryItemSku ?? '',
        req.vendor_name ?? '',
        req.invoice_number ?? '',
        req.notes ?? '',
      ];
      return haystacks.some((value) => value.toLowerCase().includes(normalizedQuery));
    });
  }, [requests, statusFilter, searchQuery]);

  if (!currentOrganization) {
    return (
      <Page maxWidth="7xl" padding="responsive">
        <PageHeader
          title="Purchase Requests"
          description="Please select an organization to view purchase requests."
        />
      </Page>
    );
  }

  return (
    <Page maxWidth="7xl" padding="responsive">
      <div className="space-y-4 md:space-y-6">
        <PageHeader
          title="Purchase Requests"
          description={`Track inventory restock requests and receiving for ${currentOrganization.name}`}
          breadcrumbs={[
            { label: 'Inventory', href: '/dashboard/inventory' },
            { label: 'Purchase Requests' },
          ]}
          actions={
            canManage ? (
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Request Restock
              </Button>
            ) : undefined
          }
        />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Tabs
            value={statusFilter}
            onValueChange={(value) => setStatusFilter(value as StatusTabValue)}
          >
            <TabsList className="flex-wrap h-auto">
              <TabsTrigger value="all">All ({statusCounts.all})</TabsTrigger>
              <TabsTrigger value="requested">
                Requested ({statusCounts.requested})
              </TabsTrigger>
              <TabsTrigger value="ordered">Ordered ({statusCounts.ordered})</TabsTrigger>
              <TabsTrigger value="received">Received ({statusCounts.received})</TabsTrigger>
              <TabsTrigger value="cancelled">
                Cancelled ({statusCounts.cancelled})
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search part, SKU, vendor, invoice..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              aria-label="Search purchase requests"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((idx) => (
              <Card key={idx} className="animate-pulse">
                <CardContent className="p-4">
                  <div className="h-4 w-1/3 rounded bg-muted" />
                  <div className="mt-2 h-3 w-1/2 rounded bg-muted" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredRequests.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <ShoppingCart className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
              <h3 className="text-base font-semibold">No purchase requests found</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {requests.length === 0
                  ? 'Create a purchase request when parts run low to track ordering and restock.'
                  : 'No purchase requests match the selected filter.'}
              </p>
              {canManage && requests.length === 0 && (
                <Button className="mt-4" onClick={() => setShowCreateDialog(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Request Restock
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredRequests.map((request) => (
              <Card key={request.id} data-testid={`purchase-request-card-${request.id}`}>
                <CardContent className="p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          to={`/dashboard/inventory/${request.inventory_item_id}`}
                          className="font-semibold text-foreground hover:underline"
                        >
                          {request.inventoryItemName ?? 'Inventory Item'}
                        </Link>
                        {request.inventoryItemSku && (
                          <span className="text-xs text-muted-foreground">
                            SKU: {request.inventoryItemSku}
                          </span>
                        )}
                        {renderStatusBadge(request.status)}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span>
                          Requested Qty:{' '}
                          <strong className="text-foreground">
                            {request.requested_quantity}
                          </strong>
                        </span>
                        {request.received_quantity !== null && (
                          <span>
                            Received Qty:{' '}
                            <strong className="text-foreground">
                              {request.received_quantity}
                            </strong>
                          </span>
                        )}
                        {request.vendor_name && <span>Vendor: {request.vendor_name}</span>}
                        {request.invoice_number && (
                          <span>Invoice: #{request.invoice_number}</span>
                        )}
                        {request.received_unit_cost !== null && (
                          <span>
                            Unit Cost: ${Number(request.received_unit_cost).toFixed(2)}
                          </span>
                        )}
                        <span>
                          Created: {formatDateTime(request.created_at, defaultUserSettings)}
                        </span>
                      </div>

                      {request.notes && (
                        <p className="text-xs text-muted-foreground">{request.notes}</p>
                      )}
                    </div>

                    {canManage &&
                      (request.status === 'requested' || request.status === 'ordered') && (
                        <div className="flex flex-wrap items-center gap-2">
                          {request.status === 'requested' && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={markOrderedMutation.isPending}
                              onClick={() =>
                                markOrderedMutation.mutate({
                                  organizationId: currentOrganization.id,
                                  requestId: request.id,
                                })
                              }
                            >
                              <Truck className="mr-1.5 h-3.5 w-3.5" />
                              Mark Ordered
                            </Button>
                          )}

                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => setReceivingRequest(request)}
                          >
                            <PackageCheck className="mr-1.5 h-3.5 w-3.5" />
                            Receive
                          </Button>

                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={cancelMutation.isPending}
                            onClick={() =>
                              cancelMutation.mutate({
                                organizationId: currentOrganization.id,
                                requestId: request.id,
                              })
                            }
                          >
                            Cancel
                          </Button>
                        </div>
                      )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <RequestRestockDialog
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
          organizationId={currentOrganization.id}
          availableItems={inventoryItems}
        />

        <ReceivePurchaseRequestDialog
          open={!!receivingRequest}
          onOpenChange={(open) => {
            if (!open) setReceivingRequest(null);
          }}
          organizationId={currentOrganization.id}
          request={receivingRequest}
        />
      </div>
    </Page>
  );
};

export default PurchaseRequestsPage;
