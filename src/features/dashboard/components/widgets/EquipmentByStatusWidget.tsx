import React from 'react';
import { PieChart, Pie, Cell, Tooltip } from 'recharts';
import { Forklift } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import EmptyState from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useEquipmentByStatus } from '@/features/dashboard/hooks/useDashboardWidgets';
import { useNavigate } from 'react-router-dom';

const STATUS_COLORS: Record<string, string> = {
  active: 'hsl(var(--chart-1))',
  maintenance: 'hsl(var(--chart-2))',
  retired: 'hsl(var(--chart-3))',
  inactive: 'hsl(var(--chart-4))',
  decommissioned: 'hsl(var(--chart-5))',
};

function getStatusColor(status: string): string {
  return STATUS_COLORS[status] || 'hsl(var(--muted))';
}

interface CenterLabelProps {
  cx: number;
  cy: number;
  total: number;
}

const CenterLabel: React.FC<CenterLabelProps> = ({ cx, cy, total }) => (
  <>
    <text
      x={cx}
      y={cy - 6}
      textAnchor="middle"
      dominantBaseline="middle"
      className="fill-foreground"
      style={{ fontSize: '1.25rem', fontWeight: 700, fill: 'hsl(var(--foreground))' }}
    >
      {total}
    </text>
    <text
      x={cx}
      y={cy + 13}
      textAnchor="middle"
      dominantBaseline="middle"
      style={{ fontSize: '0.65rem', fill: 'hsl(var(--muted-foreground))', textTransform: 'uppercase', letterSpacing: '0.05em' }}
    >
      Total
    </text>
  </>
);

/**
 * Donut chart showing equipment breakdown by status (active, maintenance, retired, etc.).
 */
const EquipmentByStatusWidget: React.FC = () => {
  const navigate = useNavigate();
  const { currentOrganization } = useOrganization();
  const organizationId = currentOrganization?.id;

  const { data, isLoading } = useEquipmentByStatus(organizationId);
  const totalCount = React.useMemo(
    () => (data ?? []).reduce((sum, item) => sum + item.count, 0),
    [data]
  );

  const handleSliceClick = React.useCallback(
    (status: string) => {
      navigate(`/dashboard/equipment?status=${status}`);
    },
    [navigate]
  );

  const tooltipContent = React.useCallback(
    ({ active, payload }: { active?: boolean; payload?: Array<{ value: number; payload: { label: string; count: number } }> }) => {
      if (!active || !payload || payload.length === 0) return null;
      const datum = payload[0]?.payload;
      if (!datum) return null;
      const percentage = totalCount > 0 ? Math.round((datum.count / totalCount) * 100) : 0;
      return (
        <div className="rounded-md border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md">
          <p className="font-medium">{datum.label}</p>
          <p>{datum.count} equipment ({percentage}%)</p>
        </div>
      );
    },
    [totalCount]
  );

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Forklift className="h-4 w-4" />
          Equipment by Status
        </CardTitle>
        <CardDescription className="opacity-75">Fleet breakdown by equipment status</CardDescription>
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
          <div aria-label="Equipment status distribution chart">
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
                        {data.map((entry) => (
                          <Cell
                            key={entry.status}
                            fill={getStatusColor(entry.status)}
                            stroke="hsl(var(--card))"
                            strokeWidth={3}
                            style={{ cursor: 'pointer' }}
                          />
                        ))}
                        <CenterLabel cx={80} cy={80} total={totalCount} />
                      </Pie>
                      <Tooltip content={tooltipContent} />
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
                          style={{ backgroundColor: getStatusColor(entry.status) }}
                        />
                        <span className="flex-1 truncate capitalize text-muted-foreground">{entry.label}</span>
                        <span className="font-medium tabular-nums">{entry.count}</span>
                        <span className="w-8 text-right text-muted-foreground tabular-nums">{pct}%</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            <p className="sr-only">
              Equipment status summary: {data.map((entry) => `${entry.label} ${entry.count}`).join(', ')}.
            </p>
          </div>
        ) : (
          <EmptyState
            icon={Forklift}
            title="No equipment yet"
            description="Add equipment to see a status breakdown here."
            className="py-6"
          />
        )}
      </CardContent>
    </Card>
  );
};

export default EquipmentByStatusWidget;
