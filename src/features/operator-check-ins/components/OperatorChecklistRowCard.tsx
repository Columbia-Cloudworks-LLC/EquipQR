import type { ReactNode } from 'react';
import { ChevronDown, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

export interface OperatorChecklistRowCardProps {
  title: string;
  emptyTitle: string;
  subtitle?: string;
  icon: ReactNode;
  badges?: ReactNode;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onRemove: () => void;
  removeLabel: string;
  children: ReactNode;
}

export function OperatorChecklistRowCard({
  title,
  emptyTitle,
  subtitle,
  icon,
  badges,
  isOpen,
  onOpenChange,
  onRemove,
  removeLabel,
  children,
}: OperatorChecklistRowCardProps) {
  const displayTitle = title.trim() || emptyTitle;
  const isPlaceholder = !title.trim();

  return (
    <Card className="overflow-hidden">
      <Collapsible open={isOpen} onOpenChange={onOpenChange}>
        <div className="flex items-start gap-2 p-3">
          <CollapsibleTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              className="flex h-auto min-h-0 flex-1 items-start justify-start gap-3 px-2 py-1 text-left hover:bg-muted/50"
            >
              <span className="mt-0.5 shrink-0 text-muted-foreground">{icon}</span>
              <span className="min-w-0 flex-1 space-y-1">
                <span
                  className={cn(
                    'block truncate font-medium leading-tight',
                    isPlaceholder && 'text-muted-foreground italic',
                  )}
                >
                  {displayTitle}
                </span>
                {subtitle && (
                  <span className="block truncate text-xs text-muted-foreground">{subtitle}</span>
                )}
                {badges && (
                  <span className="flex flex-wrap items-center gap-1.5 pt-0.5">{badges}</span>
                )}
              </span>
              <ChevronDown
                className={cn(
                  'mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform',
                  isOpen && 'rotate-180',
                )}
              />
            </Button>
          </CollapsibleTrigger>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
            onClick={onRemove}
            aria-label={removeLabel}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
        <CollapsibleContent>
          <div className="space-y-4 border-t px-4 pb-4 pt-3">{children}</div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

export function RequiredBadge() {
  return (
    <Badge variant="secondary" className="font-normal">
      Required
    </Badge>
  );
}
