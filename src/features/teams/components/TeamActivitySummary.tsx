import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Activity, Forklift, ClipboardList, AlertTriangle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TeamEquipmentStats, TeamWorkOrderStats } from '@/features/teams/services/teamStatsService';

interface TeamActivitySummaryProps {
  teamId: string;
  equipmentStats: TeamEquipmentStats | undefined;
  workOrderStats: TeamWorkOrderStats | undefined;
  isLoading: boolean;
}

interface StatItemProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  href?: string;
  variant?: 'default' | 'warning' | 'success';
  isLoading?: boolean;
}

const StatItem: React.FC<StatItemProps> = ({
  label,
  value,
  icon,
  href,
  variant = 'default',
  isLoading = false,
}) => {
  const content = (
    <div
      className={cn(
        'flex flex-col items-center p-4 rounded-lg border transition-all duration-fast',
        href && 'hover:bg-muted/50 hover:border-primary/30 cursor-pointer',
        variant === 'warning' && value > 0 && 'border-warning bg-warning/5',
        variant === 'success' && 'border-success/30 bg-success/5'
      )}
    >
      <div className={cn(
        'mb-2 p-2 rounded-full',
        variant === 'default' && 'bg-primary/10 text-primary',
        variant === 'warning' && value > 0 && 'bg-warning/20 text-warning',
        variant === 'success' && 'bg-success/20 text-success'
      )}>
        {icon}
      </div>
      {isLoading ? (
        <Skeleton className="h-8 w-12 mb-1" />
      ) : (
        <span className={cn(
          'text-2xl font-bold',
          variant === 'warning' && value > 0 && 'text-warning'
        )}>
          {value}
        </span>
      )}
      <span className="text-sm text-muted-foreground text-center">{label}</span>
    </div>
  );

  if (href && !isLoading) {
    return (
      <Link to={href} className="block">
        {content}
      </Link>
    );
  }

  return content;
};

/**
 * Activity summary component showing key team metrics
 */
const TeamActivitySummary: React.FC<TeamActivitySummaryProps> = ({
  teamId,
  equipmentStats,
  workOrderStats,
  isLoading,
}) => {
  return (
    <Card className="shadow-elevation-2">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Activity className="h-5 w-5" />
          Team Activity
        </CardTitle>
        <CardDescription>
          Overview of equipment and work orders
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Equipment Count */}
          <StatItem
            label="Total Equipment"
            value={equipmentStats?.totalEquipment ?? 0}
            icon={<Forklift className="h-5 w-5" />}
            href={`/dashboard/equipment?team=${teamId}`}
            isLoading={isLoading}
          />
          
          {/* Active Work Orders */}
          <StatItem
            label="Active Work Orders"
            value={workOrderStats?.activeWorkOrders ?? 0}
            icon={<ClipboardList className="h-5 w-5" />}
            href={`/dashboard/work-orders?team=${teamId}`}
            isLoading={isLoading}
          />
          
          {/* Overdue Work Orders */}
          <StatItem
            label="Overdue"
            value={workOrderStats?.overdueWorkOrders ?? 0}
            icon={<AlertTriangle className="h-5 w-5" />}
            href={`/dashboard/work-orders?team=${teamId}&date=overdue`}
            variant="warning"
            isLoading={isLoading}
          />
          
          {/* Completed Work Orders */}
          <StatItem
            label="Completed"
            value={workOrderStats?.completedWorkOrders ?? 0}
            icon={<CheckCircle className="h-5 w-5" />}
            variant="success"
            isLoading={isLoading}
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default TeamActivitySummary;
