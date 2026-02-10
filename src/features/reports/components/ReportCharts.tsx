
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { ReportType } from '@/features/reports/types/reports';
import { Equipment, WorkOrder, DashboardStats } from '@/services/supabaseDataService';

interface ReportChartsProps {
  data: unknown[];
  type: ReportType;
  dashboardStats: DashboardStats | null;
}

const COLORS = ['#0088F2', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

const ReportCharts: React.FC<ReportChartsProps> = ({ data, type, dashboardStats }) => {
  const renderEquipmentCharts = (equipment: Equipment[]) => {
    const statusData = equipment.reduce((acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const statusChartData = Object.entries(statusData).map(([status, count]) => ({
      name: status.charAt(0).toUpperCase() + status.slice(1),
      value: count
    }));

    const locationData = equipment.reduce((acc, item) => {
      acc[item.location] = (acc[item.location] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const locationChartData = Object.entries(locationData).map(([location, count]) => ({
      name: location,
      count
    }));

    return (
      <div className="space-y-6">
        <div role="img" aria-label={`Pie chart showing equipment by status: ${statusChartData.map(d => `${d.name}: ${d.value}`).join(', ')}`}>
          <h3 className="text-lg font-semibold mb-4">Equipment by Status</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={statusChartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {statusChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div role="img" aria-label={`Bar chart showing equipment by location: ${locationChartData.map(d => `${d.name}: ${d.count}`).join(', ')}`}>
          <h3 className="text-lg font-semibold mb-4">Equipment by Location</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={locationChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  const renderWorkOrderCharts = (workOrders: WorkOrder[]) => {
    const statusData = workOrders.reduce((acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const statusChartData = Object.entries(statusData).map(([status, count]) => ({
      name: status.replace('_', ' ').charAt(0).toUpperCase() + status.slice(1).replace('_', ' '),
      value: count
    }));

    const priorityData = workOrders.reduce((acc, item) => {
      acc[item.priority] = (acc[item.priority] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const priorityChartData = Object.entries(priorityData).map(([priority, count]) => ({
      name: priority.charAt(0).toUpperCase() + priority.slice(1),
      count
    }));

    // Work orders over time - use correct property name
    const timeData = workOrders.reduce((acc, item) => {
      const month = new Date(item.created_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
      acc[month] = (acc[month] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const timeChartData = Object.entries(timeData).map(([month, count]) => ({
      month,
      count
    }));

    return (
      <div className="space-y-6">
        <div role="img" aria-label={`Pie chart showing work orders by status: ${statusChartData.map(d => `${d.name}: ${d.value}`).join(', ')}`}>
          <h3 className="text-lg font-semibold mb-4">Work Orders by Status</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={statusChartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {statusChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div role="img" aria-label={`Bar chart showing work orders by priority: ${priorityChartData.map(d => `${d.name}: ${d.count}`).join(', ')}`}>
          <h3 className="text-lg font-semibold mb-4">Work Orders by Priority</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={priorityChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#00C49F" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {timeChartData.length > 1 && (
          <div role="img" aria-label={`Line chart showing work orders over time: ${timeChartData.map(d => `${d.month}: ${d.count}`).join(', ')}`}>
            <h3 className="text-lg font-semibold mb-4">Work Orders Over Time</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={timeChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#FFBB28" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    );
  };

  const renderKPICharts = () => {
    if (!dashboardStats) return null;

    const kpiData = [
      { name: 'Total Equipment', value: dashboardStats.totalEquipment },
      { name: 'Active Equipment', value: dashboardStats.activeEquipment },
      { name: 'Maintenance Equipment', value: dashboardStats.maintenanceEquipment },
      { name: 'Total Work Orders', value: dashboardStats.totalWorkOrders }
    ];

    return (
      <div role="img" aria-label={`Bar chart showing key performance indicators: ${kpiData.map(d => `${d.name}: ${d.value}`).join(', ')}`}>
        <h3 className="text-lg font-semibold mb-4">Key Performance Indicators</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={kpiData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="value" fill="#8884d8" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  };

  if (data.length === 0 && type !== 'kpis') {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        No data available for the selected filters
      </div>
    );
  }

  switch (type) {
    case 'equipment':
      return renderEquipmentCharts(data as Equipment[]);
    case 'workorders':
      return renderWorkOrderCharts(data as WorkOrder[]);
    case 'kpis':
      return renderKPICharts();
    default:
      return (
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          Chart visualization for {type} coming soon
        </div>
      );
  }
};

export default ReportCharts;
