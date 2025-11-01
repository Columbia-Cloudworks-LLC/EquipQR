
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User, UserMinus, Edit3, Clock } from 'lucide-react';
import WorkOrderAssignmentSelector from './WorkOrderAssignmentSelector';
import type { AssignmentWorkOrderContext } from '@/hooks/useWorkOrderContextualAssignment';

interface WorkOrderAssigneeDisplayProps {
  workOrder: AssignmentWorkOrderContext & {
    assigneeName?: string | null;
    assignee?: { name?: string | null } | null;
    assignee_id?: string | null;
    assigneeId?: string | null;
    acceptance_date?: string | null;
    acceptanceDate?: string | null;
  };
  organizationId: string;
  canManageAssignment: boolean;
  showEditControls?: boolean;
}

const WorkOrderAssigneeDisplay: React.FC<WorkOrderAssigneeDisplayProps> = ({
  workOrder,
  organizationId,
  canManageAssignment,
  showEditControls = true
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const assigneeId = workOrder.assignee_id ?? workOrder.assigneeId ?? null;
  const acceptanceDate = workOrder.acceptance_date ?? workOrder.acceptanceDate ?? null;

  const getAssignmentDisplay = () => {
    const assigneeName = workOrder.assigneeName || workOrder.assignee?.name;
    
    if (assigneeId && assigneeName) {
      return {
        type: 'user',
        name: assigneeName,
        icon: User,
        color: 'bg-blue-100 text-blue-800 border-blue-200'
      };
    }
    
    return {
      type: 'unassigned',
      name: 'Unassigned',
      icon: UserMinus,
      color: 'bg-gray-100 text-gray-800 border-gray-200'
    };
  };

  const assignment = getAssignmentDisplay();
  const IconComponent = assignment.icon;

  if (isEditing && canManageAssignment) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Change Assignment</CardTitle>
        </CardHeader>
        <CardContent>
          <WorkOrderAssignmentSelector
            workOrder={workOrder}
            organizationId={organizationId}
            onCancel={() => setIsEditing(false)}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center justify-between">
          Assignment
          {canManageAssignment && showEditControls && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="h-8 w-8 p-0"
            >
              <Edit3 className="h-4 w-4" />
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${assignment.color}`}>
            <IconComponent className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className="font-medium">{assignment.name}</div>
            <div className="text-sm text-muted-foreground">
              {assignment.type === 'user' && 'Individual Assignment'}
              {assignment.type === 'unassigned' && 'No one assigned'}
            </div>
          </div>
          <Badge className={assignment.color}>
            {assignment.type === 'user' && 'Assigned'}
            {assignment.type === 'unassigned' && 'Open'}
          </Badge>
        </div>

        {/* Assignment timing info */}
        {acceptanceDate && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2 border-t">
            <Clock className="h-4 w-4" />
            <span>
              Accepted {new Date(acceptanceDate).toLocaleDateString()}
            </span>
          </div>
        )}

        {/* Quick assignment action for managers */}
        {canManageAssignment && assignment.type === 'unassigned' && showEditControls && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditing(true)}
            className="w-full"
          >
            <User className="h-4 w-4 mr-2" />
            Assign Work Order
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default WorkOrderAssigneeDisplay;
