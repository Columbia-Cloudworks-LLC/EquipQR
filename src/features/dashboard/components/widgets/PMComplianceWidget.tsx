import React from 'react';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip } from 'recharts';
import { ClipboardCheck, AlertTriangle, CheckCircle, Clock, Info } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import EmptyState from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useEquipmentByStatus, usePMCompliance } from '@/features/dashboard/hooks/useDashboardWidgets';
import { useOrgEquipmentPMStatuses } from '@/features/equipment/hooks/useEquipmentPMStatus';
import { getPMComplianceLevel } from '@/features/equipment/hooks/useEquipmentPMStatus';
import { PM_INTERVALS_ENABLED } from '@/lib/flags';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useNavigate } from 'react-router-dom';

interface CenterLabelProps {
  cx: number;
  cy: number;
  pct: number;
}

const CenterLabel: React.FC<CenterLabelProps> = ({ cx, cy, pct }) => (
  <>
    <text
      x={cx}
      y={cy - 6}
      textAnchor="middle"
      dominantBaseline="middle"
      style={{ fontSize: '1.25rem', fontWeight: 700, fill: 'hsl(var(--foreground))' }}
    >
      {pct}%
    </text>
    <text
      x={cx}
      y={cy + 13}
      textAnchor="middle"
      dominantBaseline="middle"
      style={{ fontSize: '0.65rem', fill: 'hsl(var(--muted-foreground))', textTransform: 'uppercase', letterSpacing: '0.05em' }}
    >
      Compliant
    </text>
  </>
);

const PMComplianceWidget: React.FC = () => {
  const navigate = useNavigate();
  const { currentOrganization } = useOrganization();
  const organizationId = currentOrganization?.id;

  const { data, isLoading } = usePMCompliance(organizationId);
  const { data: equipmentByStatus } = useEquipmentByStatus(organizationId);
  const { data: pmStatuses } = useOrgEquipmentPMStatuses(organizationId);
  const totalCount = React.useMemo(
    () => (data ?? []).reduce((sum, item) => sum + item.count, 0),
    [data]
  );

  const compliancePct = React.useMemo(() => {
    if (!data || totalCount === 0) return 0;
    const compliant = data.find((d) => d.status === 'completed' || d.label?.toLowerCase().includes('compli'))?.count ?? 0;
    return Math.round((compliant / totalCount) * 100);
  }, [data, totalCount]);

  const intervalSummary = React.useMemo(() => {
    if (!pmStatuses || pmStatuses.length === 0) return null;
    let current = 0;
    let dueSoon = 0;
    let overdue = 0;
    for (const s of pmStatuses) {
      const level = getPMComplianceLevel(s);
      if (level === 'overdue') overdue++;
      else if (level === 'due_soon') dueSoon++;
      else if (level === 'current') current++;
    }
    return { current, dueSoon, overdue, total: current + dueSoon + overdue };
  }, [pmStatuses]);

  const totalEquipmentCount = React.useMemo(
    () => (equipmentByStatus ?? []).reduce((sum, item) => sum + item.count, 0),
    [equipmentByStatus]
  );
  const nonIntervalTrackedCount = Math.max((totalEquipmentCount || 0) - (intervalSummary?.total || 0), 0);

  const handleSliceClick = React.useCallback(
    (status: string) => {
      if (status === 'overdue') {
        navigate('/dashboard/work-orders?date=overdue');
        return;
      }
      navigate(`/dashboard/work-orders?status=${status}`);
    },
    [navigate]
  );

  const tooltipContent = React.useCallback(
    ({ active, payload }: { active?: boolean; payload?: Array<{ payload: { label: string; count: number } }> }) => {
      if (!active || !payload || payload.length === 0) return null;
      const datum = payload[0]?.payload;
      if (!datum) return null;
      const percentage = totalCount > 0 ? Math.round((datum.count / totalCount) * 100) : 0;
      return (
        <div className="rounded-md border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md">
          <p className="font-medium">{datum.label}</p>
          <p>{datum.count} work orders ({percentage}%)</p>
        </div>
      );
    },
    [totalCount]
  );

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <ClipboardCheck className="h-4 w-4" />
          PM Compliance
        </CardTitle>
        <CardDescription className="opacity-75">Preventive maintenance schedule status</CardDescription>
      </CardHeader>
      <CardContent className="pb-4">
        {isLoading ? (
          <div className="flex items-center gap-6">
            <Skeleton className="h-32 w-32 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-2">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-4 w-full" />)}
            </div>
          </div>
        ) : data && data.length > 0 ? (
          <div aria-label="Preventive maintenance compliance distribution chart">
            <div className="flex items-center justify-center">
              <div className="flex items-center gap-6">
                <div className="h-40 w-40 flex-shrink-0">
                    <PieChart width={160} height={160}>
                      <Pie
                        data={data}
                        dataKey="count"
                        nameKey="label"
                        cx={80}
                        cy={80}
                        innerRadius={48}
                        outerRadius={70}
                        paddingAngle={2}
                        onClick={(entry) => handleSliceClick(entry.status)}
                      >
                        {data.map((entry, index) => (
                          <Cell
                            key={entry.status}
                            fill={entry.color}
                            stroke="hsl(var(--card))"
                            strokeWidth={3}
                            strokeDasharray={index % 2 === 0 ? '0' : '3 2'}
                            style={{ cursor: 'pointer' }}
                          />
                        ))}
                        <CenterLabel cx={80} cy={80} pct={compliancePct} />
                      </Pie>
                      <RechartsTooltip content={tooltipContent} />
                    </PieChart>
                </div>
                <div className="min-w-0 w-44 space-y-1.5">
                  {data.map((entry) => {
                    const pct = totalCount > 0 ? Math.round((entry.count / totalCount) * 100) : 0;
                    return (
                      <button
                        key={entry.status}
                        onClick={() => handleSliceClick(entry.status)}
                        className="flex w-full items-center gap-2 rounded px-1 py-1.5 text-left text-xs transition-colors hover:bg-muted/50 touch-manipulation"
                      >
                        <span
                          className="h-2 w-2 flex-shrink-0 rounded-full"
                          style={{ backgroundColor: entry.color }}
                        />
                        <span className="flex-1 truncate text-muted-foreground">{entry.label}</span>
                        <span className="font-medium tabular-nums">{entry.count}</span>
                        <span className="w-8 text-right text-muted-foreground tabular-nums">{pct}%</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            <p className="sr-only">
              PM compliance summary: {data.map((entry) => `${entry.label} ${entry.count}`).join(', ')}.
            </p>
          </div>
        ) : (
          <EmptyState
            icon={ClipboardCheck}
            title="No PM data"
            description="Create PM templates or work orders to track compliance trends."
            className="py-6"
          />
        )}

        {PM_INTERVALS_ENABLED && intervalSummary && intervalSummary.total > 0 && (
          <div className="mt-3 border-t pt-3 space-y-1.5">
            <div className="mb-2 flex items-center gap-1.5">
              <p className="text-xs font-medium text-muted-foreground">Interval Tracking ({intervalSummary.total} equipment)</p>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" className="text-muted-foreground transition-colors hover:text-foreground" aria-label="Explain interval tracking">
                      <Info className="h-3.5 w-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs text-xs">
                    Equipment with hour or mileage-based PM schedules. Equipment without interval tracking typically follows date-based PM schedules.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <CheckCircle className="h-3.5 w-3.5 text-success flex-shrink-0" />
              <span>Current</span>
              <span className="ml-auto font-medium">{intervalSummary.current}</span>
            </div>
            {intervalSummary.dueSoon > 0 && (
              <div className="flex items-center gap-2 text-xs">
                <Clock className="h-3.5 w-3.5 text-warning flex-shrink-0" />
                <span>Due Soon</span>
                <span className="ml-auto font-medium">{intervalSummary.dueSoon}</span>
              </div>
            )}
            {intervalSummary.overdue > 0 && (
              <div className="flex items-center gap-2 text-xs text-destructive">
                <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                <span>Overdue</span>
                <span className="ml-auto font-medium">{intervalSummary.overdue}</span>
              </div>
            )}
            {nonIntervalTrackedCount > 0 && (
              <p className="pt-1 text-[11px] text-muted-foreground">
                {nonIntervalTrackedCount} equipment use date-based tracking.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PMComplianceWidget;
