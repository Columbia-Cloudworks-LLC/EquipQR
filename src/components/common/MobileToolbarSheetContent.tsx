import * as React from 'react';
import { SheetContent } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

export type MobileToolbarSheetContentProps = React.ComponentPropsWithoutRef<
  typeof SheetContent
>;

/**
 * Right-side list toolbar drawer that stops above the mobile bottom nav so
 * users can still switch sections without losing their place.
 */
export const MobileToolbarSheetContent = React.forwardRef<
  React.ElementRef<typeof SheetContent>,
  MobileToolbarSheetContentProps
>(({ className, ...props }, ref) => (
  <SheetContent
    ref={ref}
    side="right"
    reserveMobileBottomNav
    className={cn('w-full overflow-y-auto sm:max-w-sm', className)}
    {...props}
  />
));
MobileToolbarSheetContent.displayName = 'MobileToolbarSheetContent';
