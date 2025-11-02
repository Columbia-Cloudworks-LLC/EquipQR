
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { QrCode, Calendar, MapPin, User, Clock, MessageSquare } from 'lucide-react';
import { useSyncScansByEquipment } from '@/services/syncDataService';

interface EquipmentScansTabProps {
  equipmentId: string;
  organizationId: string;
}

const EquipmentScansTab: React.FC<EquipmentScansTabProps> = ({
  equipmentId,
  organizationId,
}) => {
  const { data: scans = [], isLoading } = useSyncScansByEquipment(organizationId, equipmentId);
  const [timelineView, setTimelineView] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="h-16 bg-muted animate-pulse rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      return 'Less than an hour ago';
    } else if (diffInHours < 24) {
      return `${diffInHours} ${diffInHours === 1 ? 'hour' : 'hours'} ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays} ${diffInDays === 1 ? 'day' : 'days'} ago`;
    }
  };

  const ListViewContent = () => (
    <div className="space-y-4">
      {scans.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <QrCode className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No scans yet</h3>
            <p className="text-muted-foreground">
              No QR code scans have been recorded for this equipment yet.
            </p>
          </CardContent>
        </Card>
      ) : (
        scans.map((scan) => (
          <Card key={scan.id}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <QrCode className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="font-medium">{scan.scannedByName || 'Unknown User'}</div>
                    <div className="text-sm text-muted-foreground">
                      {formatTimeAgo(scan.scanned_at)}
                    </div>
                  </div>
                </div>
                <Badge variant="outline">
                  {new Date(scan.scanned_at).toLocaleString()}
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                {scan.location && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="font-medium">Location</div>
                      <div className="text-muted-foreground">{scan.location}</div>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="font-medium">Scan Time</div>
                    <div className="text-muted-foreground">
                      {new Date(scan.scanned_at).toLocaleDateString()} at {new Date(scan.scanned_at).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              </div>

              {scan.notes && (
                <div className="mt-4 pt-4 border-t">
                  <div className="flex items-start gap-2">
                    <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <div className="text-sm font-medium mb-1">Notes</div>
                      <div className="text-sm text-muted-foreground">{scan.notes}</div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );

  const TimelineViewContent = () => (
    <div className="relative">
      {scans.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No timeline events</h3>
            <p className="text-muted-foreground">
              No QR code scans have been recorded to display in timeline view.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Timeline line */}
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border"></div>
          
          {scans.map((scan) => (
            <div key={scan.id} className="relative flex gap-6">
              {/* Timeline dot */}
              <div className="relative z-10">
                <div className="w-3 h-3 bg-primary rounded-full border-2 border-background shadow-sm"></div>
              </div>
              
              {/* Content */}
              <div className="flex-1 pb-6">
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{scan.scannedByName || 'Unknown User'}</span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(scan.scanned_at).toLocaleString()}
                      </div>
                    </div>
                    
                    {scan.location && (
                      <div className="flex items-center gap-2 mb-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{scan.location}</span>
                      </div>
                    )}
                    
                    {scan.notes && (
                      <div className="mt-2 p-2 bg-muted/50 rounded text-sm">
                        {scan.notes}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">QR Code Scans</h3>
          <p className="text-sm text-muted-foreground">
            {scans.length} {scans.length === 1 ? 'scan' : 'scans'} recorded
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm">List</span>
          <Switch
            checked={timelineView}
            onCheckedChange={setTimelineView}
          />
          <span className="text-sm">Timeline</span>
        </div>
      </div>

      {/* Content */}
      {timelineView ? <TimelineViewContent /> : <ListViewContent />}
    </div>
  );
};

export default EquipmentScansTab;
