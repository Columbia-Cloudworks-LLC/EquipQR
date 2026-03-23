import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Edit, PanelRight, Clipboard, MapPin, Calendar, Users, MoreHorizontal, Clock, AlertCircle, AlertTriangle } from 'lucide-react';
import { getStatusColor, formatStatus, getPriorityColor, isOverdue as checkIsOverdue } from '@/features/work-orders/utils/workOrderHelpers';
import { WorkOrderPrimaryActionButton } from './WorkOrderPrimaryActionButton';
import ClickableAddress from '@/components/ui/ClickableAddress';
import type { EffectiveLocation } from '@/utils/effectiveLocation';

interface WorkOrderDetailsMobileHeaderProps {
  workOrder: {
    id: string;
    title: string;
    priority: 'low' | 'medium' | 'high';
    status: 'submitted' | 'accepted' | 'assigned' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled';
    has_pm?: boolean;
    assignee_id?: string;
    created_by?: string;
    created_at?: string;
    due_date?: string;
    equipment?: {
      name: string;
      status: string;
      location?: string;
    };
    team?: {
      id: string;
      name: string;
      description?: string;
      location_address?: string | null;
      location_city?: string | null;
      location_state?: string | null;
      location_lat?: number | null;
      location_lng?: number | null;
    };
    effectiveLocation?: EffectiveLocation | null;
  };
  canEdit: boolean;
  onEditClick: () => void;
  onToggleSidebar: () => void;
  /** Callback to open the action sheet */
  onOpenActionSheet: () => void;
}

export const WorkOrderDetailsMobileHeader: React.FC<WorkOrderDetailsMobileHeaderProps> = ({
  workOrder,
  canEdit,
  onEditClick,
  onToggleSidebar,
  onOpenActionSheet,
}) => {
  return (
    <div className="sticky top-0 z-10 bg-background border-b lg:hidden">
      <div className="px-3 pt-2 pb-3 space-y-2">
        {/* Top Row: Back navigation + action icons */}
        <div className="flex items-center justify-between">
          {/* Back button — min 44px touch target, labeled for context */}
          <Button
            variant="ghost"
            asChild
            className="min-h-[44px] -ml-2 gap-1.5 px-2 text-muted-foreground hover:text-foreground touch-manipulation"
          >
            <Link to="/dashboard/work-orders">
              <ArrowLeft className="h-4 w-4" />
              <span className="text-sm font-medium">Work Orders</span>
            </Link>
          </Button>

          {/* Action cluster — each target min 44×44px */}
          <div className="flex items-center gap-0.5">
            {canEdit && (
              <Button
                variant="outline"
                onClick={onEditClick}
                className="min-h-[44px] px-3 touch-manipulation"
                aria-label="Edit work order"
                title="Edit work order"
              >
                <Edit className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              onClick={onOpenActionSheet}
              className="min-h-[44px] min-w-[44px] flex flex-col items-center justify-center gap-0.5 px-2 touch-manipulation"
              aria-label="More actions"
            >
              <MoreHorizontal className="h-4 w-4" />
              <span className="text-[9px] leading-none text-muted-foreground">More</span>
            </Button>
            <Button
              variant="ghost"
              onClick={onToggleSidebar}
              className="min-h-[44px] min-w-[44px] flex flex-col items-center justify-center gap-0.5 px-2 touch-manipulation"
              aria-label="View work order status and assignment"
            >
              <PanelRight className="h-4 w-4" />
              <span className="text-[9px] leading-none text-muted-foreground">Info</span>
            </Button>
          </div>
        </div>

        {/* Title + Status — primary orientation zone */}
        <div className="space-y-2">
          <h1 className="text-xl font-bold leading-tight line-clamp-2">
            {workOrder.title}
          </h1>

          {/* Status + Priority badges + primary action */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className={`${getStatusColor(workOrder.status)} text-xs font-semibold`}>
                {formatStatus(workOrder.status)}
              </Badge>
              <Badge variant="outline" className={`text-xs capitalize ${getPriorityColor(workOrder.priority)}`}>
                {workOrder.priority} priority
              </Badge>
            </div>

            {/* Primary action — hidden while in_progress/on_hold (sticky bar handles it) */}
            {workOrder.status !== 'in_progress' && workOrder.status !== 'on_hold' && (
              <WorkOrderPrimaryActionButton workOrder={workOrder} />
            )}
          </div>

          {/* Equipment chip + tap-friendly location link */}
          {workOrder.equipment && (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clipboard className="h-4 w-4 shrink-0" />
                <span className="font-medium text-foreground">{workOrder.equipment.name}</span>
                <Badge variant="outline" className="text-xs">
                  {workOrder.equipment.status}
                </Badge>
              </div>
              {(workOrder.effectiveLocation || workOrder.equipment.location) && (
                <div className="flex items-center gap-2 min-h-[44px] touch-manipulation text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4 shrink-0" />
                  {workOrder.effectiveLocation ? (
                    <ClickableAddress
                      address={workOrder.effectiveLocation.formattedAddress}
                      lat={workOrder.effectiveLocation.lat}
                      lng={workOrder.effectiveLocation.lng}
                      className="text-sm"
                      showIcon={false}
                    />
                  ) : (
                    <ClickableAddress
                      address={workOrder.equipment.location}
                      className="text-sm"
                      showIcon={false}
                    />
                  )}
                </div>
              )}
            </div>
          )}

          {/* Team Info */}
          {workOrder.team && (
            <div className="space-y-1 text-sm">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                <Link
                  to={`/dashboard/teams/${workOrder.team.id}`}
                  className="font-medium text-primary hover:underline"
                >
                  {workOrder.team.name}
                </Link>
              </div>
              {workOrder.team.location_address && (
                <div className="flex items-center gap-2 pl-6 min-h-[44px] touch-manipulation">
                  <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                  {workOrder.team.location_lat != null && workOrder.team.location_lng != null ? (
                    <ClickableAddress
                      address={workOrder.team.location_address}
                      lat={workOrder.team.location_lat}
                      lng={workOrder.team.location_lng}
                      className="text-xs"
                      showIcon={false}
                    />
                  ) : (
                    <ClickableAddress
                      address={workOrder.team.location_address}
                      className="text-xs"
                      showIcon={false}
                    />
                  )}
                </div>
              )}
            </div>
          )}

          {/* Dates Row */}
          <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
            {workOrder.created_at && (
              <div className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                <span>Created: {new Date(workOrder.created_at).toLocaleDateString()}</span>
              </div>
            )}
            {workOrder.due_date && (() => {
              const due = new Date(workOrder.due_date);
              const hoursUntilDue = (due.getTime() - Date.now()) / (1000 * 60 * 60);
              const isOverdue = checkIsOverdue(workOrder.due_date, workOrder.status);
              const isDueSoon = !isOverdue && hoursUntilDue > 0 && hoursUntilDue < 24;
              return (
                <div className={`flex items-center gap-1.5 ${isOverdue ? 'text-destructive' : isDueSoon ? 'text-warning' : ''}`}>
                  {isOverdue
                    ? <AlertCircle className="h-4 w-4" />
                    : isDueSoon
                      ? <AlertTriangle className="h-4 w-4" />
                      : <Clock className="h-4 w-4" />
                  }
                  <span>Due: {due.toLocaleDateString()}</span>
                  {isOverdue && (
                    <Badge variant="outline" className="text-[10px] px-1 py-0 bg-destructive/10 text-destructive border-destructive/30">
                      OVERDUE
                    </Badge>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
};

