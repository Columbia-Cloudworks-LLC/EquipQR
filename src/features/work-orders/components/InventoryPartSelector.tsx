import React, { useState, useMemo } from 'react';
import { Search, Package, AlertTriangle, RefreshCw, ArrowUpDown } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useCompatibleInventoryItems } from '@/features/inventory/hooks/useInventory';

type SortOption = 'default' | 'name-asc' | 'name-desc' | 'price-asc' | 'price-desc';

interface InventoryPartSelectorProps {
  open: boolean;
  onClose: () => void;
  equipmentIds: string[];
  onSelect: (itemId: string, quantity: number, unitCost: number) => void;
}

export const InventoryPartSelector: React.FC<InventoryPartSelectorProps> = ({
  open,
  onClose,
  equipmentIds,
  onSelect
}) => {
  const { currentOrganization } = useOrganization();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [sortBy, setSortBy] = useState<SortOption>('default');

  const { data: compatibleItems = [], isLoading } = useCompatibleInventoryItems(
    currentOrganization?.id,
    equipmentIds
  );

  const filteredAndSortedItems = useMemo(() => {
    let items = compatibleItems;
    
    // Filter by search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      items = items.filter(item =>
        item.name.toLowerCase().includes(term) ||
        item.sku?.toLowerCase().includes(term) ||
        item.external_id?.toLowerCase().includes(term)
      );
    }
    
    // Apply user sort (if not default, override RPC order)
    if (sortBy !== 'default') {
      items = [...items].sort((a, b) => {
        switch (sortBy) {
          case 'name-asc':
            return a.name.localeCompare(b.name);
          case 'name-desc':
            return b.name.localeCompare(a.name);
          case 'price-asc': {
            const priceA = a.default_unit_cost ?? Infinity;
            const priceB = b.default_unit_cost ?? Infinity;
            return Number(priceA) - Number(priceB);
          }
          case 'price-desc': {
            const priceA = a.default_unit_cost ?? 0;
            const priceB = b.default_unit_cost ?? 0;
            return Number(priceB) - Number(priceA);
          }
          default:
            return 0;
        }
      });
    }
    
    return items;
  }, [compatibleItems, searchTerm, sortBy]);

  const selectedItem = selectedItemId
    ? compatibleItems.find(item => item.id === selectedItemId)
    : null;

  const handleSelect = () => {
    if (!selectedItem) return;
    const unitCost = selectedItem.default_unit_cost
      ? Number(selectedItem.default_unit_cost)
      : 0;
    onSelect(selectedItem.id, quantity, unitCost);
    // Reset state
    setSelectedItemId(null);
    setQuantity(1);
    setSearchTerm('');
    onClose();
  };

  const handleCancel = () => {
    setSelectedItemId(null);
    setQuantity(1);
    setSearchTerm('');
    setSortBy('default');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleCancel}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Part from Inventory</DialogTitle>
          <DialogDescription>
            Select a compatible part from your inventory
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search and Sort Controls */}
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search by name, SKU, or external ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                <Select value={sortBy} onValueChange={(value: SortOption) => setSortBy(value)}>
                  <SelectTrigger className="w-[220px]">
                    <SelectValue placeholder="Sort by..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Default (Alternates, Cheapest)</SelectItem>
                    <SelectItem value="name-asc">Name: A → Z</SelectItem>
                    <SelectItem value="name-desc">Name: Z → A</SelectItem>
                    <SelectItem value="price-asc">Price: Low → High</SelectItem>
                    <SelectItem value="price-desc">Price: High → Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <p className="text-sm text-muted-foreground">
                {filteredAndSortedItems.length} {filteredAndSortedItems.length === 1 ? 'part' : 'parts'} found
              </p>
            </div>
          </div>

          {/* Items List */}
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-4">
                    <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredAndSortedItems.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No compatible parts</h3>
                <p className="text-muted-foreground">
                  {searchTerm
                    ? 'No parts match your search.'
                    : 'No parts are linked to the work order equipment.'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredAndSortedItems.map((item) => {
                const isSelected = selectedItemId === item.id;
                return (
                  <Card
                    key={item.id}
                    className={`cursor-pointer transition-colors ${
                      isSelected ? 'ring-2 ring-primary' : 'hover:bg-muted/50'
                    }`}
                    onClick={() => setSelectedItemId(item.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h3 className="font-semibold">{item.name}</h3>
                            {item.hasAlternates && (
                              <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800">
                                <RefreshCw className="h-3 w-3 mr-1" />
                                Alternates
                              </Badge>
                            )}
                            {item.isLowStock && (
                              <Badge variant="destructive" className="text-xs">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Low Stock
                              </Badge>
                            )}
                          </div>
                          {item.sku && (
                            <p className="text-sm text-muted-foreground">SKU: {item.sku}</p>
                          )}
                          {item.external_id && (
                            <p className="text-sm text-muted-foreground font-mono">
                              External ID: {item.external_id}
                            </p>
                          )}
                          {item.location && (
                            <p className="text-sm text-muted-foreground">📍 {item.location}</p>
                          )}
                        </div>
                        <div className="text-right ml-4">
                          <p className="font-medium">
                            Qty: {item.quantity_on_hand}
                          </p>
                          {item.default_unit_cost && (
                            <p className="text-sm text-muted-foreground">
                              ${Number(item.default_unit_cost).toFixed(2)}/unit
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Selection and Quantity */}
          {selectedItem && (
            <Card className="bg-muted/50">
              <CardContent className="p-4 space-y-4">
                <div>
                  <Label>Selected Part</Label>
                  <p className="font-medium">{selectedItem.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Available: {selectedItem.quantity_on_hand}
                  </p>
                </div>
                <div>
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    max={selectedItem.quantity_on_hand}
                    value={quantity}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 1;
                      setQuantity(Math.max(1, Math.min(val, selectedItem.quantity_on_hand)));
                    }}
                    className="mt-1"
                  />
                </div>
                {selectedItem.default_unit_cost && (
                  <div>
                    <Label>Estimated Cost</Label>
                    <p className="font-medium">
                      ${(quantity * Number(selectedItem.default_unit_cost)).toFixed(2)}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button
              onClick={handleSelect}
              disabled={!selectedItem || quantity < 1}
            >
              Add to Work Order
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};



