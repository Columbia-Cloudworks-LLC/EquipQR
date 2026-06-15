import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** Full-width primary actions on mobile; inline on sm+. */
export const integrationActionButtonClassName = 'w-full justify-center sm:w-auto sm:justify-start';

type IntegrationCardLayoutProps = {
  children: ReactNode;
  className?: string;
};

export function IntegrationCardLayout({ children, className }: IntegrationCardLayoutProps) {
  return (
    <div
      className={cn(
        'space-y-3 py-4 first:pt-0 last:pb-0',
        'sm:rounded-lg sm:border sm:border-border/60 sm:bg-card sm:p-4 sm:first:pt-4 sm:last:pb-4',
        className,
      )}
    >
      {children}
    </div>
  );
}

type IntegrationCardHeaderProps = {
  title: ReactNode;
  badge?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
};

export function IntegrationCardHeader({
  title,
  badge,
  description,
  actions,
}: IntegrationCardHeaderProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {typeof title === 'string' ? <p className="text-sm font-medium">{title}</p> : title}
            {badge}
          </div>
          {description ? (
            <div className="text-xs text-muted-foreground [&_p]:mt-0.5 [&_p+p]:mt-1">
              {description}
            </div>
          ) : null}
        </div>

        {actions ? (
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:max-w-none sm:flex-row sm:flex-wrap sm:items-center sm:justify-end sm:shrink-0">
            {actions}
          </div>
        ) : null}
      </div>
    </div>
  );
}

type IntegrationInlineActionsProps = {
  children: ReactNode;
  className?: string;
};

/** Horizontal action row that stays on one line when possible (e.g. Disconnect + external link). */
export function IntegrationInlineActions({ children, className }: IntegrationInlineActionsProps) {
  return (
    <div className={cn('flex w-full items-center gap-2 sm:w-auto', className)}>
      {children}
    </div>
  );
}
