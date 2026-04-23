/**
 * AuditLogDetailPanel — non-modal port of the audit-entry inspector body
 * formerly at src/components/audit/AuditEntryDetailSheet.tsx (issue #641).
 * Lives inside the explorer's right ResizablePanel and exposes Overview /
 * Changes / JSON tabs over the same data the Sheet rendered.
 */

import React from 'react';
import { format as formatDate } from 'date-fns';
import { Copy, Check, Inbox } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import EmptyState from '@/components/ui/empty-state';
import { ChangesDiff } from '@/components/audit/ChangesDiff';
import { FormattedAuditEntry, AuditAction } from '@/types/audit';
import { cn } from '@/lib/utils';

export interface AuditLogDetailPanelProps {
  entry: FormattedAuditEntry | null;
}

function getActionBadgeVariant(action: AuditAction) {
  switch (action) {
    case 'INSERT':
      return 'default' as const;
    case 'UPDATE':
      return 'secondary' as const;
    case 'DELETE':
      return 'destructive' as const;
    default:
      return 'outline' as const;
  }
}

function CopyableValue({ value }: { value: string }) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    if (!navigator.clipboard?.writeText) return;
    navigator.clipboard
      .writeText(value)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => {
        // Silent fail when clipboard write is denied.
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
    <div
      className={cn('grid grid-cols-[120px_1fr] gap-2 items-start py-1.5', className)}
    >
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function AuditLogDetailPanel({ entry }: AuditLogDetailPanelProps) {
  if (!entry) {
    return (
      <div
        className="h-full flex items-center justify-center p-6"
        data-testid="audit-detail-empty"
      >
        <EmptyState
          icon={Inbox}
          title="No entry selected"
          description="Select an entry on the left to inspect."
          className="border-0 bg-transparent"
        />
      </div>
    );
  }

  const hasMetadata = entry.metadata && Object.keys(entry.metadata).length > 0;

  return (
    <div className="h-full flex flex-col" data-testid="audit-detail-panel">
      <div className="px-5 pt-4 pb-3 border-b shrink-0">
        <h2 className="text-sm font-semibold leading-tight truncate">
          {entry.entity_name ?? 'Audit Entry'}
        </h2>
        <div className="flex items-center gap-2 mt-1.5">
          <Badge variant="outline" className="text-xs">
            {entry.entityTypeLabel}
          </Badge>
          <Badge variant={getActionBadgeVariant(entry.action)} className="text-xs">
            {entry.actionLabel}
          </Badge>
          <span className="text-xs text-muted-foreground ml-auto tabular-nums">
            {entry.relativeTime}
          </span>
        </div>
      </div>

      <Tabs defaultValue="overview" className="flex-1 flex flex-col min-h-0">
        <TabsList className="mx-5 mt-3 self-start h-8">
          <TabsTrigger value="overview" className="text-xs px-3 py-1 h-6">
            Overview
          </TabsTrigger>
          <TabsTrigger value="changes" className="text-xs px-3 py-1 h-6">
            Changes
          </TabsTrigger>
          <TabsTrigger value="json" className="text-xs px-3 py-1 h-6">
            JSON
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="flex-1 min-h-0 mt-2">
          <ScrollArea className="h-full">
            <div className="px-5 py-3 space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  Entry Details
                </p>
                <div className="divide-y divide-border/50">
                  <PropertyRow label="Date">
                    <div className="flex flex-col">
                      <span className="text-sm">
                        {formatDate(new Date(entry.created_at), 'MMMM d, yyyy')}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(new Date(entry.created_at), 'h:mm:ss a')}
                        {' \u00b7 '}
                        {entry.relativeTime}
                      </span>
                    </div>
                  </PropertyRow>
                  <PropertyRow label="Entity Name">
                    <span className="text-sm">{entry.entity_name ?? '\u2014'}</span>
                  </PropertyRow>
                  <PropertyRow label="Entity Type">
                    <Badge variant="outline" className="text-xs">
                      {entry.entityTypeLabel}
                    </Badge>
                  </PropertyRow>
                  <PropertyRow label="Action">
                    <Badge
                      variant={getActionBadgeVariant(entry.action)}
                      className="text-xs"
                    >
                      {entry.actionLabel}
                    </Badge>
                  </PropertyRow>
                  <PropertyRow label="Changed By">
                    <div className="flex flex-col">
                      <span className="text-sm">{entry.actor_name}</span>
                      {entry.actor_email && (
                        <span className="text-xs text-muted-foreground">
                          {entry.actor_email}
                        </span>
                      )}
                    </div>
                  </PropertyRow>
                  <PropertyRow label="Changes">
                    <span className="text-sm">
                      {entry.changeCount} field{entry.changeCount !== 1 ? 's' : ''}
                    </span>
                  </PropertyRow>
                </div>
              </div>

              <Separator />

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
                              : String(value ?? '\u2014')}
                          </span>
                        </PropertyRow>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="changes" className="flex-1 min-h-0 mt-2">
          <ScrollArea className="h-full">
            <div className="px-5 py-3">
              {Object.keys(entry.changes).length > 0 ? (
                <ChangesDiff changes={entry.changes} expanded />
              ) : (
                <p className="text-xs text-muted-foreground italic">
                  No field changes recorded.
                </p>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="json" className="flex-1 min-h-0 mt-2">
          <ScrollArea className="h-full">
            <pre
              className="px-5 py-3 text-[11px] font-mono text-foreground/90 leading-snug whitespace-pre-wrap break-all"
              data-testid="audit-detail-json"
            >
              {JSON.stringify(entry, null, 2)}
            </pre>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default AuditLogDetailPanel;
