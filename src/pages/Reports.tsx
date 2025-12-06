
import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, FileText } from 'lucide-react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useEquipment } from '@/hooks/useEquipment';
import { useWorkOrders } from '@/hooks/useWorkOrders';
import { useDashboard } from '@/hooks/useQueries';
import ReportFilters from '@/components/reports/ReportFilters';
import ReportCharts from '@/components/reports/ReportCharts';
import ReportExport from '@/components/reports/ReportExport';
import Page from '@/components/layout/Page';

export type ReportType = 'equipment' | 'maintenance' | 'workorders' | 'kpis';

export interface ReportFilters {
  type: ReportType;
  dateRange: {
    from: Date | undefined;
    to: Date | undefined;
  };
  status?: string;
  location?: string;
  priority?: string;
}

const Reports = () => {
  const { currentOrganization } = useOrganization();
  const [filters, setFilters] = useState<ReportFilters>({
    type: 'equipment',
    dateRange: { from: undefined, to: undefined }
  });

  const { data: equipment = [], isLoading: equipmentLoading } = useEquipment(currentOrganization?.id);
  const { data: workOrders = [], isLoading: workOrdersLoading } = useWorkOrders(currentOrganization?.id);
  const { data: dashboardStats, isLoading: statsLoading } = useDashboard(currentOrganization?.id);

  const isLoading = equipmentLoading || workOrdersLoading || statsLoading;

  const filteredData = useMemo(() => {
    switch (filters.type) {
      case 'equipment':
        return equipment.filter(item => {
          if (filters.status && item.status !== filters.status) return false;
          if (filters.location && !item.location.toLowerCase().includes(filters.location.toLowerCase())) return false;
          return true;
        });
      case 'workorders':
        return workOrders.filter(item => {
          if (filters.status && item.status !== filters.status) return false;
          if (filters.priority && item.priority !== filters.priority) return false;
          if (filters.dateRange.from) {
            const itemDate = new Date(item.createdDate);
            if (itemDate < filters.dateRange.from) return false;
          }
          if (filters.dateRange.to) {
            const itemDate = new Date(item.createdDate);
            if (itemDate > filters.dateRange.to) return false;
          }
          return true;
        });
      default:
        return [];
    }
  }, [filters, equipment, workOrders]);

  if (!currentOrganization) {
    return (
      <Page maxWidth="7xl" padding="responsive">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
            <p className="text-muted-foreground">
              Please select an organization to view reports.
            </p>
          </div>
        </div>
      </Page>
    );
  }

  if (isLoading) {
    return (
      <Page maxWidth="7xl" padding="responsive">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
            <p className="text-muted-foreground">Loading reports...</p>
          </div>
          <div className="grid gap-6 lg:grid-cols-4">
            <div className="lg:col-span-1">
              <Card>
                <CardContent className="pt-6">
                  <div className="h-64 bg-muted animate-pulse rounded" />
                </CardContent>
              </Card>
            </div>
            <div className="lg:col-span-3">
              <Card>
                <CardContent className="pt-6">
                  <div className="h-96 bg-muted animate-pulse rounded" />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </Page>
    );
  }

  return (
    <Page maxWidth="7xl" padding="responsive">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
        <p className="text-muted-foreground">
          Generate and export detailed reports for your fleet management data.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        <div className="lg:col-span-1">
          <ReportFilters 
            filters={filters} 
            onFiltersChange={setFilters}
            equipment={equipment}
            workOrders={workOrders}
          />
        </div>

        <div className="lg:col-span-3 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Data Visualization
                </CardTitle>
                <CardDescription>
                  Visual representation of your {filters.type} data
                </CardDescription>
              </div>
              <ReportExport 
                data={filteredData}
                filters={filters}
                organizationName={currentOrganization.name}
                dashboardStats={dashboardStats || undefined}
              />
            </CardHeader>
            <CardContent>
              <ReportCharts 
                data={filteredData}
                type={filters.type}
                dashboardStats={dashboardStats || undefined}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Data Summary
              </CardTitle>
              <CardDescription>
                Summary of filtered results ({filteredData.length} items)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                {filters.type === 'equipment' && `${filteredData.length} equipment items match your criteria`}
                {filters.type === 'workorders' && `${filteredData.length} work orders match your criteria`}
                {filters.type === 'maintenance' && 'Maintenance history data'}
                {filters.type === 'kpis' && 'Key performance indicators summary'}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      </div>
    </Page>
  );
};

export default Reports;
