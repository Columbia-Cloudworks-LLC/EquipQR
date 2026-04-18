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

import React, { memo, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Calendar,
  ChevronRight,
  Clock,
  User,
  Users,
  UserX,
  AlertTriangle,
  Cog,
  MapPin,
  Shovel,
  Truck,
  Zap,
  Lightbulb,
  Mountain,
  Construction,
  type LucideIcon,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import ClickableAddress from '@/components/ui/ClickableAddress';
import { useUnifiedPermissions } from '@/hooks/useUnifiedPermissions';
import { 
  getStatusColor, 
  formatStatus, 
  formatDate,
  formatRelativeDate,
  isOverdue,
  isTerminalStatus,
} from '@/features/work-orders/utils/workOrderHelpers';
import { getPriorityBadgeClass, getWorkOrderStatusBorderWithOverdue, getStatusBackgroundTint } from '@/lib/status-colors';
import WorkOrderCostSubtotal from './WorkOrderCostSubtotal';
import PMProgressIndicator from './PMProgressIndicator';
import { WorkOrderQuickActions } from './WorkOrderQuickActions';
import { WorkOrderAssignmentHover } from './WorkOrderAssignmentHover';
import { WorkOrderPrimaryActionButton } from './WorkOrderPrimaryActionButton';
import type { WorkOrder, WorkOrderData } from '@/features/work-orders/types/workOrder';
import type { AssignmentWorkOrderContext } from '@/features/work-orders/hooks/useWorkOrderContextualAssignment';
import { PendingSyncBadge } from '@/features/offline-queue/components/PendingSyncBadge';
import type { MergedWorkOrder } from '@/features/work-orders/hooks/useOfflineMergedWorkOrders';

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
  /**
   * Hint that this card is in the initial viewport. When true, the
   * equipment thumbnail loads eagerly with `fetchpriority=high` so Chrome
   * does not defer it (and does not emit the
   * "Images loaded lazily and replaced with placeholders" intervention
   * warning). The list parent typically passes `index < 6`.
   */
  isAboveTheFold?: boolean;
}

interface EquipmentThumbnailProps {
  imageUrl?: string | null;
  equipmentName?: string;
  equipmentAltContext?: string;
  className?: string;
  iconClassName?: string;
  /** See WorkOrderCardProps.isAboveTheFold. */
  isAboveTheFold?: boolean;
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
  equipmentManufacturer: workOrder.equipmentManufacturer,
  equipmentModel: workOrder.equipmentModel,
  equipmentSerialNumber: workOrder.equipmentSerialNumber,
  equipmentWorkingHours: workOrder.equipmentWorkingHours,
  equipmentImageUrl: workOrder.equipmentImageUrl,
  createdByName: workOrder.createdByName,
});

const getAssignmentContext = (workOrder: WorkOrder): AssignmentWorkOrderContext => ({
  ...workOrder,
  organization_id: workOrder.organization_id ?? workOrder.organizationId ?? '',
  equipment_id: workOrder.equipment_id ?? workOrder.equipmentId ?? '',
  equipmentTeamId: workOrder.equipmentTeamId ?? workOrder.team_id,
});

const formatMachineHours = (hours?: number | null): string | null => {
  if (typeof hours !== 'number') return null;
  return `${hours.toLocaleString()} hrs`;
};

const formatPriorityLabel = (priority?: string): string => {
  if (!priority) return 'Priority';
  return priority.replace('_', ' ');
};

const getEquipmentFallbackIcon = (equipmentName?: string): LucideIcon => {
  const name = equipmentName?.toLowerCase() ?? '';
  if (name.includes('excavator')) return Shovel;
  if (name.includes('dozer') || name.includes('bulldozer')) return Mountain;
  if (name.includes('generator')) return Zap;
  if (name.includes('light tower') || name.includes('light plant')) return Lightbulb;
  if (name.includes('loader') || name.includes('truck') || name.includes('hauler')) return Truck;
  if (name.includes('crane') || name.includes('boom') || name.includes('forklift')) return Construction;
  return Cog;
};

const getEquipmentFallbackTint = (equipmentName?: string): string => {
  const name = equipmentName?.toLowerCase() ?? '';
  if (name.includes('excavator')) return 'bg-amber-500/10';
  if (name.includes('dozer') || name.includes('bulldozer')) return 'bg-orange-500/10';
  if (name.includes('generator')) return 'bg-yellow-500/10';
  if (name.includes('light tower') || name.includes('light plant')) return 'bg-sky-500/10';
  if (name.includes('loader') || name.includes('truck') || name.includes('hauler')) return 'bg-emerald-500/10';
  if (name.includes('crane') || name.includes('boom') || name.includes('forklift')) return 'bg-violet-500/10';
  return 'bg-muted';
};

const EquipmentThumbnail: React.FC<EquipmentThumbnailProps> = ({
  imageUrl,
  equipmentName,
  equipmentAltContext,
  className,
  iconClassName,
  isAboveTheFold = false,
}) => {
  const [hasImageError, setHasImageError] = useState(false);

  if (!imageUrl || hasImageError) {
    const FallbackIcon = getEquipmentFallbackIcon(equipmentName ?? equipmentAltContext);
    const tintClass = getEquipmentFallbackTint(equipmentName ?? equipmentAltContext);
    return (
      <div className={cn('rounded-xl flex items-center justify-center ring-1 ring-border', tintClass, className)}>
        <FallbackIcon className={cn('text-muted-foreground', iconClassName)} />
      </div>
    );
  }

  return (
    <img
      src={imageUrl}
      alt={
        equipmentName
          ? `${equipmentName} equipment image`
          : equipmentAltContext
            ? `${equipmentAltContext} equipment image`
            : 'Work order equipment image'
      }
      className={cn('rounded-xl object-cover bg-muted ring-1 ring-border', className)}
      loading={isAboveTheFold ? 'eager' : 'lazy'}
      // The DOM property is `fetchPriority` (camelCase) in React 18+.
      fetchPriority={isAboveTheFold ? 'high' : 'auto'}
      onError={() => setHasImageError(true)}
    />
  );
};

// ============================================
// Desktop Card Component
// ============================================

const DesktopCard: React.FC<WorkOrderCardProps> = memo(({ 
  workOrder, 
  onNavigate,
  isAboveTheFold,
}) => {
  const permissions = useUnifiedPermissions();
  const workOrderData = mapToWorkOrderData(workOrder);
  const detailedPermissions = permissions.workOrders.getDetailedPermissions(workOrderData);
  const assignmentContext = getAssignmentContext(workOrder);

  const equipmentTeamName = workOrder.equipmentTeamName ?? workOrder.teamName;
  const machineHours = formatMachineHours(workOrder.equipmentWorkingHours);
  const createdDateValue = workOrder.created_date ?? workOrder.createdDate;
  const dueDateValue = workOrder.due_date ?? workOrder.dueDate;
  const estimatedHoursValue = workOrder.estimated_hours ?? workOrder.estimatedHours;
  const completedDateValue = workOrder.completed_date ?? workOrder.completedDate;
  const isTerminal = isTerminalStatus(workOrder.status);
  const showDescription = workOrder.description && workOrder.description !== workOrder.title;

  const equipmentLine = [
    workOrder.equipmentModel,
    machineHours,
  ].filter(Boolean).join(' \u2022 ');
  
  const isWorkOrderOverdue = isOverdue(dueDateValue, workOrder.status);
  const statusBorderClass = getWorkOrderStatusBorderWithOverdue(workOrder.status, isWorkOrderOverdue);
  const statusTintClass = getStatusBackgroundTint(workOrder.status, isWorkOrderOverdue);

  return (
    <Card
      className={cn(
        "transition-all duration-normal",
        statusBorderClass,
        statusTintClass,
        isTerminal && "opacity-70",
        onNavigate && "hover:shadow-lg cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      )}
      role={onNavigate ? "button" : undefined}
      tabIndex={onNavigate ? 0 : undefined}
      onClick={onNavigate ? () => onNavigate(workOrder.id) : undefined}
      onKeyDown={onNavigate ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onNavigate(workOrder.id);
        }
      } : undefined}
    >
      <CardContent standalone>
        {/* Identity strip: photo + title/equipment + actions/badges */}
        <div className="flex items-start gap-4">
          <EquipmentThumbnail
            imageUrl={workOrder.equipmentImageUrl}
            equipmentName={workOrder.equipmentName}
            equipmentAltContext={workOrder.title}
            className="h-24 w-24 rounded-xl flex-shrink-0"
            iconClassName="h-10 w-10"
            isAboveTheFold={isAboveTheFold}
          />
          <div className="min-w-0 flex-1">
            <CardTitle className="text-lg font-semibold leading-tight">
              {workOrder.title}
            </CardTitle>
            {showDescription && (
              <p className="text-sm text-muted-foreground mt-0.5 truncate">
                {workOrder.description}
              </p>
            )}
            {workOrder.equipmentName && (
              <p className="text-sm text-muted-foreground mt-1">
                {workOrder.equipmentName}
                {equipmentLine && <span className="ml-1.5 text-xs">{equipmentLine}</span>}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <div onClick={(e) => e.stopPropagation()}>
              <WorkOrderQuickActions
                workOrderId={workOrder.id}
                workOrderStatus={workOrder.status}
                equipmentTeamId={workOrder.equipmentTeamId ?? workOrder.team_id}
              />
            </div>
            <Badge className={getStatusColor(workOrder.status)}>
              {formatStatus(workOrder.status)}
            </Badge>
            <Badge
              variant="outline"
              className={cn('capitalize', getPriorityBadgeClass(workOrder.priority))}
            >
              {formatPriorityLabel(workOrder.priority)}
            </Badge>
            {(workOrder as MergedWorkOrder)._isPendingSync && <PendingSyncBadge />}
          </div>
        </div>

        {/* Metadata token strip */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground mt-3 pt-3 border-t">
          <span className="inline-flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
            {formatDate(createdDateValue)}
          </span>

          {dueDateValue && (
            <span className={cn(
              "inline-flex items-center gap-1",
              isWorkOrderOverdue && "text-destructive font-medium"
            )}>
              <Clock className="h-3.5 w-3.5 flex-shrink-0" />
              Due {formatDate(dueDateValue)}
              {isWorkOrderOverdue && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <AlertTriangle className="h-3 w-3" />
                  </TooltipTrigger>
                  <TooltipContent>Overdue &mdash; due date has passed</TooltipContent>
                </Tooltip>
              )}
            </span>
          )}

          {equipmentTeamName && (
            <span className="inline-flex items-center gap-1">
              <Users className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="truncate max-w-[12rem]">{equipmentTeamName}</span>
            </span>
          )}

          <WorkOrderAssignmentHover 
            workOrder={assignmentContext}
            disabled={!detailedPermissions.canEditAssignment}
          >
            <span className="inline-flex items-center gap-1 cursor-pointer hover:text-foreground rounded px-1 -mx-1 transition-colors">
              {workOrder.assigneeName ? (
                <>
                  <User className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="truncate max-w-[10rem]">{workOrder.assigneeName}</span>
                </>
              ) : (
                <>
                  <UserX className="h-3.5 w-3.5 flex-shrink-0" />
                  Unassigned
                </>
              )}
            </span>
          </WorkOrderAssignmentHover>

          {workOrder.effectiveLocation && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
              <ClickableAddress
                address={workOrder.effectiveLocation.formattedAddress}
                lat={workOrder.effectiveLocation.lat}
                lng={workOrder.effectiveLocation.lng}
                className="text-sm truncate"
                showIcon={false}
                compact
              />
            </span>
          )}

          {estimatedHoursValue && (
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 flex-shrink-0" />
              Est. {estimatedHoursValue}h
            </span>
          )}

          {completedDateValue && (
            <span className="inline-flex items-center gap-1 text-success">
              Completed {formatDate(completedDateValue)}
            </span>
          )}

          {detailedPermissions.canEdit && (
            <WorkOrderCostSubtotal 
              workOrderId={workOrder.id}
              className="text-sm"
              hideWhenEmpty
            />
          )}
        </div>

        {/* PM progress -- hidden for terminal cards */}
        {workOrder.has_pm && !isTerminal && (
          <div className="mt-3">
            <PMProgressIndicator 
              workOrderId={workOrder.id} 
              hasPM={workOrder.has_pm}
              showCount
            />
          </div>
        )}

        {/* Primary action for active work orders */}
        {!isTerminal && (
          <div
            className="flex items-center justify-end mt-3 pt-3 border-t"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            role="group"
            aria-label="Work order actions"
          >
            <WorkOrderPrimaryActionButton
              workOrder={{
                id: workOrder.id,
                status: workOrder.status,
                has_pm: workOrder.has_pm,
                assignee_id: workOrder.assignee_id ?? workOrder.assigneeId,
                created_by: workOrder.created_by,
              }}
              organizationId={workOrder.organization_id ?? workOrder.organizationId}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
});

DesktopCard.displayName = 'DesktopCard';

// ============================================
// Mobile Card Component
// ============================================

type MobileCardProps = Pick<WorkOrderCardProps, 'workOrder' | 'onNavigate' | 'isAboveTheFold'>;

const MobileCard: React.FC<MobileCardProps> = memo(({
  workOrder,
  onNavigate,
  isAboveTheFold,
}) => {
  const dueDateValue = workOrder.dueDate ?? workOrder.due_date;
  const createdDateValue = workOrder.createdDate ?? workOrder.created_date;
  const machineHours = formatMachineHours(workOrder.equipmentWorkingHours);
  const isTerminal = isTerminalStatus(workOrder.status);

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
  const isWorkOrderOverdue = isOverdue(dueDateValue, workOrder.status);
  const statusBorderClass = getWorkOrderStatusBorderWithOverdue(workOrder.status, isWorkOrderOverdue);
  const statusTintClass = getStatusBackgroundTint(workOrder.status, isWorkOrderOverdue);

  const dateLabel = dueDateValue
    ? (isWorkOrderOverdue ? `Overdue ${formatRelativeDate(dueDateValue)}` : `Due ${formatRelativeDate(dueDateValue)}`)
    : formatRelativeDate(createdDateValue);

  return (
    <Card
      className={cn(
        "transition-all duration-normal",
        statusBorderClass,
        statusTintClass,
        isTerminal && "opacity-70",
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
      <CardContent standalone className="p-3">
        {/* Row 1: thumbnail + title/equipment (badges removed from this row) */}
        <div className="flex items-start gap-2.5">
          <EquipmentThumbnail
            imageUrl={workOrder.equipmentImageUrl}
            equipmentName={workOrder.equipmentName}
            equipmentAltContext={workOrder.title}
            className="h-12 w-12 rounded-lg flex-shrink-0"
            iconClassName="h-6 w-6"
            isAboveTheFold={isAboveTheFold}
          />
          <div className="min-w-0 flex-1">
            <CardTitle className="text-[15px] font-semibold leading-snug line-clamp-2">
              {workOrder.title}
            </CardTitle>
            {workOrder.equipmentName && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                {workOrder.equipmentName}
                {machineHours && <span className="ml-1">&bull; {machineHours}</span>}
              </p>
            )}
          </div>
        </div>

        {/* Row 2: badges + sync indicator on their own line */}
        <div className="flex items-center gap-1.5 mt-2">
          <Badge
            className={cn(getStatusColor(workOrder.status), "rounded-full px-2 py-0.5 text-xs")}
            variant="outline"
          >
            {formatStatus(workOrder.status)}
          </Badge>
          <Badge
            variant="outline"
            className={cn(
              'rounded-full px-2 py-0.5 text-xs capitalize',
              getPriorityBadgeClass(workOrder.priority)
            )}
          >
            {formatPriorityLabel(workOrder.priority)}
          </Badge>
          {(workOrder as MergedWorkOrder)._isPendingSync && <PendingSyncBadge className="flex-shrink-0" />}
        </div>

        {/* PM progress -- hidden for terminal cards */}
        {workOrder.has_pm && !isTerminal && (
          <div className="mt-2">
            <PMProgressIndicator
              workOrderId={workOrder.id}
              hasPM={workOrder.has_pm}
              showCount
            />
          </div>
        )}

        {/* Footer: assignee + date/cost + chevron */}
        <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t">
          <div className="flex items-center gap-1.5 min-w-0">
            <Avatar className="h-6 w-6 flex-shrink-0">
              <AvatarFallback className="text-[10px]">
                {initials}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm text-muted-foreground truncate">
              {assigneeName || 'Unassigned'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className={cn(
              "text-xs text-muted-foreground inline-flex items-center gap-1",
              isWorkOrderOverdue && 'text-destructive font-medium'
            )}>
              <Calendar className="h-3 w-3" />
              {dateLabel}
            </span>
            <WorkOrderCostSubtotal workOrderId={workOrder.id} className="text-xs flex-shrink-0" hideWhenEmpty />
            {isInteractive && (
              <ChevronRight className="h-4 w-4 text-muted-foreground/60" />
            )}
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

  const isTerminal = isTerminalStatus(workOrder.status);

  return (
    <Card
      className={cn(
        "h-full transition-all duration-normal",
        computedData.statusBorderClass,
        onNavigate && "hover:shadow-lg cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      )}
      role={onNavigate ? "button" : undefined}
      tabIndex={onNavigate ? 0 : undefined}
      onClick={onNavigate ? () => onNavigate(workOrder.id) : undefined}
      onKeyDown={onNavigate ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onNavigate(workOrder.id);
        }
      } : undefined}
    >
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

        {/* PM Progress Indicator -- hidden for terminal cards */}
        {workOrder.has_pm && !isTerminal && (
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

          {workOrder.effectiveLocation && (
            <div className="flex items-center gap-2">
              <MapPin className="h-3 w-3 flex-shrink-0" />
              <ClickableAddress
                address={workOrder.effectiveLocation.formattedAddress}
                lat={workOrder.effectiveLocation.lat}
                lng={workOrder.effectiveLocation.lng}
                className="text-sm truncate"
                showIcon={false}
                compact
              />
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
              {computedData.isOverdue && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <AlertTriangle className="h-3.5 w-3.5" />
                  </TooltipTrigger>
                  <TooltipContent>Overdue &mdash; due date has passed</TooltipContent>
                </Tooltip>
              )}
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
