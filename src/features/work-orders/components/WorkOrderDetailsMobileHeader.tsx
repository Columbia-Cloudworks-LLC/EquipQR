import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Edit, Menu, Clipboard, MapPin, Calendar, Users, MoreHorizontal } from 'lucide-react';
import { getStatusColor, formatStatus } from '@/features/work-orders/utils/workOrderHelpers';
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
              className="p-2"
              aria-label="More actions"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={onToggleSidebar}
              className="p-2"
              aria-label="View work order info"
            >
              <Menu className="h-4 w-4" />
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
            
            {/* Primary Action Button */}
            <WorkOrderPrimaryActionButton 
              workOrder={workOrder}
            />
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
              {workOrder.team.description && (
                <p className="text-xs text-muted-foreground pl-5 line-clamp-1">
                  {workOrder.team.description}
                </p>
              )}
              {workOrder.team.location_address && (
                <div className="flex items-center gap-1.5 pl-5">
                  <MapPin className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                  {workOrder.team.location_lat && workOrder.team.location_lng ? (
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

          {/* Created Date */}
          {workOrder.created_at && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Calendar className="h-3 w-3" />
              <span>{new Date(workOrder.created_at).toLocaleDateString()}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

