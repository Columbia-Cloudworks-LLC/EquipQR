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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Calendar, Clock, User, Users, UserX, AlertTriangle, Cog } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUnifiedPermissions } from '@/hooks/useUnifiedPermissions';
import { 
  getStatusColor, 
  formatStatus, 
  formatDate,
  isOverdue 
} from '@/features/work-orders/utils/workOrderHelpers';
import { getWorkOrderStatusBorderWithOverdue } from '@/lib/status-colors';
import WorkOrderCostSubtotal from './WorkOrderCostSubtotal';
import PMProgressIndicator from './PMProgressIndicator';
import { WorkOrderQuickActions } from './WorkOrderQuickActions';
import { WorkOrderAssignmentHover } from './WorkOrderAssignmentHover';
import type { WorkOrder, WorkOrderData } from '@/features/work-orders/types/workOrder';
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
  
  // Get status border with overdue check
  const isWorkOrderOverdue = isOverdue(dueDateValue, workOrder.status);
  const statusBorderClass = getWorkOrderStatusBorderWithOverdue(workOrder.status, isWorkOrderOverdue);

  return (
    <Card className={cn("hover:shadow-md transition-all duration-normal", statusBorderClass)}>
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

type MobileCardProps = Pick<WorkOrderCardProps, 'workOrder' | 'onNavigate'>;

const MobileCard: React.FC<MobileCardProps> = memo(({
  workOrder,
  onNavigate,
}) => {
  const dueDateValue = workOrder.dueDate ?? workOrder.due_date;
  const createdDateValue = workOrder.createdDate ?? workOrder.created_date;
  const assigneeName =
    workOrder.assigneeName ??
    workOrder.assignee_name ??
    workOrder.assignedTo?.name ??
    undefined;

  const initials = useMemo(() => {
    if (!assigneeName) return '?';
    const chars = assigneeName
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part[0])
      .join('')
      .toUpperCase();
    return chars.slice(0, 2) || '?';
  }, [assigneeName]);

  const isInteractive = Boolean(onNavigate);
  
  // Get status border with overdue check
  const isWorkOrderOverdue = isOverdue(dueDateValue, workOrder.status);
  const statusBorderClass = getWorkOrderStatusBorderWithOverdue(workOrder.status, isWorkOrderOverdue);

  return (
    <Card
      className={cn(
        "transition-all duration-normal",
        statusBorderClass,
        isInteractive && "hover:shadow-lg cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      )}
      role={isInteractive ? "button" : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      onClick={isInteractive ? () => onNavigate(workOrder.id) : undefined}
      onKeyDown={isInteractive ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          e.stopPropagation();
          onNavigate(workOrder.id);
        }
      } : undefined}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <CardTitle className="text-base leading-tight truncate">
              {workOrder.title}
            </CardTitle>
          </div>
          <Badge
            className={cn(getStatusColor(workOrder.status), "rounded-full px-2 py-0.5 text-xs flex-shrink-0")}
            variant="outline"
          >
            {formatStatus(workOrder.status)}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-3">
        {workOrder.equipmentName && (
          <div className="rounded-md bg-muted/50 p-2.5 flex items-center gap-2.5">
            <Cog className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            <span className="font-semibold text-sm truncate">
              {workOrder.equipmentName}
            </span>
          </div>
        )}

        {/* PM indicator: add top padding when no equipment section above to prevent flush layout */}
        {workOrder.has_pm && (
          <div className={workOrder.equipmentName ? "" : "pt-1"}>
            <PMProgressIndicator
              workOrderId={workOrder.id}
              hasPM={workOrder.has_pm}
            />
          </div>
        )}

        <div className="flex items-center justify-between gap-3 pt-3 border-t">
          <div className="flex items-center gap-2 min-w-0">
            <Avatar className="h-6 w-6">
              <AvatarFallback className="text-[10px]">
                {initials}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm text-muted-foreground truncate">
              {assigneeName || 'Unassigned'}
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground flex-shrink-0">
            <div className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              <span className={dueDateValue && isOverdue(dueDateValue, workOrder.status) ? 'text-destructive' : ''}>
                {dueDateValue ? `Due: ${formatDate(dueDateValue)}` : `Created: ${formatDate(createdDateValue)}`}
              </span>
            </div>
            <span>•</span>
            <WorkOrderCostSubtotal workOrderId={workOrder.id} className="flex-shrink-0" />
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
      formattedCreatedDate: formatDate(workOrder.createdDate ?? workOrder.created_date),
      statusBorderClass: getWorkOrderStatusBorderWithOverdue(workOrder.status, overdueStatus)
    };
  }, [workOrder.status, workOrder.dueDate, workOrder.due_date, workOrder.createdDate, workOrder.created_date]);

  return (
    <Card className={cn("h-full hover:shadow-md transition-all duration-normal", computedData.statusBorderClass)}>
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



