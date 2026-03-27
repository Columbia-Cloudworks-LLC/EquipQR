import React from 'react';
import { Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import InlineEditField from '@/features/equipment/components/InlineEditField';
import ImageUploadWithNote from '@/components/common/ImageUploadWithNote';
import { getStockHealthPresentation } from '@/features/inventory/utils/stockHealth';
import { cn } from '@/lib/utils';
import type { InventoryItem, InventoryItemImage } from '@/features/inventory/types/inventory';

interface InventoryItemOverviewTabProps {
  item: InventoryItem;
  canEdit: boolean;
  itemImages: InventoryItemImage[];
  onFieldUpdate: (
    field: 'name' | 'description' | 'sku' | 'external_id' | 'location',
    value: string
  ) => Promise<void>;
  onDeleteImage: (image: InventoryItemImage) => Promise<void>;
  onUploadImages: (files: File[]) => Promise<void>;
  onDeleteItemRequest: () => void;
}

const InventoryItemOverviewTab: React.FC<InventoryItemOverviewTabProps> = ({
  item,
  canEdit,
  itemImages,
  onFieldUpdate,
  onDeleteImage,
  onUploadImages,
  onDeleteItemRequest,
}) => {
  const stockHealth = getStockHealthPresentation(item);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold tracking-tight">Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-muted-foreground">Name</Label>
              <div className="mt-0.5">
                <InlineEditField
                  value={item.name || ''}
                  onSave={(value) => onFieldUpdate('name', value)}
                  canEdit={canEdit}
                  placeholder="Enter item name"
                  className="text-base"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-muted-foreground">Description</Label>
              <div className="mt-0.5">
                <InlineEditField
                  value={item.description || ''}
                  onSave={(value) => onFieldUpdate('description', value)}
                  canEdit={canEdit}
                  type="textarea"
                  placeholder="Enter description"
                  className="text-base"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-muted-foreground">SKU</Label>
              <div className="mt-0.5">
                <InlineEditField
                  value={item.sku || ''}
                  onSave={(value) => onFieldUpdate('sku', value)}
                  canEdit={canEdit}
                  placeholder="Enter SKU"
                  className="text-base font-mono"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-muted-foreground">External ID</Label>
              <div className="mt-0.5">
                <InlineEditField
                  value={item.external_id || ''}
                  onSave={(value) => onFieldUpdate('external_id', value)}
                  canEdit={canEdit}
                  placeholder="Enter external ID"
                  className="text-base font-mono"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-muted-foreground">Location</Label>
              <div className="mt-0.5">
                <InlineEditField
                  value={item.location || ''}
                  onSave={(value) => onFieldUpdate('location', value)}
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
            <CardTitle className="text-lg font-semibold tracking-tight">Stock Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-1.5">
              <Label className="text-muted-foreground">Quantity on Hand</Label>
              <div className="flex flex-wrap items-center gap-2 mt-0.5">
                <p className="text-2xl font-bold">{item.quantity_on_hand}</p>
                <Badge variant="outline" className={cn('text-xs font-medium', stockHealth.className)}>
                  {stockHealth.label}
                </Badge>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground">Low Stock Threshold</Label>
              <p className="font-medium">{item.low_stock_threshold}</p>
            </div>
            {item.default_unit_cost && (
              <div className="space-y-1.5">
                <Label className="text-muted-foreground">Default Unit Cost</Label>
                <p className="font-medium">${Number(item.default_unit_cost).toFixed(2)}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold tracking-tight">Images</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {itemImages.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {itemImages.map((img) => (
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
                      onClick={() => onDeleteImage(img)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                  <p className="text-xs text-muted-foreground mt-1 truncate">{img.file_name}</p>
                </div>
              ))}
            </div>
          )}

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

          {canEdit && itemImages.length < 5 && (
            <ImageUploadWithNote
              onUpload={onUploadImages}
              maxFiles={5 - itemImages.length}
              disabled={false}
            />
          )}

          {!canEdit && itemImages.length === 0 && !item.image_url && (
            <p className="text-sm text-muted-foreground">No images uploaded</p>
          )}
        </CardContent>
      </Card>

      {canEdit && (
        <div className="mt-8 space-y-4">
          <Separator />
          <Card className="border-destructive/80 bg-destructive/[0.06] dark:bg-destructive/10">
            <CardHeader>
              <CardTitle className="text-lg font-semibold tracking-tight text-destructive">
                Delete Item
              </CardTitle>
            </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Once you delete an inventory item, there is no going back. This action cannot be undone.
            </p>
            <Button
              variant="destructive"
              onClick={onDeleteItemRequest}
              className="w-full sm:w-auto"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Inventory Item
            </Button>
          </CardContent>
        </Card>
        </div>
      )}
    </div>
  );
};

export default InventoryItemOverviewTab;
