import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Package, AlertTriangle, Users, MoreVertical, Filter, X, MapPin, Eye, QrCode, ChevronUp, ChevronDown, Pencil, ArrowUpDown, Minus } from 'lucide-react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useAdjustInventoryQuantity, useInventoryItems } from '@/features/inventory/hooks/useInventory';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import Page from '@/components/layout/Page';
import PageHeader from '@/components/layout/PageHeader';
import { InventoryItemForm } from '@/features/inventory/components/InventoryItemForm';
import { PartsManagersSheet } from '@/features/inventory/components/PartsManagersSheet';
import type { InventoryItem, InventoryFilters } from '@/features/inventory/types/inventory';
import { useIsMobile } from '@/hooks/use-mobile';
import InventoryQRCodeDisplay from '@/features/inventory/components/InventoryQRCodeDisplay';
import InventoryToolbar from '@/features/inventory/components/InventoryToolbar';

const InventoryList = () => {
  const navigate = useNavigate();
  const { currentOrganization } = useOrganization();
  const { data: isPartsManager = false } = useIsPartsManager(currentOrganization?.id);
  const { canManageInventory, canManagePartsManagers } = usePermissions();
  const isMobile = useIsMobile();
  const [showForm, setShowForm] = useState(false);
  const [showManagersSheet, setShowManagersSheet] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);
  const [selectedQRCodeItem, setSelectedQRCodeItem] = useState<InventoryItem | null>(null);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [filters, setFilters] = useState<InventoryFilters>({
    search: '',
    lowStockOnly: false,
    sortBy: 'name',
    sortOrder: 'asc',
  });
  const adjustMutation = useAdjustInventoryQuantity();

  const { data: items = [], isLoading } = useInventoryItems(
    currentOrganization?.id,
    filters
  );

  const { data: allItems = [] } = useInventoryItems(
    currentOrganization?.id,
    { search: '', lowStockOnly: false }
  );

  const uniqueLocations = useMemo(() => {
    const locs = allItems
      .map((item) => item.location)
      .filter((loc): loc is string => !!loc && loc.trim() !== '');
    return [...new Set(locs)].sort();
  }, [allItems]);

  const handleAddItem = () => {
    setEditingItem(null);
    setShowForm(true);
  };


  const handleViewItem = (itemId: string) => {
    navigate(`/dashboard/inventory/${itemId}`);
  };

  const handleItemKeyDown = (e: React.KeyboardEvent<HTMLElement>, itemId: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleViewItem(itemId);
    }
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingItem(null);
  };

  const handleEditItem = (item: InventoryItem) => {
    setEditingItem(item);
    setShowForm(true);
  };

  const handleShowQRCode = (item: InventoryItem) => {
    setSelectedQRCodeItem(item);
    setShowQRCode(true);
  };

  const handleSortChange = (sortBy: NonNullable<InventoryFilters['sortBy']>) => {
    setFilters((prev) => ({
      ...prev,
      sortBy,
      sortOrder: prev.sortBy === sortBy && prev.sortOrder === 'asc' ? 'desc' : 'asc',
    }));
  };

  const getSortIcon = (sortBy: NonNullable<InventoryFilters['sortBy']>) => {
    if (filters.sortBy !== sortBy) {
      return <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />;
    }
    return filters.sortOrder === 'asc'
      ? <ChevronUp className="h-3.5 w-3.5" />
      : <ChevronDown className="h-3.5 w-3.5" />;
  };

  const handleQuickAdjust = async (itemId: string, delta: 1 | -1) => {
    if (!currentOrganization) return;
    await adjustMutation.mutateAsync({
      organizationId: currentOrganization.id,
      adjustment: {
        itemId,
        delta,
        reason: delta > 0 ? 'Quick add from inventory list' : 'Quick take from inventory list',
      },
    });
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
        {isMobile ? (
          /* Mobile: Search bar + Filter Sheet */
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search by name, SKU, or external ID..."
                value={filters.search || ''}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="pl-9 h-10"
                aria-label="Search inventory by name, SKU, or external ID"
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
          /* Desktop: compact toolbar */
          <InventoryToolbar
            filters={filters}
            uniqueLocations={uniqueLocations}
            resultCount={items.length}
            onFilterChange={(patch) => setFilters((prev) => ({ ...prev, ...patch }))}
            onClearFilters={() =>
              setFilters((prev) => ({ ...prev, search: '', lowStockOnly: false, location: undefined }))
            }
            canExport={canCreate}
            items={items}
          />
        )}

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
                onKeyDown={(e) => handleItemKeyDown(e, item.id)}
                role="button"
                tabIndex={0}
                aria-label={`Open inventory item ${item.name}`}
              >
                <CardContent className="p-4">
                  {/* Header: Name + Low Stock badge */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold truncate">{item.name}</h3>
                      <p className="text-sm text-muted-foreground truncate">
                        SKU: {item.sku || '-'}
                        {item.location ? `  •  ${item.location}` : ''}
                      </p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 flex-shrink-0"
                          aria-label={`More actions for ${item.name}`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenuItem onClick={() => handleViewItem(item.id)}>
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        {canCreate && (
                          <DropdownMenuItem
                            onClick={() => {
                              void handleQuickAdjust(item.id, 1);
                            }}
                            disabled={adjustMutation.isPending}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add 1
                          </DropdownMenuItem>
                        )}
                        {canCreate && (
                          <DropdownMenuItem
                            onClick={() => {
                              void handleQuickAdjust(item.id, -1);
                            }}
                            disabled={adjustMutation.isPending}
                          >
                            <Minus className="h-4 w-4 mr-2" />
                            Take 1
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => handleShowQRCode(item)}>
                          <QrCode className="h-4 w-4 mr-2" />
                          QR Code
                        </DropdownMenuItem>
                        {canCreate && (
                          <DropdownMenuItem onClick={() => handleEditItem(item)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
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
                    <TableHead>
                      <Button variant="ghost" className="-ml-3 h-8 px-3" onClick={() => handleSortChange('name')}>
                        Name
                        {getSortIcon('name')}
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button variant="ghost" className="-ml-3 h-8 px-3" onClick={() => handleSortChange('sku')}>
                        SKU
                        {getSortIcon('sku')}
                      </Button>
                    </TableHead>
                    <TableHead className="hidden xl:table-cell">
                      <Button variant="ghost" className="-ml-3 h-8 px-3" onClick={() => handleSortChange('external_id')}>
                        External ID
                        {getSortIcon('external_id')}
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button variant="ghost" className="-ml-3 h-8 px-3" onClick={() => handleSortChange('quantity_on_hand')}>
                        Quantity
                        {getSortIcon('quantity_on_hand')}
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button variant="ghost" className="-ml-3 h-8 px-3" onClick={() => handleSortChange('location')}>
                        Location
                        {getSortIcon('location')}
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button variant="ghost" className="-ml-3 h-8 px-3" onClick={() => handleSortChange('status')}>
                        Status
                        {getSortIcon('status')}
                      </Button>
                    </TableHead>
                    <TableHead className="w-[56px]">
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow
                      key={item.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleViewItem(item.id)}
                      onKeyDown={(e) => handleItemKeyDown(e, item.id)}
                      role="button"
                      tabIndex={0}
                      aria-label={`Open inventory item ${item.name}`}
                    >
                      <TableCell className="font-medium">
                        <div className="min-w-0">
                          <p className="truncate">{item.name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            SKU: {item.sku || '-'}
                            {item.location ? `  •  ${item.location}` : ''}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {item.sku || '-'}
                      </TableCell>
                      <TableCell className="hidden xl:table-cell text-muted-foreground font-mono text-sm">
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
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              aria-label={`Actions for ${item.name}`}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenuItem onClick={() => handleViewItem(item.id)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            {canCreate && (
                              <DropdownMenuItem
                                onClick={() => {
                                  void handleQuickAdjust(item.id, 1);
                                }}
                                disabled={adjustMutation.isPending}
                              >
                                <Plus className="h-4 w-4 mr-2" />
                                Add 1
                              </DropdownMenuItem>
                            )}
                            {canCreate && (
                              <DropdownMenuItem
                                onClick={() => {
                                  void handleQuickAdjust(item.id, -1);
                                }}
                                disabled={adjustMutation.isPending}
                              >
                                <Minus className="h-4 w-4 mr-2" />
                                Take 1
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => handleShowQRCode(item)}>
                              <QrCode className="h-4 w-4 mr-2" />
                              QR Code
                            </DropdownMenuItem>
                            {canCreate && (
                              <DropdownMenuItem onClick={() => handleEditItem(item)}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
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

        {selectedQRCodeItem && (
          <InventoryQRCodeDisplay
            open={showQRCode}
            onClose={() => {
              setShowQRCode(false);
              setSelectedQRCodeItem(null);
            }}
            itemId={selectedQRCodeItem.id}
            itemName={selectedQRCodeItem.name}
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

