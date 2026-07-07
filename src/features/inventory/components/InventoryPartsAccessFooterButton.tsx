import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type InventoryPartsAccessFooterButtonProps = {
  className?: string;
  onOpenPartsAccess: () => void;
};

/** Mobile footer entry point for the Parts Access sheet (header button is desktop-only). */
export function InventoryPartsAccessFooterButton({
  className,
  onOpenPartsAccess,
}: InventoryPartsAccessFooterButtonProps) {
  return (
    <div
      className={cn('flex justify-center border-t pt-4', className)}
      data-testid="inventory-parts-access-footer"
    >
      <Button
        variant="link"
        size="sm"
        onClick={onOpenPartsAccess}
        className="h-auto px-0 text-xs font-normal text-muted-foreground"
      >
        Update parts access
      </Button>
    </div>
  );
}
