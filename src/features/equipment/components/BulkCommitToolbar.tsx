import React from 'react';
import { Loader2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export interface BulkCommitToolbarProps {
  dirtyCount: number;
  selectedCount: number;
  isPending: boolean;
  onDiscard: () => void;
  onCommit: () => void;
}

/**
 * Sticky footer for the bulk-edit grid (#627). Shows the live count of dirty
 * rows + the current selection size, and exposes the discard / commit
 * actions. Both buttons disable while the commit mutation is in flight.
 */
export const BulkCommitToolbar: React.FC<BulkCommitToolbarProps> = ({
  dirtyCount,
  selectedCount,
  isPending,
  onDiscard,
  onCommit,
}) => {
  const dirtyLabel =
    dirtyCount === 0
      ? 'No changes'
      : `${dirtyCount} ${dirtyCount === 1 ? 'row modified' : 'rows modified'}`;

  return (
    <div
      className="sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-3 border-t bg-card px-4 py-3"
      role="region"
      aria-label="Bulk edit commit toolbar"
    >
      <div className="flex items-center gap-3 text-sm">
        <span
          className={dirtyCount === 0 ? 'text-muted-foreground' : 'font-medium text-foreground'}
          aria-live="polite"
          aria-atomic="true"
        >
          {dirtyLabel}
        </span>
        {selectedCount > 0 && (
          <Badge variant="secondary" className="font-normal">
            {selectedCount} selected
          </Badge>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onDiscard}
          disabled={dirtyCount === 0 || isPending}
        >
          Discard Changes
        </Button>
        <Button
          type="button"
          onClick={onCommit}
          disabled={dirtyCount === 0 || isPending}
        >
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
          Save Updates
        </Button>
      </div>
    </div>
  );
};
