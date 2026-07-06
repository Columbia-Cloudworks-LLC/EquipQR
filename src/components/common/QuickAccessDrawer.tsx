import { useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

export interface QuickAccessAction {
  id: string;
  label: string;
  sublabel?: string;
  icon: LucideIcon;
  onSelect: () => void;
  disabled?: boolean;
}

export interface QuickAccessSection {
  id: string;
  title: string;
  actions: QuickAccessAction[];
}

interface QuickAccessDrawerProps {
  fabIcon: LucideIcon;
  fabAriaLabel: string;
  title: string;
  description?: string;
  sections: QuickAccessSection[];
}

/**
 * Mobile quick access button (issue #1151): a floating action button that
 * expands into a bottom drawer of contextual shortcuts for the current page.
 * Callers gate rendering to mobile viewports and supply page-specific
 * sections (e.g. QR actions on equipment details).
 */
export function QuickAccessDrawer({
  fabIcon: FabIcon,
  fabAriaLabel,
  title,
  description,
  sections,
}: QuickAccessDrawerProps) {
  const [open, setOpen] = useState(false);

  const visibleSections = sections.filter((section) => section.actions.length > 0);
  if (visibleSections.length === 0) return null;

  const handleSelect = (action: QuickAccessAction) => {
    setOpen(false);
    action.onSelect();
  };

  return (
    <>
      <Button
        type="button"
        size="icon"
        onClick={() => setOpen(true)}
        aria-label={fabAriaLabel}
        className={cn(
          'fixed bottom-[78px] right-4 z-fixed h-14 w-14 rounded-full shadow-elevation-3',
          'touch-manipulation transition-transform duration-100 active:scale-[0.97]',
          'motion-reduce:active:scale-100',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        )}
      >
        <FabIcon className="h-6 w-6" aria-hidden />
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="bottom"
          className="flex max-h-[85dvh] flex-col gap-0 rounded-t-xl p-0 pb-safe-bottom"
        >
          <SheetHeader className="shrink-0 space-y-1 border-b px-6 pb-4 pt-6 text-left">
            <SheetTitle>{title}</SheetTitle>
            {description && <SheetDescription>{description}</SheetDescription>}
          </SheetHeader>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-4">
            <div className="space-y-4 pb-2">
              {visibleSections.map((section, index) => (
                <div key={section.id} className="space-y-2">
                  {index > 0 && <Separator className="mb-4" />}
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {section.title}
                  </p>
                  {section.actions.map((action) => (
                    <Button
                      key={action.id}
                      variant="outline"
                      className="h-12 w-full justify-start gap-2"
                      disabled={action.disabled}
                      onClick={() => handleSelect(action)}
                    >
                      <action.icon className="h-5 w-5 shrink-0" aria-hidden />
                      <span className="flex min-w-0 flex-col items-start">
                        <span className="text-sm font-medium">{action.label}</span>
                        {action.sublabel && (
                          <span className="truncate text-xs font-normal text-muted-foreground">
                            {action.sublabel}
                          </span>
                        )}
                      </span>
                    </Button>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
