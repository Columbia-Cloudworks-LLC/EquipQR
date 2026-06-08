import { useState } from 'react';
import { Download, MapPin, SlidersHorizontal, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type InventoryBulkActionBarProps = {
  selectedCount: number;
  canEdit: boolean;
  onClearSelection: () => void;
  onExportSelected: () => void;
  onOpenBulkEdit: () => void;
  onBulkUpdateLocation: (location: string) => Promise<void>;
  onBulkUpdateThreshold: (threshold: number) => Promise<void>;
  isUpdating: boolean;
};

export function InventoryBulkActionBar({
  selectedCount,
  canEdit,
  onClearSelection,
  onExportSelected,
  onOpenBulkEdit,
  onBulkUpdateLocation,
  onBulkUpdateThreshold,
  isUpdating,
}: InventoryBulkActionBarProps) {
  const [locationDialogOpen, setLocationDialogOpen] = useState(false);
  const [thresholdDialogOpen, setThresholdDialogOpen] = useState(false);
  const [locationValue, setLocationValue] = useState('');
  const [thresholdValue, setThresholdValue] = useState('');

  if (selectedCount === 0) return null;

  const handleLocationSave = async () => {
    await onBulkUpdateLocation(locationValue.trim());
    setLocationDialogOpen(false);
    setLocationValue('');
  };

  const handleThresholdSave = async () => {
    const parsed = Number(thresholdValue);
    if (!Number.isFinite(parsed) || parsed < 0) return;
    await onBulkUpdateThreshold(parsed);
    setThresholdDialogOpen(false);
    setThresholdValue('');
  };

  return (
    <>
      <div className="sticky bottom-4 z-20 mx-auto flex w-full max-w-4xl flex-wrap items-center justify-between gap-3 rounded-lg border bg-card px-4 py-3 shadow-lg">
        <p className="text-sm font-medium">
          {selectedCount} item{selectedCount === 1 ? '' : 's'} selected
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8"
            onClick={onExportSelected}
          >
            <Download className="mr-1.5 h-3.5 w-3.5" aria-hidden />
            Export selected
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8"
            onClick={onOpenBulkEdit}
          >
            Open bulk edit
          </Button>
          {canEdit && (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8"
                onClick={() => setLocationDialogOpen(true)}
                disabled={isUpdating}
              >
                <MapPin className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                Set location
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8"
                onClick={() => setThresholdDialogOpen(true)}
                disabled={isUpdating}
              >
                <SlidersHorizontal className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                Set threshold
              </Button>
            </>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8"
            onClick={onClearSelection}
          >
            <X className="mr-1.5 h-3.5 w-3.5" aria-hidden />
            Clear
          </Button>
        </div>
      </div>

      <Dialog open={locationDialogOpen} onOpenChange={setLocationDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update location for {selectedCount} items</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="bulk-location">Location</Label>
            <Input
              id="bulk-location"
              value={locationValue}
              onChange={(e) => setLocationValue(e.target.value)}
              placeholder="e.g. Warehouse A"
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              onClick={handleLocationSave}
              disabled={!locationValue.trim() || isUpdating}
            >
              Apply to selected
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={thresholdDialogOpen} onOpenChange={setThresholdDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update low stock threshold for {selectedCount} items</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="bulk-threshold">Low stock threshold</Label>
            <Input
              id="bulk-threshold"
              type="number"
              min={0}
              value={thresholdValue}
              onChange={(e) => setThresholdValue(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              onClick={handleThresholdSave}
              disabled={!thresholdValue.trim() || isUpdating}
            >
              Apply to selected
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
