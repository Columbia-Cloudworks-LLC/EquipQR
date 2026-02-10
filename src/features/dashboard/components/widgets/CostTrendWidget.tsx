import React, { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { DollarSign } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import EmptyState from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useOrganization } from '@/contexts/OrganizationContext';
import { supabase } from '@/integrations/supabase/client';

type Period = 'weekly' | 'monthly';

interface CostDataPoint {
  period: string;
  totalCents: number;
}

function formatCurrency(cents: number): string {
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

/**
 * Line chart showing work order cost trends over time.
 * Toggle between weekly and monthly aggregation.
 */
const CostTrendWidget: React.FC = () => {
  const { currentOrganization } = useOrganization();
  const organizationId = currentOrganization?.id;
  const [period, setPeriod] = useState<Period>('monthly');

  const { data: rawData, isLoading } = useQuery({
    queryKey: ['dashboard-cost-trend', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];

      // Fetch costs joined to work_orders for org scoping
      // Limit to last 12 months to avoid transferring entire cost history
      const twelveMonthsAgo = new Date();
      twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

      const { data, error } = await supabase
        .from('work_order_costs')
        .select('total_price_cents, created_at, work_orders!inner(organization_id)')
        .eq('work_orders.organization_id', organizationId)
        .gte('created_at', twelveMonthsAgo.toISOString())
        .order('created_at', { ascending: true });

      if (error) throw error;
      return (data ?? []).map((row) => ({
        totalPriceCents: row.total_price_cents ?? 0,
        createdAt: row.created_at,
      }));
    },
    enabled: !!organizationId,
    staleTime: 60 * 1000,
  });

  const chartData = useMemo((): CostDataPoint[] => {
    if (!rawData || rawData.length === 0) return [];

    const buckets = new Map<string, number>();

    for (const row of rawData) {
      const date = new Date(row.createdAt);
      let key: string;

      if (period === 'weekly') {
        // ISO week: find Monday of the week
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        d.setDate(diff);
        key = d.toISOString().slice(0, 10);
      } else {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }

      buckets.set(key, (buckets.get(key) ?? 0) + row.totalPriceCents);
    }

    return Array.from(buckets.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12) // Show last 12 periods
      .map(([p, totalCents]) => ({ period: p, totalCents }));
  }, [rawData, period]);

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <DollarSign className="h-4 w-4" />
              Cost Trend
            </CardTitle>
            <CardDescription className="text-xs">Work order costs over time</CardDescription>
          </div>
          <div className="flex gap-1">
            <Button
              variant={period === 'weekly' ? 'default' : 'ghost'}
              size="sm"
              className="h-7 text-xs px-2"
              onClick={() => setPeriod('weekly')}
            >
              Week
            </Button>
            <Button
              variant={period === 'monthly' ? 'default' : 'ghost'}
              size="sm"
              className="h-7 text-xs px-2"
              onClick={() => setPeriod('monthly')}
            >
              Month
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pb-4">
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-40 w-full" />
          </div>
        ) : chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
              <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
              <XAxis
                dataKey="period"
                stroke="hsl(var(--muted-foreground))"
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                tickFormatter={(v: string) => {
                  if (period === 'monthly') {
                    const parts = v.split('-');
                    return `${parts[1]}/${parts[0].slice(2)}`;
                  }
                  return v.slice(5); // MM-DD for weekly
                }}
              />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                tickFormatter={(v: number) => formatCurrency(v)}
              />
              <Tooltip
                formatter={(value: number) => [formatCurrency(value), 'Total Cost']}
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  borderColor: 'hsl(var(--border))',
                  borderRadius: '6px',
                  color: 'hsl(var(--popover-foreground))',
                  fontSize: '12px',
                }}
              />
              <Line
                type="monotone"
                dataKey="totalCents"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--primary))', r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState
            icon={DollarSign}
            title="No cost data"
            description="Costs will appear when work orders have recorded expenses."
            className="py-6"
          />
        )}
      </CardContent>
    </Card>
  );
};

export default CostTrendWidget;
