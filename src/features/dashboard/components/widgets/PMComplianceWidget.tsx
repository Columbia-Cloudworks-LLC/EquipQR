import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { ClipboardCheck } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import EmptyState from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useOrganization } from '@/contexts/OrganizationContext';
import { supabase } from '@/integrations/supabase/client';

const STATUS_CONFIG = {
  completed: { label: 'Completed', color: 'hsl(var(--chart-1))' },
  in_progress: { label: 'In Progress', color: 'hsl(var(--chart-2))' },
  pending: { label: 'Pending', color: 'hsl(var(--chart-3))' },
  cancelled: { label: 'Cancelled', color: 'hsl(var(--chart-4))' },
  overdue: { label: 'Overdue', color: 'hsl(var(--destructive))' },
} as const;

interface PMStatusCount {
  status: string;
  count: number;
  label: string;
  color: string;
}

/**
 * Donut chart showing PM schedule compliance breakdown.
 * Queries work orders that originated from PM templates and groups by status.
 */
const PMComplianceWidget: React.FC = () => {
  const { currentOrganization } = useOrganization();
  const organizationId = currentOrganization?.id;

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-pm-compliance', organizationId],
    queryFn: async (): Promise<PMStatusCount[]> => {
      if (!organizationId) return [];

      // Query PM work orders from the last 2 years to limit data transfer
      const twoYearsAgo = new Date();
      twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
      const cutoff = twoYearsAgo.toISOString();

      const { data: rows, error } = await supabase
        .from('work_orders')
        .select('id, status')
        .eq('organization_id', organizationId)
        .not('pm_template_id', 'is', null)
        .gte('created_at', cutoff);

      if (error) throw error;

      // Check for overdue: pending or in_progress WOs past due date
      const { data: overdueRows } = await supabase
        .from('work_orders')
        .select('id')
        .eq('organization_id', organizationId)
        .not('pm_template_id', 'is', null)
        .in('status', ['pending', 'submitted', 'assigned', 'in_progress'])
        .lt('due_date', new Date().toISOString())
        .gte('created_at', cutoff);

      const overdueIds = new Set((overdueRows ?? []).map((r) => r.id));

      const counts = new Map<string, number>();
      for (const row of rows ?? []) {
        // If this row is overdue, count it as 'overdue' instead of its original status
        if (overdueIds.has(row.id)) {
          counts.set('overdue', (counts.get('overdue') ?? 0) + 1);
        } else {
          const s = row.status ?? 'unknown';
          counts.set(s, (counts.get(s) ?? 0) + 1);
        }
      }

      return Array.from(counts.entries())
        .filter(([, count]) => count > 0)
        .map(([status, count]) => ({
          status,
          count,
          label: STATUS_CONFIG[status as keyof typeof STATUS_CONFIG]?.label ?? status,
          color: STATUS_CONFIG[status as keyof typeof STATUS_CONFIG]?.color ?? 'hsl(var(--muted))',
        }));
    },
    enabled: !!organizationId,
    staleTime: 60 * 1000,
  });

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <ClipboardCheck className="h-4 w-4" />
          PM Compliance
        </CardTitle>
        <CardDescription className="text-xs">Preventive maintenance schedule status</CardDescription>
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
                  <Cell key={entry.status} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number, name: string) => [`${value} WOs`, name]}
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
            icon={ClipboardCheck}
            title="No PM data"
            description="Preventive maintenance data will appear when PM templates are used."
            className="py-6"
          />
        )}
      </CardContent>
    </Card>
  );
};

export default PMComplianceWidget;
