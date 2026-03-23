import React from 'react';
import { format } from 'date-fns';
import { Copy, Check } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChangesDiff } from './ChangesDiff';
import { FormattedAuditEntry, AuditAction } from '@/types/audit';
import { cn } from '@/lib/utils';

interface AuditEntryDetailSheetProps {
  entry: FormattedAuditEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function getActionBadgeVariant(action: AuditAction) {
  switch (action) {
    case 'INSERT': return 'default' as const;
    case 'UPDATE': return 'secondary' as const;
    case 'DELETE': return 'destructive' as const;
    default: return 'outline' as const;
  }
}

function CopyableValue({ value }: { value: string }) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    if (!navigator.clipboard?.writeText) {
      return;
    }

    navigator.clipboard
      .writeText(value)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => {
        // Fail silently if clipboard write is not permitted or fails.
      });
  };

  return (
    <div className="flex items-center gap-1.5 min-w-0">
      <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded truncate max-w-[220px]">
        {value}
      </code>
      <Button
        variant="ghost"
        size="icon"
        className="h-5 w-5 shrink-0 text-muted-foreground hover:text-foreground"
        onClick={handleCopy}
        aria-label="Copy to clipboard"
      >
        {copied ? (
          <Check className="h-3 w-3 text-success" />
        ) : (
          <Copy className="h-3 w-3" />
        )}
      </Button>
    </div>
  );
}

interface PropertyRowProps {
  label: string;
  children: React.ReactNode;
  className?: string;
}

function PropertyRow({ label, children, className }: PropertyRowProps) {
  return (
    <div className={cn('grid grid-cols-[120px_1fr] gap-2 items-start py-1.5', className)}>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function AuditEntryDetailSheet({ entry, open, onOpenChange }: AuditEntryDetailSheetProps) {
  if (!entry) return null;

  const hasChanges = Object.keys(entry.changes).length > 0;
  const hasMetadata = entry.metadata && Object.keys(entry.metadata).length > 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg p-0 flex flex-col">
        <SheetHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <SheetTitle className="text-base font-semibold leading-tight">
            {entry.entity_name ?? 'Audit Entry'}
          </SheetTitle>
          <SheetDescription className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className="text-xs">
              {entry.entityTypeLabel}
            </Badge>
            <Badge variant={getActionBadgeVariant(entry.action)} className="text-xs">
              {entry.actionLabel}
            </Badge>
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 min-h-0">
          <div className="px-6 py-4 space-y-5">
            {/* Core metadata */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Entry Details
              </p>
              <div className="divide-y divide-border/50">
                <PropertyRow label="Date">
                  <div className="flex flex-col">
                    <span className="text-sm">
                      {format(new Date(entry.created_at), 'MMMM d, yyyy')}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(entry.created_at), 'h:mm:ss a')} &middot; {entry.relativeTime}
                    </span>
                  </div>
                </PropertyRow>

                <PropertyRow label="Entity Name">
                  <span className="text-sm">{entry.entity_name ?? '—'}</span>
                </PropertyRow>

                <PropertyRow label="Entity Type">
                  <Badge variant="outline" className="text-xs">
                    {entry.entityTypeLabel}
                  </Badge>
                </PropertyRow>

                <PropertyRow label="Action">
                  <Badge variant={getActionBadgeVariant(entry.action)} className="text-xs">
                    {entry.actionLabel}
                  </Badge>
                </PropertyRow>

                <PropertyRow label="Changed By">
                  <div className="flex flex-col">
                    <span className="text-sm">{entry.actor_name}</span>
                    {entry.actor_email && (
                      <span className="text-xs text-muted-foreground">{entry.actor_email}</span>
                    )}
                  </div>
                </PropertyRow>

                <PropertyRow label="Changes">
                  <span className="text-sm">{entry.changeCount} field{entry.changeCount !== 1 ? 's' : ''}</span>
                </PropertyRow>
              </div>
            </div>

            <Separator />

            {/* IDs */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Identifiers
              </p>
              <div className="divide-y divide-border/50">
                <PropertyRow label="Entry ID">
                  <CopyableValue value={entry.id} />
                </PropertyRow>

                <PropertyRow label="Entity ID">
                  <CopyableValue value={entry.entity_id} />
                </PropertyRow>

                {entry.actor_id && (
                  <PropertyRow label="Actor ID">
                    <CopyableValue value={entry.actor_id} />
                  </PropertyRow>
                )}

                <PropertyRow label="Org ID">
                  <CopyableValue value={entry.organization_id} />
                </PropertyRow>
              </div>
            </div>

            {/* Changes diff */}
            {hasChanges && (
              <>
                <Separator />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                    Field Changes
                  </p>
                  <ChangesDiff changes={entry.changes} expanded />
                </div>
              </>
            )}

            {/* Metadata */}
            {hasMetadata && (
              <>
                <Separator />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    Metadata
                  </p>
                  <div className="divide-y divide-border/50">
                    {Object.entries(entry.metadata).map(([key, value]) => (
                      <PropertyRow key={key} label={key.replace(/_/g, ' ')}>
                        <span className="text-xs font-mono break-all">
                          {typeof value === 'object'
                            ? JSON.stringify(value, null, 2)
                            : String(value ?? '—')}
                        </span>
                      </PropertyRow>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

export default AuditEntryDetailSheet;
