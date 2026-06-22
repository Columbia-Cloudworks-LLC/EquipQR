import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ORGANIZATION_MEMBERS_PATH } from '@/features/organization/constants/routes';
import { cn } from '@/lib/utils';

type InventoryPartsManagersFooterLinkProps = {
  className?: string;
};

export function InventoryPartsManagersFooterLink({
  className,
}: InventoryPartsManagersFooterLinkProps) {
  return (
    <div
      className={cn('flex justify-center border-t pt-4', className)}
      data-testid="inventory-parts-managers-footer"
    >
      <Button
        variant="link"
        size="sm"
        asChild
        className="h-auto px-0 text-xs font-normal text-muted-foreground"
      >
        <Link to={ORGANIZATION_MEMBERS_PATH}>Update parts managers</Link>
      </Button>
    </div>
  );
}
