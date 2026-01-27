import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Package, AlertTriangle, Users, MoreVertical, Filter, X, MapPin } from 'lucide-react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useInventoryItems } from '@/features/inventory/hooks/useInventory';
import { useIsPartsManager } from '@/features/inventory/hooks/usePartsManagers';
import { usePermissions } from '@/hooks/usePermissions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import Page from '@/components/layout/Page';
import PageHeader from '@/components/layout/PageHeader';
import { InventoryItemForm } from '@/features/inventory/components/InventoryItemForm';
import { PartsManagersSheet } from '@/features/inventory/components/PartsManagersSheet';
import type { InventoryItem, InventoryFilters } from '@/features/inventory/types/inventory';
import { useIsMobile } from '@/hooks/use-mobile';

const InventoryList = () => {
  const navigate = useNavigate();
  const { currentOrganization } = useOrganization();
  const { data: isPartsManager = false } = useIsPartsManager(currentOrganization?.id);
  const { canManageInventory, canManagePartsManagers } = usePermissions();
  const isMobile = useIsMobile();
  const [showForm, setShowForm] = useState(false);
  const [showManagersSheet, setShowManagersSheet] = useState(false);
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
    setEditingItem(null);
    setShowForm(true);
  };


  const handleViewItem = (itemId: string) => {
    navigate(`/dashboard/inventory/${itemId}`);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingItem(null);
  };

  const canCreate = canManageInventory(isPartsManager);
  const canManage = canManagePartsManagers();

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
            <div className="flex items-center gap-2">
              {/* Desktop: Show Parts Managers button inline */}
              {canManage && (
                <Button 
                  variant="outline" 
                  onClick={() => setShowManagersSheet(true)}
                  className="hidden sm:inline-flex"
                >
                  <Users className="h-4 w-4 mr-2" />
                  Parts Managers
                </Button>
              )}
              
              {/* Primary action - always visible */}
              {canCreate && (
                <Button onClick={handleAddItem}>
                  <Plus className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Add Item</span>
                  <span className="sm:hidden">Add</span>
                </Button>
              )}
              
              {/* Mobile: Overflow menu for secondary actions */}
              {canManage && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      className="sm:hidden h-10 w-10"
                      aria-label="More options"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setShowManagersSheet(true)}>
                      <Users className="h-4 w-4 mr-2" />
                      Parts Managers
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          }
        />

        {/* Filters */}
        <div className="space-y-3">
          {/* Search + Filter Controls */}
          <Card>
            <CardContent className="pt-6">
              {isMobile ? (
                // Mobile: Search bar + Filter icon button
                <div className="flex items-center gap-2">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="Search by name, SKU, or external ID..."
                      value={filters.search || ''}
                      onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                      className="pl-9 h-10"
                    />
                  </div>
                  <Sheet>
                    <SheetTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        className="relative h-10 w-10 flex-shrink-0"
                        aria-label="Open filters"
                      >
                        <Filter className="h-4 w-4" />
                        {filters.lowStockOnly && (
                          <Badge
                            variant="secondary"
                            className="absolute -right-1 -top-1 h-5 min-w-5 px-1 text-[10px]"
                          >
                            1
                          </Badge>
                        )}
                      </Button>
                    </SheetTrigger>
                    <SheetContent side="bottom" className="h-auto max-h-[50vh]">
                      <SheetHeader className="pb-4">
                        <SheetTitle>Filter Inventory</SheetTitle>
                        <SheetDescription>
                          Use the options below to filter inventory items.
                        </SheetDescription>
                      </SheetHeader>
                      <div className="space-y-4 pb-6">
                        <div className="flex items-center justify-between py-3 border-b">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-destructive" />
                            <Label htmlFor="low-stock-mobile" className="text-base font-medium">
                              Low Stock Only
                            </Label>
                          </div>
                          <Switch
                            id="low-stock-mobile"
                            checked={filters.lowStockOnly}
                            onCheckedChange={(checked) => 
                              setFilters({ ...filters, lowStockOnly: checked })
                            }
                          />
                        </div>
                        <Button
                          variant="outline"
                          onClick={() => setFilters({ search: '', lowStockOnly: false })}
                          className="w-full h-12"
                          disabled={!filters.search && !filters.lowStockOnly}
                        >
                          Clear All Filters
                        </Button>
                      </div>
                    </SheetContent>
                  </Sheet>
                </div>
              ) : (
                // Desktop: Search bar + inline Switch
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
                  <div className="flex items-center gap-3 px-3 py-2 rounded-md border bg-muted/30">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                      <Label htmlFor="low-stock-desktop" className="text-sm font-medium whitespace-nowrap cursor-pointer">
                        Low Stock Only
                      </Label>
                    </div>
                    <Switch
                      id="low-stock-desktop"
                      checked={filters.lowStockOnly}
                      onCheckedChange={(checked) => 
                        setFilters({ ...filters, lowStockOnly: checked })
                      }
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Active Filter Summary */}
          {(filters.search || filters.lowStockOnly) && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground">Active filters:</span>
              {filters.search && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Search: "{filters.search.length > 15 ? `${filters.search.slice(0, 15)}...` : filters.search}"
                  <X
                    className="h-3 w-3 cursor-pointer hover:text-foreground"
                    onClick={() => setFilters({ ...filters, search: '' })}
                    aria-label="Clear search filter"
                  />
                </Badge>
              )}
              {filters.lowStockOnly && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Low Stock
                  <X
                    className="h-3 w-3 cursor-pointer hover:text-foreground"
                    onClick={() => setFilters({ ...filters, lowStockOnly: false })}
                    aria-label="Clear low stock filter"
                  />
                </Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => setFilters({ search: '', lowStockOnly: false })}
              >
                Clear all
              </Button>
            </div>
          )}
        </div>

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
                  {/* Header: Name + Low Stock badge */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold truncate">{item.name}</h3>
                      {item.sku && (
                        <p className="text-sm text-muted-foreground truncate">SKU: {item.sku}</p>
                      )}
                    </div>
                    {item.isLowStock && (
                      <Badge variant="destructive" className="flex-shrink-0">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Low Stock
                      </Badge>
                    )}
                  </div>
                  
                  {/* Metadata row: Location -> Quantity (most scanned info first) */}
                  <div className="flex items-center justify-between text-sm pt-2 border-t border-border/50">
                    {/* Location on the left for quick scanning */}
                    {item.location ? (
                      <div className="flex items-center gap-1.5 text-muted-foreground min-w-0">
                        <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                        <span className="truncate">{item.location}</span>
                      </div>
                    ) : (
                      <div className="text-muted-foreground text-xs">No location</div>
                    )}
                    
                    {/* Quantity on the right, prominently displayed */}
                    <div className="flex-shrink-0 ml-2">
                      <span className="text-muted-foreground">Qty: </span>
                      <span className={item.isLowStock ? 'font-semibold text-destructive' : 'font-medium'}>
                        {item.quantity_on_hand}
                      </span>
                    </div>
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
        {showForm && (
          <InventoryItemForm
            open={showForm}
            onClose={handleCloseForm}
            editingItem={editingItem}
          />
        )}

        {/* Parts Managers Sheet */}
        <PartsManagersSheet
          open={showManagersSheet}
          onOpenChange={setShowManagersSheet}
        />
      </div>
    </Page>
  );
};

export default InventoryList;

