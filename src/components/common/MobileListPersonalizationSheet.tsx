import React from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { MobileToolbarSheetContent } from '@/components/common/MobileToolbarSheetContent';

interface MobileListPersonalizationSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hasNonDefaultSort: boolean;
  description: string;
  children: React.ReactNode;
}

export function MobileListPersonalizationSheet({
  open,
  onOpenChange,
  hasNonDefaultSort,
  description,
  children,
}: MobileListPersonalizationSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="relative h-11 w-11 shrink-0"
          aria-label={
            hasNonDefaultSort
              ? 'Open personalization, custom sort active'
              : 'Open personalization'
          }
        >
          <SlidersHorizontal className="h-4 w-4" aria-hidden />
          {hasNonDefaultSort && (
            <Badge
              variant="secondary"
              className="absolute -right-1 -top-1 h-5 min-w-5 px-1 text-[10px]"
            >
              1
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <MobileToolbarSheetContent>
        <SheetHeader className="pb-2 text-left">
          <SheetTitle>Personalize list</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>
        <div className="space-y-6 pb-8 pt-2">{children}</div>
      </MobileToolbarSheetContent>
    </Sheet>
  );
}
