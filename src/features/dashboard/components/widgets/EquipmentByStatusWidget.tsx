import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
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
        <CardDescription className="text-xs">Fleet breakdown by equipment status</CardDescription>
      </CardHeader>
      <CardContent className="pb-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <Skeleton className="h-32 w-32 rounded-full" />
          </div>
        ) : data && data.length > 0 ? (
          <div aria-label="Equipment status distribution chart">
            <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={data}
                dataKey="count"
                nameKey="label"
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={70}
                paddingAngle={2}
                onClick={(entry) => handleSliceClick(entry.status)}
              >
                {data.map((entry, index) => (
                  <Cell
                    key={entry.status}
                    fill={getStatusColor(entry.status)}
                    stroke="hsl(var(--background))"
                    strokeWidth={1.5}
                    strokeDasharray={index % 2 === 0 ? '0' : '3 2'}
                    style={{ cursor: 'pointer' }}
                  />
                ))}
              </Pie>
              <Tooltip content={tooltipContent} />
              <Legend
                verticalAlign="bottom"
                height={30}
                iconType="circle"
                iconSize={8}
                formatter={(value: string, _entry, index) => (
                  <span className="text-xs">{value} ({data[index]?.count ?? 0})</span>
                )}
              />
            </PieChart>
            </ResponsiveContainer>
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
