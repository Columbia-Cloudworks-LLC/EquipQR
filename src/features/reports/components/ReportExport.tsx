
import React from 'react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Download, FileText, FileSpreadsheet } from 'lucide-react';
import { ReportFilters } from '@/pages/Reports';
import { Equipment, WorkOrder, DashboardStats } from '@/services/supabaseDataService';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';

interface ReportExportProps {
  data: unknown[];
  filters: ReportFilters;
  organizationName: string;
  dashboardStats: DashboardStats | null;
}

const ReportExport: React.FC<ReportExportProps> = ({ 
  data, 
  filters, 
  organizationName, 
  dashboardStats 
}) => {
  const exportToCSV = () => {
    let csvContent = '';
    let headers: string[] = [];
    let rows: string[][] = [];

    switch (filters.type) {
      case 'equipment':
        headers = ['Name', 'Manufacturer', 'Model', 'Serial Number', 'Status', 'Location', 'Installation Date', 'Last Maintenance'];
        rows = (data as Equipment[]).map(item => [
          item.name,
          item.manufacturer,
          item.model,
          item.serial_number,
          item.status,
          item.location,
          item.installation_date,
          item.last_maintenance
        ]);
        break;
      case 'workorders':
        headers = ['Title', 'Status', 'Priority', 'Assignee', 'Team', 'Created Date', 'Due Date', 'Estimated Hours'];
        rows = (data as WorkOrder[]).map(item => [
          item.title,
          item.status,
          item.priority,
          item.assigneeName || '',
          item.teamName || '',
          item.created_date,
          item.due_date || '',
          item.estimated_hours?.toString() || ''
        ]);
        break;
      case 'kpis':
        headers = ['Metric', 'Value'];
        rows = dashboardStats ? [
          ['Total Equipment', dashboardStats.totalEquipment.toString()],
          ['Active Equipment', dashboardStats.activeEquipment.toString()],
          ['Maintenance Equipment', dashboardStats.maintenanceEquipment.toString()],
          ['Total Work Orders', dashboardStats.totalWorkOrders.toString()]
        ] : [];
        break;
      default:
        headers = ['Data'];
        rows = [['No data available']];
    }

    csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const fileName = `${organizationName}_${filters.type}_report_${new Date().toISOString().split('T')[0]}.csv`;
    saveAs(blob, fileName);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    let yPosition = 20;

    // Title
    doc.setFontSize(20);
    doc.text(`${organizationName} - ${filters.type.toUpperCase()} Report`, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 20;

    // Date
    doc.setFontSize(12);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 20;

    // Filters
    doc.setFontSize(14);
    doc.text('Filters Applied:', 20, yPosition);
    yPosition += 10;

    doc.setFontSize(10);
    doc.text(`Report Type: ${filters.type}`, 20, yPosition);
    yPosition += 6;

    if (filters.dateRange.from || filters.dateRange.to) {
      const fromDate = filters.dateRange.from?.toLocaleDateString() || 'Not set';
      const toDate = filters.dateRange.to?.toLocaleDateString() || 'Not set';
      doc.text(`Date Range: ${fromDate} - ${toDate}`, 20, yPosition);
      yPosition += 6;
    }

    if (filters.status) {
      doc.text(`Status: ${filters.status}`, 20, yPosition);
      yPosition += 6;
    }

    if (filters.location) {
      doc.text(`Location: ${filters.location}`, 20, yPosition);
      yPosition += 6;
    }

    if (filters.priority) {
      doc.text(`Priority: ${filters.priority}`, 20, yPosition);
      yPosition += 6;
    }

    yPosition += 10;

    // Summary
    doc.setFontSize(14);
    doc.text('Summary:', 20, yPosition);
    yPosition += 10;

    doc.setFontSize(10);
    
    if (filters.type === 'kpis' && dashboardStats) {
      doc.text(`Total Equipment: ${dashboardStats.totalEquipment}`, 20, yPosition);
      yPosition += 6;
      doc.text(`Active Equipment: ${dashboardStats.activeEquipment}`, 20, yPosition);
      yPosition += 6;
      doc.text(`Maintenance Equipment: ${dashboardStats.maintenanceEquipment}`, 20, yPosition);
      yPosition += 6;
      doc.text(`Total Work Orders: ${dashboardStats.totalWorkOrders}`, 20, yPosition);
      yPosition += 6;
    } else {
      doc.text(`Total Records: ${data.length}`, 20, yPosition);
      yPosition += 6;

      if (filters.type === 'equipment') {
        const equipment = data as Equipment[];
        const statusCounts = equipment.reduce((acc, item) => {
          acc[item.status] = (acc[item.status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        Object.entries(statusCounts).forEach(([status, count]) => {
          doc.text(`${status.charAt(0).toUpperCase() + status.slice(1)}: ${count}`, 20, yPosition);
          yPosition += 6;
        });
      }

      if (filters.type === 'workorders') {
        const workOrders = data as WorkOrder[];
        const statusCounts = workOrders.reduce((acc, item) => {
          acc[item.status] = (acc[item.status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        Object.entries(statusCounts).forEach(([status, count]) => {
          doc.text(`${status.replace('_', ' ').charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}: ${count}`, 20, yPosition);
          yPosition += 6;
        });
      }
    }

    const fileName = `${organizationName}_${filters.type}_report_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportToCSV}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToPDF}>
          <FileText className="h-4 w-4 mr-2" />
          Export as PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ReportExport;
