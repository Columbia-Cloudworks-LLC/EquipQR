import React from 'react';
import {
  Camera,
  ClipboardList,
  Clock,
  Eye,
  ExternalLink,
  History,
  MapPin,
  QrCode,
  User,
  Wrench,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import EmptyState from '@/components/ui/empty-state';
import { cn } from '@/lib/utils';
import {
  useEquipmentScans,
  useEquipmentScanFollowUps,
} from '@/features/equipment/hooks/useEquipment';
import { useFormatTimestamp } from '@/hooks/useFormatTimestamp';
import {
  buildScanHistoryTimeline,
  type ScanHistoryAction,
} from '@/features/equipment/utils/scanHistoryTimeline';

interface EquipmentScanHistoryTabProps {
  equipmentId: string;
  organizationId: string;
}

function ActionIcon({ action }: { action: ScanHistoryAction }) {
  switch (action.eventType) {
    case 'dashboard_opened':
      return <ExternalLink className="h-4 w-4" />;
    case 'pm_work_order_created':
      return <Wrench className="h-4 w-4" />;
    case 'generic_work_order_created':
      return <ClipboardList className="h-4 w-4" />;
    case 'working_hours_updated':
      return <Clock className="h-4 w-4" />;
    case 'note_image_added':
      return <Camera className="h-4 w-4" />;
    default:
      return <Eye className="h-4 w-4" />;
  }
}

const EquipmentScanHistoryTab: React.FC<EquipmentScanHistoryTabProps> = ({
  equipmentId,
  organizationId,
}) => {
  const { data: scans = [], isLoading: scansLoading, error: scansError } =
    useEquipmentScans(organizationId, equipmentId);
  const {
    data: followUps = [],
    isLoading: followUpsLoading,
    error: followUpsError,
  } = useEquipmentScanFollowUps(organizationId, equipmentId);
  const { formatDateTime, formatRelative } = useFormatTimestamp();

  const isLoading = scansLoading || followUpsLoading;
  const error = scansError ?? followUpsError;

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[0, 1, 2].map((i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="h-20 animate-pulse rounded bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        icon={History}
        title="Failed to load scan history"
        description={error instanceof Error ? error.message : 'An error occurred'}
      />
    );
  }

  const timeline = buildScanHistoryTimeline(scans, followUps);

  if (timeline.length === 0) {
    return (
      <EmptyState
        icon={QrCode}
        title="No scan history yet"
        description="When this equipment's QR code is scanned, who scanned it, where, and what they did will appear here."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Scan History</h3>
        <p className="text-sm text-muted-foreground">
          {scans.length} {scans.length === 1 ? 'scan' : 'scans'} recorded
        </p>
      </div>

      <div className="relative space-y-6">
        {timeline.map((entry) => (
          <div key={entry.scan.id} className="relative flex gap-4">
            <div className="relative z-10 flex flex-col items-center">
              <div className="rounded-lg bg-primary/10 p-2 text-primary">
                <QrCode className="h-5 w-5" />
              </div>
            </div>

            <div className="flex-1 pb-2">
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium">
                          {entry.scan.scannedByName || 'Unknown User'}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {formatRelative(entry.scan.scanned_at)}
                        </div>
                      </div>
                    </div>
                    <Badge variant="outline" className="shrink-0">
                      {formatDateTime(entry.scan.scanned_at)}
                    </Badge>
                  </div>

                  {entry.scan.location && (
                    <div className="mt-3 flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">{entry.scan.location}</span>
                    </div>
                  )}

                  <div className="mt-4 border-t pt-4">
                    <ul className="space-y-3">
                      {entry.actions.map((action) => (
                        <li key={action.id} className="flex items-start gap-3">
                          <div
                            className={cn(
                              'mt-0.5 rounded-md p-1.5',
                              action.eventType
                                ? 'bg-info/15 text-info'
                                : 'bg-muted text-muted-foreground'
                            )}
                          >
                            <ActionIcon action={action} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium">{action.label}</div>
                            {action.detail && (
                              <div className="text-sm text-muted-foreground">
                                {action.detail}
                              </div>
                            )}
                            <div className="mt-0.5 text-xs text-muted-foreground">
                              {action.performedByName || 'Unknown User'}
                              {' · '}
                              {formatDateTime(action.performedAt)}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EquipmentScanHistoryTab;
