
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, Clock, AlertTriangle, Calendar } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getLatestCompletedPM } from '@/features/pm-templates/services/preventativeMaintenanceService';

interface EquipmentPMInfoProps {
  equipmentId: string;
  organizationId: string;
  onViewPM?: (pmId: string) => void;
}

const EquipmentPMInfo: React.FC<EquipmentPMInfoProps> = ({
  equipmentId,
  organizationId,
  onViewPM
}) => {
  const { data: latestPM, isLoading } = useQuery({
    queryKey: ['latestPM', organizationId, equipmentId],
    queryFn: () => getLatestCompletedPM(equipmentId),
    enabled: !!equipmentId && !!organizationId,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Preventative Maintenance (PM)</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="h-16 bg-muted animate-pulse rounded" />
        </CardContent>
      </Card>
    );
  }

  if (!latestPM) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            Preventative Maintenance (PM)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-muted-foreground">No preventative maintenance records found</p>
            <p className="text-sm text-muted-foreground mt-1">
              Create work orders with PM requirements to track maintenance history
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-600" />
            Latest Preventative Maintenance (PM)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Completed Date</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {new Date(latestPM.completed_at).toLocaleDateString()}
            </p>
          </div>
          
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Work Order</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {latestPM.work_order_title}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge className="bg-green-100 text-green-800">
            Completed
          </Badge>
          <span className="text-sm text-muted-foreground">
            {Math.floor((Date.now() - new Date(latestPM.completed_at).getTime()) / (1000 * 60 * 60 * 24))} days ago
          </span>
        </div>

        {onViewPM && (
          <div className="pt-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => onViewPM(latestPM.id)}
            >
              View PM Details
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EquipmentPMInfo;
