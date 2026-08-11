import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SegmentedProgress } from '@/components/ui/segmented-progress';
import { Skeleton } from '@/components/ui/skeleton';
import type { LatestCompletedPMDetails } from '@/features/pm-templates/services/preventativeMaintenanceService';
import type { PMChecklistItem } from '@/features/pm-templates/services/preventativeMaintenanceService';
import { createSegmentsForSection } from '@/utils/pmChecklistHelpers';
import { persistDashboardOrganizationSelection } from '@/utils/organizationSelection';
import { useFormatTimestamp } from '@/hooks/useFormatTimestamp';

function parseChecklistData(raw: unknown): PMChecklistItem[] {
  try {
    let parsed: unknown = raw;
    if (typeof raw === 'string') {
      parsed = JSON.parse(raw);
    }
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is PMChecklistItem =>
        item !== null &&
        typeof item === 'object' &&
        typeof (item as PMChecklistItem).id === 'string' &&
        typeof (item as PMChecklistItem).title === 'string' &&
        typeof (item as PMChecklistItem).section === 'string'
    );
  } catch {
    return [];
  }
}

function countWarnings(items: PMChecklistItem[]): number {
  return items.filter((item) => {
    const c = item.condition;
    return c === 2 || c === 3 || c === 4 || c === 5;
  }).length;
}

export interface EquipmentQRLastPMCardProps {
  organizationId: string;
  details: LatestCompletedPMDetails | null | undefined;
  isLoading: boolean;
  isError: boolean;
}

const EquipmentQRLastPMCard: React.FC<EquipmentQRLastPMCardProps> = ({
  organizationId,
  details,
  isLoading,
  isError,
}) => {
  const { formatDateTime, formatRelative } = useFormatTimestamp();

  if (isLoading) {
    return (
      <Card data-testid="equipment-qr-last-pm-loading">
        <CardHeader>
          <CardTitle className="text-base">Last completed PM</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card data-testid="equipment-qr-last-pm-error">
        <CardHeader>
          <CardTitle className="text-base">Last completed PM</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">PM history unavailable.</p>
        </CardContent>
      </Card>
    );
  }

  if (!details) {
    return (
      <Card data-testid="equipment-qr-last-pm-empty">
        <CardHeader>
          <CardTitle className="text-base">Last completed PM</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No completed PM records found.</p>
        </CardContent>
      </Card>
    );
  }

  const checklist = parseChecklistData(details.checklist_data);
  const sections = [...new Set(checklist.map((i) => i.section))].sort((a, b) => a.localeCompare(b));
  const warningCount = countWarnings(checklist);

  let completedDate: Date;
  try {
    completedDate = new Date(details.completed_at);
  } catch {
    completedDate = new Date();
  }

  const dateLabel = Number.isNaN(completedDate.getTime())
    ? details.completed_at
    : formatDateTime(completedDate);
  const relativeLabel = Number.isNaN(completedDate.getTime())
    ? ''
    : formatRelative(completedDate);

  const persistOrgBeforeDashboard = () => {
    persistDashboardOrganizationSelection(organizationId);
  };

  return (
    <Card data-testid="equipment-qr-last-pm-card">
      <CardHeader className="space-y-1">
        <CardTitle className="text-base">Last completed PM</CardTitle>
        <p className="text-xs text-muted-foreground">
          {dateLabel}
          {relativeLabel ? ` (${relativeLabel})` : ''}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm">
          <span className="font-medium">Completed by: </span>
          <span>{details.completed_by_name?.trim() || 'Technician not recorded'}</span>
        </div>
        <div className="text-sm">
          <span className="font-medium">Work order: </span>
          <span>{details.work_order_title?.trim() || 'PM work order'}</span>
        </div>
        {warningCount > 0 ? (
          <p className="text-sm text-warning" data-testid="equipment-qr-last-pm-warnings">
            {warningCount} checklist item{warningCount === 1 ? '' : 's'} flagged for review
          </p>
        ) : null}
        {sections.length > 0 ? (
          <div className="space-y-3">
            {sections.map((section) => {
              const sectionItems = checklist.filter((i) => i.section === section);
              const segments = createSegmentsForSection(sectionItems);
              return (
                <div key={section} className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground">{section}</p>
                  <SegmentedProgress segments={segments} />
                </div>
              );
            })}
          </div>
        ) : null}
        <Button asChild variant="outline" className="w-full sm:w-auto">
          <Link
            data-testid="equipment-qr-last-pm-open-wo"
            to={`/dashboard/work-orders/${details.work_order_id}?action=pm`}
            reloadDocument
            onClick={persistOrgBeforeDashboard}
          >
            Open PM work order
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
};

export default EquipmentQRLastPMCard;
