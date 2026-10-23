import { Plus, ShoppingCart, Table2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type InventoryListPageActionsProps = {
  canCreate: boolean;
  canManage: boolean;
  onOpenManagersSheet: () => void;
  onAddItem: () => void;
  onNavigateBulk: () => void;
  onNavigatePurchaseRequests?: () => void;
};

export function InventoryListPageActions({
  canCreate,
  canManage,
  onOpenManagersSheet,
  onAddItem,
  onNavigateBulk,
  onNavigatePurchaseRequests,
}: InventoryListPageActionsProps) {
  return (
    <div className="flex items-center gap-2">
      {onNavigatePurchaseRequests && (
        <Button variant="outline" onClick={onNavigatePurchaseRequests}>
          <ShoppingCart className="mr-2 h-4 w-4" />
          <span className="hidden sm:inline">Purchase Requests</span>
          <span className="inline sm:hidden">Restock</span>
        </Button>
      )}

      {canManage && (
        <Button
          variant="outline"
          onClick={onOpenManagersSheet}
          className="hidden sm:inline-flex"
        >
          <Users className="mr-2 h-4 w-4" />
          Parts Access
        </Button>
      )}

      {canCreate && (
        <div className="hidden sm:inline-flex">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Item
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onAddItem}>
                <Plus className="mr-2 h-4 w-4" />
                Add Single Item
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onNavigateBulk}>
                <Table2 className="mr-2 h-4 w-4" />
                Bulk Add / Edit (Grid)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

    </div>
  );
}
