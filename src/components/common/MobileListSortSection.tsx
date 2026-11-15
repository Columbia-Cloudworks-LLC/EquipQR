import React from 'react';
import {
  ListSortFieldControls,
  type ListSortFieldControlsProps,
} from '@/components/common/ListSortFieldControls';

/** "Sort by" block for the body of a MobileListPersonalizationSheet. */
export function MobileListSortSection(props: ListSortFieldControlsProps) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Sort by
      </p>
      <ListSortFieldControls {...props} />
    </div>
  );
}
