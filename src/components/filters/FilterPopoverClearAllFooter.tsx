import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

type FilterPopoverClearAllFooterProps = {
  activeFilterCount: number;
  onClearFilters: () => void;
  onClose: () => void;
};

export function FilterPopoverClearAllFooter({
  activeFilterCount,
  onClearFilters,
  onClose,
}: FilterPopoverClearAllFooterProps) {
  if (activeFilterCount <= 0) {
    return null;
  }

  return (
    <>
      <Separator />
      <Button
        variant="ghost"
        size="sm"
        className="h-7 w-full text-xs text-muted-foreground hover:text-foreground"
        onClick={() => {
          onClearFilters();
          onClose();
        }}
      >
        <X className="h-3 w-3 mr-1.5" />
        Clear all filters
      </Button>
    </>
  );
}
