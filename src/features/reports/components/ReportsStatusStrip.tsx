import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Building2, ShieldCheck, Cloud, Gauge } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ReportsStatusStripProps {
  organizationName: string;
  canExport: boolean;
  isGoogleWorkspaceConnected: boolean;
  rateLimitSummary?: string;
  className?: string;
}

/**
 * Compact mission-control status strip for the Fleet Export Console.
 */
export const ReportsStatusStrip: React.FC<ReportsStatusStripProps> = ({
  organizationName,
  canExport,
  isGoogleWorkspaceConnected,
  rateLimitSummary = 'Rate-limited',
  className,
}) => {
  return (
    <div
      className={cn(
        'grid gap-3 sm:grid-cols-2 lg:grid-cols-4 border border-border/60 bg-card/80 p-3 sm:p-4 texture-grain',
        className,
      )}
      aria-label="Export console status"
    >
      <StatusItem
        icon={<Building2 className="h-3.5 w-3.5" aria-hidden />}
        label="ORGANIZATION"
        value={organizationName}
      />
      <StatusItem
        icon={<ShieldCheck className="h-3.5 w-3.5" aria-hidden />}
        label="EXPORT ACCESS"
        value={
          canExport ? (
            <Badge variant="secondary" className="font-mono text-[10px] uppercase tracking-wide">
              Owner / Admin
            </Badge>
          ) : (
            <span className="text-muted-foreground">Restricted</span>
          )
        }
      />
      <StatusItem
        icon={<Cloud className="h-3.5 w-3.5" aria-hidden />}
        label="GOOGLE WORKSPACE"
        value={
          isGoogleWorkspaceConnected ? (
            <Badge variant="secondary" className="font-mono text-[10px] uppercase tracking-wide text-success">
              Connected
            </Badge>
          ) : (
            <span className="text-muted-foreground">Not connected</span>
          )
        }
      />
      <StatusItem
        icon={<Gauge className="h-3.5 w-3.5" aria-hidden />}
        label="RATE LIMIT"
        value={
          <span className="font-tabular text-xs text-muted-foreground">
            {rateLimitSummary}
          </span>
        }
      />
    </div>
  );
};

interface StatusItemProps {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}

const StatusItem: React.FC<StatusItemProps> = ({ icon, label, value }) => (
  <div className="flex min-w-0 flex-col gap-1">
    <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
      {icon}
      <span>{label}</span>
    </div>
    <div className="truncate text-sm font-medium">{value}</div>
  </div>
);
