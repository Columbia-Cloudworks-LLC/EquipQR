import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { PartsManagerMarkIcon } from '@/components/icons/PartsManagerMarkIcon';
import { PartsConsumerMarkIcon } from '@/components/icons/PartsConsumerMarkIcon';
import { QuickBooksMarkIcon } from '@/components/icons/QuickBooksMarkIcon';
import type { UnifiedMember } from '@/features/organization/utils/buildUnifiedMembers';
import {
  getPartsConsumerPermissionDisplay,
  getPartsManagerPermissionDisplay,
  getQuickBooksPermissionDisplay,
  shouldShowMobilePermissionSection,
  type UnifiedMemberPermissionContext,
} from '@/features/organization/utils/unifiedMemberPermissionRules';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

type UnifiedMemberPermissionRowsProps = {
  member: UnifiedMember;
  context: UnifiedMemberPermissionContext;
  isPartsManager: boolean;
  isPartsConsumer: boolean;
  quickBooksPending: boolean;
  partsManagerPending: boolean;
  partsConsumerPending: boolean;
  onQuickBooksToggle: (userId: string, canManage: boolean) => void;
  onPartsManagerToggle: (userId: string, isPartsManager: boolean) => void;
  onPartsConsumerToggle: (userId: string, isPartsConsumer: boolean) => void;
  layout?: 'mobile' | 'desktop';
};

function PermissionLabel({
  htmlFor,
  icon,
  label,
  description,
}: {
  htmlFor?: string;
  icon: ReactNode;
  label: string;
  description?: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <span className="flex min-h-10 w-6 shrink-0 items-center justify-center">{icon}</span>
      <div className="min-w-0 space-y-0.5 py-0.5">
        {htmlFor ? (
          <Label htmlFor={htmlFor} className="text-xs font-medium leading-none cursor-pointer">
            {label}
          </Label>
        ) : (
          <p className="text-xs font-medium leading-none">{label}</p>
        )}
        {description && (
          <p className="text-[11px] text-muted-foreground leading-snug">{description}</p>
        )}
      </div>
    </div>
  );
}

function PermissionToggleRow({
  id,
  icon,
  label,
  description,
  checked,
  disabled,
  onCheckedChange,
  compact,
}: {
  id: string;
  icon: ReactNode;
  label: string;
  description?: string;
  checked: boolean;
  disabled?: boolean;
  onCheckedChange: (checked: boolean) => void;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-3',
        compact ? 'min-h-[40px]' : 'rounded-md border border-border/60 bg-muted/20 px-3 py-2 min-h-[44px]',
      )}
    >
      <PermissionLabel htmlFor={id} icon={icon} label={label} description={description} />
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        aria-label={label}
        className="shrink-0"
      />
    </div>
  );
}

function DesktopPermissionControl({
  icon,
  label,
  children,
}: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center gap-2">
      <span title={label}>{icon}</span>
      {children}
    </div>
  );
}

export function UnifiedMemberQuickBooksControl({
  member,
  context,
  quickBooksPending,
  onQuickBooksToggle,
  layout = 'desktop',
}: Pick<
  UnifiedMemberPermissionRowsProps,
  'member' | 'context' | 'quickBooksPending' | 'onQuickBooksToggle' | 'layout'
>) {
  const display = getQuickBooksPermissionDisplay(member, context);
  const icon = <QuickBooksMarkIcon />;

  if (display === 'hidden') {
    return null;
  }

  if (display === 'always') {
    if (layout === 'mobile') {
      return (
        <div className="flex items-center justify-between gap-3 min-h-[44px] rounded-md border border-border/60 bg-muted/20 px-3 py-2">
          <PermissionLabel
            icon={icon}
            label="QuickBooks"
            description="Always enabled for owners"
          />
          <span className="text-xs text-muted-foreground italic shrink-0">Always</span>
        </div>
      );
    }

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <DesktopPermissionControl icon={icon} label="QuickBooks">
            <span className="text-xs text-muted-foreground italic">Always</span>
          </DesktopPermissionControl>
        </TooltipTrigger>
        <TooltipContent>
          <p>Owners always have QuickBooks management permission</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  if (display === 'not-applicable') {
    return layout === 'desktop' ? (
      <DesktopPermissionControl icon={icon} label="QuickBooks">
        <span className="text-xs text-muted-foreground">—</span>
      </DesktopPermissionControl>
    ) : null;
  }

  const switchControl = (
    <Switch
      checked={member.canManageQuickBooks ?? false}
      onCheckedChange={(checked) => {
        if (!member.userId) return;
        onQuickBooksToggle(member.userId, checked);
      }}
      disabled={quickBooksPending}
      aria-label="Toggle QuickBooks management permission"
    />
  );

  if (layout === 'desktop') {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <DesktopPermissionControl icon={icon} label="QuickBooks">
            {switchControl}
          </DesktopPermissionControl>
        </TooltipTrigger>
        <TooltipContent>
          <p>{member.canManageQuickBooks ? 'Revoke QuickBooks access' : 'Grant QuickBooks access'}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <PermissionToggleRow
      id={`qb-${member.id}`}
      icon={icon}
      label="QuickBooks"
      description="Manage integration and export invoices"
      checked={member.canManageQuickBooks ?? false}
      disabled={quickBooksPending}
      onCheckedChange={(checked) => {
        if (!member.userId) return;
        onQuickBooksToggle(member.userId, checked);
      }}
    />
  );
}

export function UnifiedMemberPartsManagerControl({
  member,
  context,
  isPartsManager,
  partsManagerPending,
  onPartsManagerToggle,
  layout = 'desktop',
}: Pick<
  UnifiedMemberPermissionRowsProps,
  'member' | 'context' | 'isPartsManager' | 'partsManagerPending' | 'onPartsManagerToggle' | 'layout'
>) {
  const display = getPartsManagerPermissionDisplay(member, context);
  const icon = <PartsManagerMarkIcon />;

  if (display === 'hidden') {
    return null;
  }

  if (display === 'not-applicable') {
    return layout === 'desktop' ? (
      <DesktopPermissionControl icon={icon} label="Parts manager">
        <span className="text-xs text-muted-foreground">—</span>
      </DesktopPermissionControl>
    ) : null;
  }

  if (layout === 'desktop') {
    return (
      <DesktopPermissionControl icon={icon} label="Parts manager">
        <Switch
          checked={isPartsManager}
          onCheckedChange={(checked) => {
            if (!member.userId) return;
            onPartsManagerToggle(member.userId, checked);
          }}
          disabled={partsManagerPending}
          aria-label="Toggle parts manager permission"
        />
      </DesktopPermissionControl>
    );
  }

  return (
    <PermissionToggleRow
      id={`pm-${member.id}`}
      icon={icon}
      label="Parts manager"
      description="Create and edit inventory items"
      checked={isPartsManager}
      disabled={partsManagerPending}
      onCheckedChange={(checked) => {
        if (!member.userId) return;
        onPartsManagerToggle(member.userId, checked);
      }}
    />
  );
}

export function UnifiedMemberPartsConsumerControl({
  member,
  context,
  isPartsConsumer,
  partsConsumerPending,
  onPartsConsumerToggle,
  layout = 'desktop',
}: Pick<
  UnifiedMemberPermissionRowsProps,
  | 'member'
  | 'context'
  | 'isPartsConsumer'
  | 'partsConsumerPending'
  | 'onPartsConsumerToggle'
  | 'layout'
>) {
  const display = getPartsConsumerPermissionDisplay(member, context);
  const icon = <PartsConsumerMarkIcon />;

  if (display === 'hidden') {
    return null;
  }

  if (display === 'not-applicable') {
    return layout === 'desktop' ? (
      <DesktopPermissionControl icon={icon} label="Parts consumer">
        <span className="text-xs text-muted-foreground">—</span>
      </DesktopPermissionControl>
    ) : null;
  }

  if (layout === 'desktop') {
    return (
      <DesktopPermissionControl icon={icon} label="Parts consumer">
        <Switch
          checked={isPartsConsumer}
          onCheckedChange={(checked) => {
            if (!member.userId) return;
            onPartsConsumerToggle(member.userId, checked);
          }}
          disabled={partsConsumerPending}
          aria-label="Toggle parts consumer permission"
        />
      </DesktopPermissionControl>
    );
  }

  return (
    <PermissionToggleRow
      id={`pc-${member.id}`}
      icon={icon}
      label="Parts consumer"
      description="View inventory, part lookup, and alternates"
      checked={isPartsConsumer}
      disabled={partsConsumerPending}
      onCheckedChange={(checked) => {
        if (!member.userId) return;
        onPartsConsumerToggle(member.userId, checked);
      }}
    />
  );
}

export function UnifiedMemberPermissionRows({
  member,
  context,
  isPartsManager,
  isPartsConsumer,
  quickBooksPending,
  partsManagerPending,
  partsConsumerPending,
  onQuickBooksToggle,
  onPartsManagerToggle,
  onPartsConsumerToggle,
  layout = 'mobile',
}: UnifiedMemberPermissionRowsProps) {
  if (layout === 'desktop') {
    return null;
  }

  if (!shouldShowMobilePermissionSection(member, context)) {
    return null;
  }

  return (
    <div className="space-y-2 pt-1 border-t border-border/60">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        Permissions
      </p>
      <div className="space-y-2">
        <UnifiedMemberQuickBooksControl
          member={member}
          context={context}
          quickBooksPending={quickBooksPending}
          onQuickBooksToggle={onQuickBooksToggle}
          layout="mobile"
        />
        <UnifiedMemberPartsManagerControl
          member={member}
          context={context}
          isPartsManager={isPartsManager}
          partsManagerPending={partsManagerPending}
          onPartsManagerToggle={onPartsManagerToggle}
          layout="mobile"
        />
        <UnifiedMemberPartsConsumerControl
          member={member}
          context={context}
          isPartsConsumer={isPartsConsumer}
          partsConsumerPending={partsConsumerPending}
          onPartsConsumerToggle={onPartsConsumerToggle}
          layout="mobile"
        />
      </div>
    </div>
  );
}
