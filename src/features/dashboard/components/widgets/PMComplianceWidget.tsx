import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { ClipboardCheck, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import EmptyState from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useOrganization } from '@/contexts/OrganizationContext';
import { usePMCompliance } from '@/features/dashboard/hooks/useDashboardWidgets';
import { useOrgEquipmentPMStatuses } from '@/features/equipment/hooks/useEquipmentPMStatus';
import { getPMComplianceLevel } from '@/features/equipment/hooks/useEquipmentPMStatus';
import { PM_INTERVALS_ENABLED } from '@/lib/flags';

const PMComplianceWidget: React.FC = () => {
  const { currentOrganization } = useOrganization();
  const organizationId = currentOrganization?.id;

  const { data, isLoading } = usePMCompliance(organizationId);
  const { data: pmStatuses } = useOrgEquipmentPMStatuses(organizationId);

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

        {PM_INTERVALS_ENABLED && intervalSummary && intervalSummary.total > 0 && (
          <div className="mt-3 border-t pt-3 space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground mb-2">Interval Tracking ({intervalSummary.total} equipment)</p>
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
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PMComplianceWidget;
