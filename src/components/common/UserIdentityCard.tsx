import React from 'react';
import { Bot } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useResolvedAvatarUrl } from '@/hooks/useResolvedAvatarUrl';
import { cn } from '@/lib/utils';

export type UserIdentityCardProps = {
  name: string;
  avatarUrl?: string | null;
  subtitle?: string;
  size?: 'sm' | 'md';
  className?: string;
};

function getPersonInitials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed || trimmed === 'System') {
    return '?';
  }

  const initials = trimmed
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  return initials.slice(0, 2) || '?';
}

const sizeClasses = {
  sm: {
    root: 'gap-2 px-2 py-1',
    avatar: 'h-6 w-6',
    fallback: 'text-[10px]',
    name: 'text-xs',
    subtitle: 'text-[11px]',
    systemIcon: 'h-3 w-3',
  },
  md: {
    root: 'gap-2.5 px-2.5 py-1.5',
    avatar: 'h-8 w-8',
    fallback: 'text-xs',
    name: 'text-sm',
    subtitle: 'text-xs',
    systemIcon: 'h-3.5 w-3.5',
  },
} as const;

export function UserIdentityCard({
  name,
  avatarUrl,
  subtitle,
  size = 'sm',
  className,
}: UserIdentityCardProps) {
  const isSystem = name === 'System';
  const styles = sizeClasses[size];
  const { data: resolvedAvatarUrl } = useResolvedAvatarUrl(isSystem ? null : avatarUrl);
  const displayName = name.trim() || 'Unknown';

  return (
    <div
      className={cn(
        'inline-flex max-w-full items-center rounded-md border border-border/60 bg-muted/30',
        styles.root,
        className,
      )}
      data-testid="user-identity-card"
    >
      {isSystem ? (
        <div
          className={cn(
            'flex shrink-0 items-center justify-center rounded-full border border-border bg-background text-muted-foreground',
            styles.avatar,
          )}
          aria-hidden="true"
        >
          <Bot className={styles.systemIcon} />
        </div>
      ) : (
        <Avatar className={cn('shrink-0', styles.avatar)}>
          {resolvedAvatarUrl ? (
            <AvatarImage src={resolvedAvatarUrl} alt="" />
          ) : null}
          <AvatarFallback className={styles.fallback}>{getPersonInitials(displayName)}</AvatarFallback>
        </Avatar>
      )}

      <div className="min-w-0">
        <p className={cn('truncate font-medium leading-tight text-foreground', styles.name)}>
          {displayName}
        </p>
        {subtitle ? (
          <p className={cn('truncate text-muted-foreground', styles.subtitle)}>{subtitle}</p>
        ) : null}
      </div>
    </div>
  );
}
