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

