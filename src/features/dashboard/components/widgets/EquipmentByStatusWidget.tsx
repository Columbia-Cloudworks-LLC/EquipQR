import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Forklift } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import EmptyState from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useEquipmentByStatus } from '@/features/dashboard/hooks/useDashboardWidgets';

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
  const { currentOrganization } = useOrganization();
  const organizationId = currentOrganization?.id;

  const { data, isLoading } = useEquipmentByStatus(organizationId);

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
              >
                {data.map((entry) => (
                  <Cell key={entry.status} fill={getStatusColor(entry.status)} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number, name: string) => [`${value} units`, name]}
              />
              <Legend
                verticalAlign="bottom"
                height={30}
                iconType="circle"
                iconSize={8}
                formatter={(value: string) => <span className="text-xs">{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState
            icon={Forklift}
            title="No equipment data"
            description="Equipment will appear once added."
            className="py-6"
          />
        )}
      </CardContent>
    </Card>
  );
};

export default EquipmentByStatusWidget;
