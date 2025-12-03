import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clipboard, Wrench } from 'lucide-react';
import { WorkOrderData, PMData, PermissionLevels } from '@/types/workOrderDetails';
import { usePMTemplates } from '@/hooks/usePMTemplates';

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
              pmData.status === 'completed' ? 'bg-green-100 text-green-800' :
              pmData.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
              'bg-yellow-100 text-yellow-800'
            }>
              {pmData.status.replace('_', ' ').toUpperCase()}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            This work order includes preventative maintenance tasks that will be completed by the assigned technician.
          </p>
          {pmData.status === 'completed' && pmData.completed_at && (
            <p className="text-sm text-green-600">
              PM completed on {new Date(pmData.completed_at).toLocaleDateString()}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};