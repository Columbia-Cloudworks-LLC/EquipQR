import type { ReactNode } from 'react';
import { User, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { FormattedAuditEntry } from '@/types/audit';

type HistoryEntryHeaderProps = {
  entry: FormattedAuditEntry;
  getActionColor: (action: FormattedAuditEntry['action']) => string;
  trailing?: ReactNode;
};

export function HistoryEntryHeader({
  entry,
  getActionColor,
  trailing,
}: HistoryEntryHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge
            variant="outline"
            className={cn('font-medium', getActionColor(entry.action))}
          >
            {entry.actionLabel}
          </Badge>
          <span className="text-sm text-muted-foreground">
            {entry.changeCount} field{entry.changeCount !== 1 ? 's' : ''} changed
          </span>
        </div>

        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <User className="h-3.5 w-3.5" />
            <span>{entry.actor_name}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            <span title={entry.relativeTime}>
              {entry.formattedDate}
              <span className="ml-1 text-xs text-muted-foreground/90">
                ({entry.relativeTime})
              </span>
            </span>
          </div>
        </div>
      </div>
      {trailing}
    </div>
  );
}
