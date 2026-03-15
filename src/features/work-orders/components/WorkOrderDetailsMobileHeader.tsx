import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Edit, PanelRight, Clipboard, MapPin, Calendar, Users, MoreHorizontal, Clock, AlertCircle, AlertTriangle } from 'lucide-react';
import { getStatusColor, formatStatus, isOverdue as checkIsOverdue } from '@/features/work-orders/utils/workOrderHelpers';
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
      <div className="p-4 space-y-3">
        {/* Top Row: Minimal Back Button and Actions */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" asChild className="p-2 text-secondary hover:underline">
            <Link to="/dashboard/work-orders">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          
          <div className="flex items-center gap-1">
            {canEdit && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onEditClick} 
                className="px-3"
                aria-label="Edit work order"
                title="Edit work order"
              >
                <Edit className="h-4 w-4" />
              </Button>
            )}
            <Button 
              variant="ghost" 
              size="sm"
              onClick={onOpenActionSheet}
              className="p-2 flex flex-col items-center gap-0.5"
              aria-label="More actions"
            >
              <MoreHorizontal className="h-4 w-4" />
              <span className="text-[9px] leading-none text-muted-foreground">Actions</span>
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={onToggleSidebar}
              className="p-2 flex flex-col items-center gap-0.5"
              aria-label="View work order status and assignment"
            >
              <PanelRight className="h-4 w-4" />
              <span className="text-[9px] leading-none text-muted-foreground">Info</span>
            </Button>
          </div>
        </div>

        {/* Work Order Title - Largest Heading */}
        <div className="space-y-2">
          <h1 className="text-xl font-bold leading-tight line-clamp-2">
            {workOrder.title}
          </h1>

          {/* Critical Info Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <Badge className={`${getStatusColor(workOrder.status)} text-xs`}>
                {formatStatus(workOrder.status)}
              </Badge>
              <span className="text-muted-foreground capitalize">
                {workOrder.priority} priority
              </span>
            </div>
            
            {/* Primary Action Button - hidden when in_progress/on_hold since the sticky bottom bar handles it */}
            {workOrder.status !== 'in_progress' && workOrder.status !== 'on_hold' && (
              <WorkOrderPrimaryActionButton 
                workOrder={workOrder}
              />
            )}
          </div>

          {/* Equipment & Location Info */}
          {workOrder.equipment && (
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Clipboard className="h-3 w-3" />
                <span className="font-medium">{workOrder.equipment.name}</span>
                <Badge variant="outline" className="text-xs ml-1">
                  {workOrder.equipment.status}
                </Badge>
              </div>
              {(workOrder.effectiveLocation || workOrder.equipment.location) && (
                <div className="flex items-center gap-1">
                  <MapPin className="h-3 w-3 flex-shrink-0" />
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
              <div className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-muted-foreground" />
                <Link
                  to={`/dashboard/teams/${workOrder.team.id}`}
                  className="font-medium text-primary hover:underline"
                >
                  {workOrder.team.name}
                </Link>
              </div>
              {workOrder.team.location_address && (
                <div className="flex items-center gap-1.5 pl-5">
                  <MapPin className="h-3 w-3 text-muted-foreground flex-shrink-0" />
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
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span>Created: {new Date(workOrder.created_at).toLocaleDateString()}</span>
              </div>
            )}
            {workOrder.due_date && (() => {
              const due = new Date(workOrder.due_date);
              const hoursUntilDue = (due.getTime() - Date.now()) / (1000 * 60 * 60);
              const isOverdue = checkIsOverdue(workOrder.due_date, workOrder.status);
              const isDueSoon = !isOverdue && hoursUntilDue > 0 && hoursUntilDue < 24;
              return (
                <div className={`flex items-center gap-1 ${isOverdue ? 'text-destructive' : isDueSoon ? 'text-warning' : ''}`}>
                  {isOverdue
                    ? <AlertCircle className="h-3 w-3" />
                    : isDueSoon
                      ? <AlertTriangle className="h-3 w-3" />
                      : <Clock className="h-3 w-3" />
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

