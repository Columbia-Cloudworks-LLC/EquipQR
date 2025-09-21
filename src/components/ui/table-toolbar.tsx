import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface TableToolbarProps {
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  actions?: React.ReactNode;
  bulkActions?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  }[];
  selectedCount?: number;
  className?: string;
}

const TableToolbar: React.FC<TableToolbarProps> = ({
  searchValue = '',
  onSearchChange,
  searchPlaceholder = 'Search...',
  actions,
  bulkActions = [],
  selectedCount = 0,
  className,
}) => {
  return (
    <div className={cn('flex items-center justify-between space-x-2 py-4', className)}>
      <div className="flex flex-1 items-center space-x-2">
        {/* Search */}
        {onSearchChange && (
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-8"
            />
          </div>
        )}

        {/* Bulk actions */}
        {selectedCount > 0 && bulkActions.length > 0 && (
          <div className="flex items-center space-x-2">
            <span className="text-sm text-muted-foreground">
              {selectedCount} selected
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  Actions
                  <MoreHorizontal className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {bulkActions.map((action, index) => (
                  <DropdownMenuItem key={index} onClick={action.onClick}>
                    {action.icon && <span className="mr-2">{action.icon}</span>}
                    {action.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      {/* Primary actions */}
      {actions && (
        <div className="flex items-center space-x-2">
          {actions}
        </div>
      )}
    </div>
  );
};

export default TableToolbar;

