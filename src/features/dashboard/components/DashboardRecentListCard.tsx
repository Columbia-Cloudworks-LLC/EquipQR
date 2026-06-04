import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, type LucideIcon } from 'lucide-react';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const ROW_LINK_CLASS = cn(
  'flex items-center gap-3 py-2.5 pl-3 pr-2 -mx-3 transition-colors',
  'hover:bg-muted/60 dark:hover:bg-white/[0.04]',
  'active:bg-white/5 dark:active:bg-white/[0.03]',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
);

export interface DashboardRecentListCardProps<T> {
  sectionId: string;
  heading: string;
  description: string;
  icon: LucideIcon;
  items: T[];
  isLoading: boolean;
  hasMore: boolean;
  viewAllHref: string;
  viewAllLabel: string;
  emptyMessage: string;
  getItemKey: (item: T) => string;
  getItemHref: (item: T) => string;
  renderStatusStripe: (item: T) => React.ReactNode;
  renderTitle: (item: T) => React.ReactNode;
  renderSubtitle: (item: T) => React.ReactNode;
  renderBadge: (item: T) => React.ReactNode;
}

export function DashboardRecentListCard<T>({
  sectionId,
  heading,
  description,
  icon: Icon,
  items,
  isLoading,
  hasMore,
  viewAllHref,
  viewAllLabel,
  emptyMessage,
  getItemKey,
  getItemHref,
  renderStatusStripe,
  renderTitle,
  renderSubtitle,
  renderBadge,
}: DashboardRecentListCardProps<T>) {
  return (
    <section aria-labelledby={sectionId}>
      <Card>
        <CardHeader>
          <CardTitle as="h2" id={sectionId} className="flex items-center gap-2 text-base">
            <Icon className="h-4 w-4" />
            {heading}
          </CardTitle>
          <CardDescription className="opacity-75">{description}</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-12 animate-pulse rounded bg-muted" />
              ))}
            </div>
          ) : items.length > 0 ? (
            <div className="divide-y divide-border/50">
              {items.map((item) => (
                <Link key={getItemKey(item)} to={getItemHref(item)} className={ROW_LINK_CLASS}>
                  {renderStatusStripe(item)}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium leading-tight">{renderTitle(item)}</p>
                    <p className="text-xs text-muted-foreground truncate">{renderSubtitle(item)}</p>
                  </div>
                  {renderBadge(item)}
                  <ChevronRight
                    className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/50"
                    aria-hidden
                  />
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-2">{emptyMessage}</p>
          )}
        </CardContent>
        {hasMore && !isLoading && (
          <CardFooter className="pt-0 border-t border-border/50">
            <Link
              to={viewAllHref}
              className="inline-flex items-center gap-1 min-h-[44px] text-sm font-medium text-primary hover:text-primary/80 hover:underline active:text-primary/70 transition-colors touch-manipulation"
            >
              {viewAllLabel}
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </CardFooter>
        )}
      </Card>
    </section>
  );
}
