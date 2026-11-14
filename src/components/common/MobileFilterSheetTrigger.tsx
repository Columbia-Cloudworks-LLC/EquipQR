import React from 'react';
import { Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SheetTrigger } from '@/components/ui/sheet';

/** Filter icon button that opens a mobile filter sheet, with a count badge when filters are active. */
export function MobileFilterSheetTrigger({ activeFilterCount }: { activeFilterCount: number }) {
  return (
    <SheetTrigger asChild>
      <Button
        variant="outline"
        size="icon"
        className="relative h-11 w-11 shrink-0"
        aria-label={
          activeFilterCount > 0 ? `Open filters, ${activeFilterCount} active` : 'Open filters'
        }
      >
        <Filter className="h-4 w-4" aria-hidden />
        {activeFilterCount > 0 && (
          <Badge
            variant="secondary"
            className="absolute -right-1 -top-1 h-5 min-w-5 px-1 text-[10px]"
          >
            {activeFilterCount}
          </Badge>
        )}
      </Button>
    </SheetTrigger>
  );
}
