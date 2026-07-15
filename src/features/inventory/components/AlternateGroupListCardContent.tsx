import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CardDescription } from '@/components/ui/card';
import type { AlternateGroupMemberSummary } from '@/features/inventory/types/inventory';

type AlternateGroupListCardContentProps = {
  description: string | null;
  notes: string | null;
  memberSummaries: AlternateGroupMemberSummary[] | undefined;
};

export function AlternateGroupListCardContent({
  description,
  notes,
  memberSummaries,
}: AlternateGroupListCardContentProps) {
  const hasMembers = (memberSummaries?.length ?? 0) > 0;

  if (hasMembers && memberSummaries) {
    return (
      <ScrollArea className="h-18">
        <ul className="space-y-1 pr-2" aria-label="Parts in group">
          {memberSummaries.map((member) => (
            <li
              key={member.id}
              className="flex items-baseline justify-between gap-2 text-sm leading-snug"
            >
              <span className="truncate font-medium">{member.name}</span>
              {member.sku ? (
                <span className="shrink-0 text-xs text-muted-foreground font-mono">
                  {member.sku}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      </ScrollArea>
    );
  }

  return (
    <>
      {description ? (
        <CardDescription className="line-clamp-2">{description}</CardDescription>
      ) : null}
      {notes ? (
        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{notes}</p>
      ) : null}
      {!description && !notes ? (
        <p className="text-sm text-muted-foreground italic">No description</p>
      ) : null}
    </>
  );
}
