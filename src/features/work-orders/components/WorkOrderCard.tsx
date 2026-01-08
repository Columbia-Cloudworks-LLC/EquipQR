/**
 * Unified Work Order Card Component
 * 
 * Single source of truth for work order card rendering.
 * Supports desktop and mobile variants through a single component.
 * 
 * @example
 * // Desktop variant (default)
 * <WorkOrderCard workOrder={order} onNavigate={handleNavigate} />
 * 
 * // Mobile variant
 * <WorkOrderCard workOrder={order} variant="mobile" onNavigate={handleNavigate} />
 * 
 * // Compact variant (for lists/grids)
 * <WorkOrderCard workOrder={order} variant="compact" onNavigate={handleNavigate} />
 */

import React, { memo, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Clock, User, Users, UserX, AlertTriangle, Loader2 } from 'lucide-react';
import { useUnifiedPermissions } from '@/hooks/useUnifiedPermissions';
import { useWorkOrderStatusUpdate } from '@/features/work-orders/hooks/useWorkOrderStatusUpdate';
import { useQuickWorkOrderAssignment } from '@/hooks/useQuickWorkOrderAssignment';
import { useWorkOrderContextualAssignment } from '@/features/work-orders/hooks/useWorkOrderContextualAssignment';
import { ensureWorkOrderData } from '@/features/work-orders/utils/workOrderTypeConversion';
import { 
  getStatusColor, 
  formatStatus, 
  formatDate,
  isOverdue 
} from '@/features/work-orders/utils/workOrderHelpers';
import WorkOrderCostSubtotal from './WorkOrderCostSubtotal';
import PMProgressIndicator from './PMProgressIndicator';
import { WorkOrderQuickActions } from './WorkOrderQuickActions';
import { WorkOrderAssignmentHover } from './WorkOrderAssignmentHover';
import type { WorkOrder, WorkOrderData } from '@/features/work-orders/types/workOrder';
import type { Database } from '@/integrations/supabase/types';
import type { AssignmentWorkOrderContext } from '@/features/work-orders/hooks/useWorkOrderContextualAssignment';

// ============================================
// Types
// ============================================

export type WorkOrderCardVariant = 'desktop' | 'mobile' | 'compact';

export interface WorkOrderCardProps {
  /** The work order data to display */
  workOrder: WorkOrder;
  /** Layout variant */
  variant?: WorkOrderCardVariant;
  /** Navigation handler */
  onNavigate?: (id: string) => void;
  /** Accept button click handler (mobile) */
  onAcceptClick?: (workOrder: WorkOrder) => void;
  /** Status update handler */
  onStatusUpdate?: (workOrderId: string, newStatus: string) => void;
  /** Assign button click handler */
  onAssignClick?: () => void;
  /** Reopen button click handler */
  onReopenClick?: () => void;
  /** Is the card in updating state */
  isUpdating?: boolean;
  /** Is the accept action in progress */
  isAccepting?: boolean;
}

// ============================================
// Helper Functions
// ============================================

const mapToWorkOrderData = (workOrder: WorkOrder): WorkOrderData => ({
  id: workOrder.id,
  title: workOrder.title,
  description: workOrder.description,
  equipmentId: workOrder.equipmentId ?? workOrder.equipment_id ?? '',
  organizationId: workOrder.organizationId ?? workOrder.organization_id ?? '',
  priority: workOrder.priority,
  status: workOrder.status,
  assigneeId: workOrder.assigneeId ?? workOrder.assignee_id,
  assigneeName: workOrder.assigneeName,
  teamId: workOrder.teamId ?? workOrder.team_id,
  teamName: workOrder.teamName ?? workOrder.equipmentTeamName,
  createdDate: workOrder.createdDate ?? workOrder.created_date ?? '',
  created_date: workOrder.created_date ?? workOrder.createdDate ?? '',
  dueDate: workOrder.dueDate ?? workOrder.due_date,
  estimatedHours: workOrder.estimatedHours ?? workOrder.estimated_hours,
  completedDate: workOrder.completedDate ?? workOrder.completed_date,
  equipmentName: workOrder.equipmentName,
  createdByName: workOrder.createdByName,
});

const getAssignmentContext = (workOrder: WorkOrder): AssignmentWorkOrderContext => ({
  ...workOrder,
  organization_id: workOrder.organization_id ?? workOrder.organizationId ?? '',
  equipment_id: workOrder.equipment_id ?? workOrder.equipmentId ?? '',
  equipmentTeamId: workOrder.equipmentTeamId ?? workOrder.team_id,
});

// ============================================
// Desktop Card Component
// ============================================

const DesktopCard: React.FC<WorkOrderCardProps> = memo(({ 
  workOrder, 
  onNavigate
}) => {
  const permissions = useUnifiedPermissions();
  const workOrderData = mapToWorkOrderData(workOrder);
  const detailedPermissions = permissions.workOrders.getDetailedPermissions(workOrderData);
  const assignmentContext = getAssignmentContext(workOrder);

  const equipmentTeamName = workOrder.equipmentTeamName ?? workOrder.teamName;
  const createdDateValue = workOrder.created_date ?? workOrder.createdDate;
  const dueDateValue = workOrder.due_date ?? workOrder.dueDate;
  const estimatedHoursValue = workOrder.estimated_hours ?? workOrder.estimatedHours;
  const completedDateValue = workOrder.completed_date ?? workOrder.completedDate;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{workOrder.title}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {workOrder.description}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground capitalize">
              {workOrder.priority} priority
            </span>
            <Badge className={getStatusColor(workOrder.status)}>
              {formatStatus(workOrder.status)}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="font-medium">Created</div>
              <div className="text-muted-foreground">
                {formatDate(createdDateValue)}
              </div>
            </div>
          </div>

          {dueDateValue && (
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="font-medium">Due Date</div>
                <div className={`text-muted-foreground ${isOverdue(dueDateValue, workOrder.status) ? 'text-destructive' : ''}`}>
                  {formatDate(dueDateValue)}
                  {isOverdue(dueDateValue, workOrder.status) && (
                    <AlertTriangle className="h-3 w-3 inline ml-1" />
                  )}
                </div>
              </div>
            </div>
          )}

          {equipmentTeamName && (
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="font-medium">Equipment Team</div>
                <div className="text-muted-foreground">{equipmentTeamName}</div>
              </div>
            </div>
          )}

          <WorkOrderAssignmentHover 
            workOrder={assignmentContext}
            disabled={!detailedPermissions.canEditAssignment}
          >
            <div className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 rounded p-1 -m-1 transition-colors">
              {workOrder.assigneeName ? (
                <>
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="font-medium">Assigned to</div>
                    <div className="text-muted-foreground">{workOrder.assigneeName}</div>
                  </div>
                </>
              ) : (
                <>
                  <UserX className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="font-medium">Assigned to</div>
                    <div className="text-muted-foreground">Unassigned</div>
                  </div>
                </>
              )}
            </div>
          </WorkOrderAssignmentHover>
        </div>

        {workOrder.has_pm && (
          <div className="mt-4 pt-4 border-t">
            <PMProgressIndicator 
              workOrderId={workOrder.id} 
              hasPM={workOrder.has_pm} 
            />
          </div>
        )}

        {estimatedHoursValue && (
          <div className={`mt-4 ${workOrder.has_pm ? '' : 'pt-4 border-t'}`}>
            <div className="text-sm">
              <span className="font-medium">Estimated time:</span> {estimatedHoursValue} hours
              {completedDateValue && (
                <span className="ml-4">
                  <span className="font-medium">Completed:</span> {formatDate(completedDateValue)}
                </span>
              )}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mt-4 pt-4 border-t">
          <div className="flex items-center gap-4">
            {detailedPermissions.canEdit && (
              <WorkOrderCostSubtotal 
                workOrderId={workOrder.id}
                className="text-sm"
              />
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <WorkOrderQuickActions
              workOrderId={workOrder.id}
              workOrderStatus={workOrder.status}
              equipmentTeamId={workOrder.equipmentTeamId ?? workOrder.team_id}
            />
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => onNavigate?.(workOrder.id)}
            >
              View Details
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

DesktopCard.displayName = 'DesktopCard';

// ============================================
// Mobile Card Component
// ============================================

const MobileCard: React.FC<WorkOrderCardProps> = memo(({
  workOrder,
  onAcceptClick,
  onStatusUpdate,
  isUpdating,
  isAccepting
}) => {
  const permissions = useUnifiedPermissions();
  const statusUpdateMutation = useWorkOrderStatusUpdate();
  const assignmentMutation = useQuickWorkOrderAssignment();
  const { assignmentOptions, isLoading: isLoadingAssignees } = useWorkOrderContextualAssignment(workOrder);

  const workOrderPermissions = permissions.workOrders.getDetailedPermissions(ensureWorkOrderData(workOrder));
  const canChangeStatus = workOrderPermissions.canChangeStatus;

  const handleStatusUpdate = (newStatus: Database["public"]["Enums"]["work_order_status"]) => {
    statusUpdateMutation.mutate({
      workOrderId: workOrder.id,
      newStatus
    }, {
      onSuccess: () => {
        onStatusUpdate?.(workOrder.id, newStatus);
      }
    });
  };

  const handleAssignmentChange = async (assigneeId: string | null) => {
    try {
      await assignmentMutation.mutateAsync({
        workOrderId: workOrder.id,
        assigneeId,
        organizationId: workOrder.organizationId
      });
    } catch {
      // Error is handled in the mutation
    }
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="space-y-3">
          <div>
            <CardTitle className="text-base leading-tight">{workOrder.title}</CardTitle>
            {workOrder.equipmentName && (
              <p className="text-sm text-muted-foreground mt-1">
                Equipment: {workOrder.equipmentName}
              </p>
            )}
          </div>

          <CardDescription className="text-sm line-clamp-2">
            {workOrder.description}
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="space-y-4">
          {/* PM Progress Indicator */}
          {workOrder.has_pm && (
            <div className="pb-2 border-b">
              <PMProgressIndicator 
                workOrderId={workOrder.id} 
                hasPM={workOrder.has_pm} 
              />
            </div>
          )}

          <div className="space-y-2 text-sm">
            {/* Status - Editable Field */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">Status:</span>
              {canChangeStatus ? (
                <Select
                  value={workOrder.status}
                  onValueChange={(value) => handleStatusUpdate(value as Database["public"]["Enums"]["work_order_status"])}
                  disabled={statusUpdateMutation.isPending}
                >
                  <SelectTrigger className={`h-8 w-full max-w-[180px] ${getStatusColor(workOrder.status)} border`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="submitted">{formatStatus('submitted')}</SelectItem>
                    <SelectItem value="accepted">{formatStatus('accepted')}</SelectItem>
                    <SelectItem value="assigned">{formatStatus('assigned')}</SelectItem>
                    <SelectItem value="in_progress">{formatStatus('in_progress')}</SelectItem>
                    <SelectItem value="on_hold">{formatStatus('on_hold')}</SelectItem>
                    <SelectItem value="completed">{formatStatus('completed')}</SelectItem>
                    <SelectItem value="cancelled">{formatStatus('cancelled')}</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Badge className={getStatusColor(workOrder.status)} variant="outline">
                  {formatStatus(workOrder.status)}
                </Badge>
              )}
            </div>

            {workOrder.equipmentTeamName && (
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-muted-foreground">Team: {workOrder.equipmentTeamName}</span>
              </div>
            )}

            {/* Assigned User - Interactive */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">Assigned:</span>
              <Select
                value={workOrder.assignedTo?.id || 'unassigned'}
                onValueChange={(value) => handleAssignmentChange(value === 'unassigned' ? null : value)}
                disabled={isUpdating || isLoadingAssignees || assignmentMutation.isPending}
              >
                <SelectTrigger className="w-full">
                  <div className="flex items-center gap-2">
                    {workOrder.assignedTo?.name ? (
                      <span className="truncate text-left">{workOrder.assignedTo.name}</span>
                    ) : (
                      <span className="text-muted-foreground">Unassigned</span>
                    )}
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">
                    <div className="flex items-center gap-2">
                      <UserX className="h-3 w-3" />
                      <span>Unassigned</span>
                    </div>
                  </SelectItem>
                  {assignmentOptions.map((assignee) => (
                    <SelectItem key={assignee.id} value={assignee.id}>
                      <div className="flex items-center gap-2">
                        <User className="h-3 w-3" />
                        <span>{assignee.name}</span>
                        {assignee.role && (
                          <span className="text-xs text-muted-foreground">({assignee.role})</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date Info */}
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="text-muted-foreground">
                Created: {formatDate(workOrder.createdDate)}
                {workOrder.dueDate && ` • Due: ${formatDate(workOrder.dueDate)}`}
              </span>
            </div>

            {/* Time and Cost Info */}
            <div className="flex items-center justify-between">
              {workOrder.estimatedHours && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{workOrder.estimatedHours}h est.</span>
                </div>
              )}
              <WorkOrderCostSubtotal 
                workOrderId={workOrder.id}
                className="flex-shrink-0"
              />
            </div>

            {workOrder.completedDate && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-muted-foreground text-xs">
                  Completed: {formatDate(workOrder.completedDate)}
                </span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-2 border-t">
            <div className="flex gap-2">
              <Button variant="outline" size="sm" asChild className="flex-1 justify-center">
                <Link to={`/dashboard/work-orders/${workOrder.id}`}>
                  View Details
                </Link>
              </Button>
              {workOrder.status === 'submitted' && onAcceptClick && (
                <Button
                  size="sm"
                  className="flex-1 justify-center"
                  onClick={() => onAcceptClick(workOrder)}
                  disabled={isAccepting}
                >
                  {isAccepting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Accepting...
                    </>
                  ) : (
                    'Accept'
                  )}
                </Button>
              )}
              <WorkOrderQuickActions
                workOrderId={workOrder.id}
                workOrderStatus={workOrder.status}
                equipmentTeamId={workOrder.equipmentTeamId ?? workOrder.team_id}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

MobileCard.displayName = 'MobileCard';

// ============================================
// Compact Card Component
// ============================================

const CompactCard: React.FC<WorkOrderCardProps> = memo(({ 
  workOrder, 
  onNavigate 
}) => {
  const computedData = useMemo(() => {
    const overdueStatus = isOverdue(workOrder.dueDate ?? workOrder.due_date, workOrder.status);
    return {
      isOverdue: overdueStatus,
      formattedDueDate: formatDate(workOrder.dueDate ?? workOrder.due_date),
      formattedCreatedDate: formatDate(workOrder.createdDate ?? workOrder.created_date)
    };
  }, [workOrder.status, workOrder.dueDate, workOrder.due_date, workOrder.createdDate, workOrder.created_date]);

  return (
    <Card className="h-full hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg leading-tight line-clamp-2">
              {workOrder.title}
            </CardTitle>
            <span className="text-xs text-muted-foreground capitalize">
              {workOrder.priority} priority
            </span>
          </div>
          <Badge className={getStatusColor(workOrder.status)}>
            {formatStatus(workOrder.status)}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground line-clamp-2">
          {workOrder.description}
        </p>

        {/* PM Progress Indicator */}
        {workOrder.has_pm && (
          <div className="py-2 border-y">
            <PMProgressIndicator 
              workOrderId={workOrder.id} 
              hasPM={workOrder.has_pm} 
            />
          </div>
        )}

        <div className="space-y-2 text-sm">
          {workOrder.equipmentName && (
            <div className="flex items-center gap-2">
              <span className="font-medium">Equipment:</span>
              <span className="text-muted-foreground truncate">
                {workOrder.equipmentName}
              </span>
            </div>
          )}
          
          {workOrder.assigneeName && (
            <div className="flex items-center gap-2">
              <User className="h-3 w-3" />
              <span className="text-muted-foreground truncate">
                {workOrder.assigneeName}
              </span>
            </div>
          )}

          {(workOrder.teamName || workOrder.equipmentTeamName) && (
            <div className="flex items-center gap-2">
              <span className="font-medium">Team:</span>
              <span className="text-muted-foreground truncate">
                {workOrder.teamName || workOrder.equipmentTeamName}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            Created: {computedData.formattedCreatedDate}
          </div>
          
          {computedData.formattedDueDate !== '—' && (
            <div className={`flex items-center gap-1 ${
              computedData.isOverdue ? 'text-destructive' : ''
            }`}>
              {computedData.isOverdue && <AlertTriangle className="h-3 w-3" />}
              Due: {computedData.formattedDueDate}
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-2">
          <Button
            variant="default"
            size="sm"
            className="flex-1"
            onClick={() => onNavigate?.(workOrder.id)}
          >
            View Details
          </Button>
        </div>
      </CardContent>
    </Card>
  );
});

CompactCard.displayName = 'CompactCard';

// ============================================
// Main Component
// ============================================

const WorkOrderCard: React.FC<WorkOrderCardProps> = (props) => {
  const { variant = 'desktop' } = props;

  switch (variant) {
    case 'mobile':
      return <MobileCard {...props} />;
    case 'compact':
      return <CompactCard {...props} />;
    case 'desktop':
    default:
      return <DesktopCard {...props} />;
  }
};

export default memo(WorkOrderCard);



