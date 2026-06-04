import React from 'react';
import { Forklift } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import EmptyState from '@/components/ui/empty-state';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useEquipmentByStatus } from '@/features/dashboard/hooks/useDashboardWidgets';
import { useNavigate } from 'react-router-dom';

import {
  createDonutTooltipContent,
  DonutWidgetChartSkeleton,
  DonutWidgetDesktopChart,
  DonutWidgetMobileBreakdown,
  type DonutChartDatum,
} from './dashboardDonutChartShared';

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

  const chartData = React.useMemo<DonutChartDatum[] | undefined>(
    () =>
      data?.map((entry) => ({
        status: entry.status,
        label: entry.label,
        count: entry.count,
        color: getStatusColor(entry.status),
      })),
    [data]
  );

  const handleSliceClick = React.useCallback(
    (status: string) => {
      navigate(`/dashboard/equipment?status=${status}`);
    },
    [navigate]
  );

  const tooltipContent = React.useMemo(
    () =>
      createDonutTooltipContent(totalCount, (count, percentage) =>
        `${count} equipment (${percentage}%)`
      ),
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
          <DonutWidgetChartSkeleton />
        ) : chartData && chartData.length > 0 ? (
          <div aria-label="Equipment status distribution chart">
            <DonutWidgetMobileBreakdown
              data={chartData}
              totalCount={totalCount}
              mobileTestId="equipment-status-mobile-summary"
              onSliceClick={handleSliceClick}
              mobileSummary={
                <p className="text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">{totalCount}</span> assets · tap a row to filter
                </p>
              }
            />
            <DonutWidgetDesktopChart
              data={chartData}
              totalCount={totalCount}
              tooltipContent={tooltipContent}
              onSliceClick={handleSliceClick}
              centerLabel={<CenterLabel cx={80} cy={80} total={totalCount} />}
            />
            <p className="sr-only">
              Equipment status summary: {chartData.map((entry) => `${entry.label} ${entry.count}`).join(', ')}.
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
