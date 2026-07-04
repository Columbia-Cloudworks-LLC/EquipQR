import React from 'react';
import {
  Camera,
  ClipboardList,
  Clock,
  Eye,
  ExternalLink,
  History,
  MapPin,
  Navigation,
  QrCode,
  User,
  Wrench,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import EmptyState from '@/components/ui/empty-state';
import ClickableAddress from '@/components/ui/ClickableAddress';
import { cn } from '@/lib/utils';
import {
  useEquipmentScans,
  useEquipmentScanFollowUps,
} from '@/features/equipment/hooks/useEquipment';
import { useEquipmentLocationHistory } from '@/features/equipment/hooks/useEquipmentLocationHistory';
import {
  getCoordinateHistoryRows,
  LOCATION_HISTORY_SOURCE_LABELS,
} from '@/features/equipment/services/equipmentLocationHistoryService';
import { useFormatTimestamp } from '@/hooks/useFormatTimestamp';
import { buildGoogleMapsUrlFromCoords } from '@/utils/effectiveLocation';
import {
  buildScanHistoryTimeline,
  type ScanHistoryAction,
} from '@/features/equipment/utils/scanHistoryTimeline';

interface EquipmentScanHistoryTabProps {
  equipmentId: string;
  organizationId: string;
  scanLocationCollectionEnabled?: boolean;
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
  scanLocationCollectionEnabled = true,
}) => {
  const { data: scans = [], isLoading: scansLoading, error: scansError } =
    useEquipmentScans(organizationId, equipmentId);
  const {
    data: followUps = [],
    isLoading: followUpsLoading,
    error: followUpsError,
  } = useEquipmentScanFollowUps(organizationId, equipmentId);
  const {
    data: locationHistory = [],
    isLoading: historyLoading,
    error: historyError,
  } = useEquipmentLocationHistory(organizationId, equipmentId);
  const { formatDateTime, formatRelative } = useFormatTimestamp();

  const isLoading = scansLoading || followUpsLoading || historyLoading;
  const error = scansError ?? followUpsError ?? historyError;
  const coordinateHistory = getCoordinateHistoryRows(locationHistory);

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

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold">Location Movement</h3>
          <p className="text-sm text-muted-foreground">
            Coordinate-backed location history for reconstructing equipment movement over time.
          </p>
        </div>

        {!scanLocationCollectionEnabled ? (
          <EmptyState
            icon={MapPin}
            title="Scan GPS collection disabled"
            description="This organization has disabled scan location collection, so GPS movement history is not available."
          />
        ) : coordinateHistory.length === 0 ? (
          <EmptyState
            icon={MapPin}
            title="No coordinate history yet"
            description="GPS-backed scan or sync events will appear here when location coordinates are recorded."
          />
        ) : (
          <div className="space-y-3">
            {coordinateHistory.map((row) => {
              const label = LOCATION_HISTORY_SOURCE_LABELS[row.source];
              const address =
                row.formatted_address ||
                [row.address_street, row.address_city, row.address_state, row.address_country]
                  .filter(Boolean)
                  .join(', ') ||
                `${row.latitude}, ${row.longitude}`;

              return (
                <Card key={row.id}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{label}</Badge>
                          <span className="text-sm text-muted-foreground">
                            {formatRelative(row.created_at)}
                          </span>
                        </div>
                        <div className="flex items-start gap-2 text-sm">
                          <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                          {row.latitude != null && row.longitude != null ? (
                            <ClickableAddress
                              address={address}
                              lat={row.latitude}
                              lng={row.longitude}
                              className="text-sm"
                            />
                          ) : (
                            <span className="text-muted-foreground">{address}</span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {formatDateTime(row.created_at)}
                        </p>
                      </div>
                      {row.latitude != null && row.longitude != null && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="shrink-0"
                          onClick={() =>
                            window.open(
                              buildGoogleMapsUrlFromCoords(row.latitude!, row.longitude!),
                              '_blank',
                              'noopener,noreferrer',
                            )
                          }
                        >
                          <Navigation className="h-3.5 w-3.5 mr-1" />
                          Directions
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <section className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold">Scan History</h3>
          <p className="text-sm text-muted-foreground">
            {scans.length} {scans.length === 1 ? 'scan' : 'scans'} recorded
          </p>
        </div>

        {timeline.length === 0 ? (
          <EmptyState
            icon={QrCode}
            title="No scan history yet"
            description="When this equipment's QR code is scanned, who scanned it, where, and what they did will appear here."
          />
        ) : (
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
                                    : 'bg-muted text-muted-foreground',
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
        )}
      </section>
    </div>
  );
};

export default EquipmentScanHistoryTab;
