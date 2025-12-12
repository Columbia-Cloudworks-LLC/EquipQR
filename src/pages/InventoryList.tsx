import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Package, AlertTriangle } from 'lucide-react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useInventoryItems } from '@/hooks/useInventory';
import { usePermissions } from '@/hooks/usePermissions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import Page from '@/components/layout/Page';
import PageHeader from '@/components/layout/PageHeader';
import { InventoryItemForm } from '@/components/inventory/InventoryItemForm';
import type { InventoryItem, InventoryFilters } from '@/types/inventory';
import { useIsMobile } from '@/hooks/use-mobile';

const InventoryList = () => {
  const navigate = useNavigate();
  const { currentOrganization } = useOrganization();
  const { canCreateEquipment } = usePermissions(); // Reuse equipment permissions for now
  const isMobile = useIsMobile();
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [filters, setFilters] = useState<InventoryFilters>({
    search: '',
    lowStockOnly: false
  });

  const { data: items = [], isLoading } = useInventoryItems(
    currentOrganization?.id,
    filters
  );

  const handleAddItem = () => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/a65f405d-0706-4f0e-be3a-35b48c38930e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'InventoryList.tsx:35',message:'handleAddItem called',data:{showFormBefore:showForm},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    setEditingItem(null);
    setShowForm(true);
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/a65f405d-0706-4f0e-be3a-35b48c38930e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'InventoryList.tsx:38',message:'After setShowForm(true)',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
  };


  const handleViewItem = (itemId: string) => {
    navigate(`/dashboard/inventory/${itemId}`);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingItem(null);
  };

  const canCreate = canCreateEquipment(); // Reuse equipment permission

  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/a65f405d-0706-4f0e-be3a-35b48c38930e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'InventoryList.tsx:50',message:'Permission check result',data:{canCreate,currentOrganizationId:currentOrganization?.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion

  if (!currentOrganization) {
    return (
      <Page maxWidth="7xl" padding="responsive">
        <PageHeader
          title="Inventory"
          description="Please select an organization to view inventory."
        />
      </Page>
    );
  }

  if (isLoading) {
    return (
      <Page maxWidth="7xl" padding="responsive">
        <PageHeader title="Inventory" />
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </Page>
    );
  }

  return (
    <Page maxWidth="7xl" padding="responsive">
      <div className="space-y-4 md:space-y-6">
        <PageHeader
          title="Inventory"
          description={`Manage inventory items for ${currentOrganization.name}`}
          actions={
            canCreate && (
              <Button onClick={handleAddItem} 
                // #region agent log
                onMouseDown={()=>fetch('http://127.0.0.1:7242/ingest/a65f405d-0706-4f0e-be3a-35b48c38930e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'InventoryList.tsx:89',message:'Button mousedown event',data:{canCreate},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{})}
                // #endregion
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            )
          }
        />

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search by name, SKU, or external ID..."
                  value={filters.search || ''}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="pl-9"
                />
              </div>
              <Button
                variant={filters.lowStockOnly ? 'default' : 'outline'}
                onClick={() => setFilters({ ...filters, lowStockOnly: !filters.lowStockOnly })}
              >
                <AlertTriangle className="h-4 w-4 mr-2" />
                Low Stock Only
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Inventory List */}
        {items.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No inventory items</h3>
              <p className="text-muted-foreground mb-4">
                {filters.search || filters.lowStockOnly
                  ? 'No items match your filters.'
                  : 'Get started by adding your first inventory item.'}
              </p>
              {canCreate && (
                <Button onClick={handleAddItem}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              )}
            </CardContent>
          </Card>
        ) : isMobile ? (
          // Mobile card view
          <div className="space-y-3">
            {items.map((item) => (
              <Card
                key={item.id}
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => handleViewItem(item.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="font-semibold">{item.name}</h3>
                      {item.sku && (
                        <p className="text-sm text-muted-foreground">SKU: {item.sku}</p>
                      )}
                      {item.external_id && (
                        <p className="text-sm text-muted-foreground">External ID: {item.external_id}</p>
                      )}
                    </div>
                    {item.isLowStock && (
                      <Badge variant="destructive" className="ml-2">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Low Stock
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div>
                      <span className="text-muted-foreground">Quantity: </span>
                      <span className="font-medium">{item.quantity_on_hand}</span>
                    </div>
                    {item.location && (
                      <div className="text-muted-foreground">
                        📍 {item.location}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          // Desktop table view
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>External ID</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow
                      key={item.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleViewItem(item.id)}
                    >
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {item.sku || '-'}
                      </TableCell>
                      <TableCell className="text-muted-foreground font-mono text-sm">
                        {item.external_id || '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className={item.isLowStock ? 'font-semibold text-destructive' : ''}>
                            {item.quantity_on_hand}
                          </span>
                          {item.isLowStock && (
                            <Badge variant="destructive" className="text-xs">
                              Low
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {item.location || '-'}
                      </TableCell>
                      <TableCell>
                        {item.isLowStock ? (
                          <Badge variant="destructive">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Low Stock
                          </Badge>
                        ) : (
                          <Badge variant="outline">In Stock</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Form Dialog */}
        {/* #region agent log */}
        {(()=>{fetch('http://127.0.0.1:7242/ingest/a65f405d-0706-4f0e-be3a-35b48c38930e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'InventoryList.tsx:245',message:'Checking showForm condition',data:{showForm,willRender:!!showForm},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});return null;})()}
        {/* #endregion */}
        {showForm && (
          <InventoryItemForm
            open={showForm}
            onClose={handleCloseForm}
            editingItem={editingItem}
          />
        )}
      </div>
    </Page>
  );
};

export default InventoryList;

