import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clipboard, Wrench } from 'lucide-react';
import { WorkOrderData, PMData, PermissionLevels } from '@/features/work-orders/types/workOrderDetails';
import { usePMTemplates } from '@/features/pm-templates/hooks/usePMTemplates';

interface WorkOrderDetailsPMInfoProps {
  workOrder: WorkOrderData;
  pmData: PMData;
  permissionLevels: PermissionLevels;
}

export const WorkOrderDetailsPMInfo: React.FC<WorkOrderDetailsPMInfoProps> = ({
  workOrder,
  pmData,
  permissionLevels
}) => {
  const { data: allTemplates = [] } = usePMTemplates();
  
  // Find the template name if template_id exists
  const templateName = pmData?.template_id 
    ? allTemplates.find(t => t.id === pmData.template_id)?.name 
    : null;

  if (!workOrder.has_pm || !permissionLevels.isRequestor || permissionLevels.isManager || !pmData) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clipboard className="h-5 w-5" />
          Preventative Maintenance
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* PM Template Name */}
          {templateName && (
            <div className="flex items-center gap-2">
              <Wrench className="h-4 w-4 text-muted-foreground" />
              <div>
                <span className="text-sm font-medium">Template: </span>
                <span className="text-sm text-muted-foreground">{templateName}</span>
              </div>
            </div>
          )}
          
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">PM Status:</span>
            <Badge className={
              pmData.status === 'completed' ? 'bg-success/20 text-success' :
              pmData.status === 'in_progress' ? 'bg-info/20 text-info' :
              'bg-warning/20 text-warning'
            }>
              {pmData.status.replace('_', ' ').toUpperCase()}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            This work order includes preventative maintenance tasks that will be completed by the assigned technician.
          </p>
          {pmData.status === 'completed' && pmData.completed_at && (
            <p className="text-sm text-success">
              PM completed on {new Date(pmData.completed_at).toLocaleDateString()}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};


