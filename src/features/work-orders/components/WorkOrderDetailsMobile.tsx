import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  ChevronDown, 
  ChevronUp, 
  MapPin, 
  Calendar, 
  User,
  Clock,
  Navigation,
  ExternalLink,
  Clipboard,
  AlertCircle,
  CheckCircle2,
  Wrench
} from 'lucide-react';
import { useEquipmentCurrentWorkingHours } from '@/features/equipment/hooks/useEquipmentWorkingHours';
import { cn } from '@/lib/utils';

interface WorkOrderDetailsMobileProps {
  workOrder: {
    id: string;
    title: string;
    description?: string;
    priority: 'low' | 'medium' | 'high';
    status: 'submitted' | 'accepted' | 'assigned' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled';
    created_at?: string;
    due_date?: string;
    has_pm?: boolean;
    pm_status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
    pm_progress?: number;
    pm_total?: number;
    equipment_working_hours_at_creation?: number;
  };
  equipment?: {
    id: string;
    name: string;
    manufacturer?: string;
    model?: string;
    serial_number?: string;
    status: string;
    location?: string;
    team_id?: string | null;
  };
  team?: {
    id: string;
    name: string;
  };
  assignee?: {
    id: string;
    name: string;
  };
  costs?: {
    total: number;
    items: Array<{
      id: string;
      description: string;
      amount: number;
    }>;
  };
  /** Callback to scroll to the PM section */
  onScrollToPM?: () => void;
}

/** Generate a Google Maps navigation URL */
const getNavigationUrl = (location: string): string => {
  const encoded = encodeURIComponent(location);
  // Use Google Maps directions URL
  return `https://www.google.com/maps/dir/?api=1&destination=${encoded}`;
};

/** Get priority badge styling */
const getPriorityStyle = (priority: string) => {
  switch (priority) {
    case 'high':
      return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800';
    case 'medium':
      return 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800';
    case 'low':
      return 'bg-green-100 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800';
    default:
      return '';
  }
};

/** Check if a due date is urgent (within 24 hours or overdue) */
const isDueUrgent = (dueDate: string): boolean => {
  const due = new Date(dueDate);
  const now = new Date();
  const hoursUntilDue = (due.getTime() - now.getTime()) / (1000 * 60 * 60);
  return hoursUntilDue < 24;
};

export const WorkOrderDetailsMobile: React.FC<WorkOrderDetailsMobileProps> = ({
  workOrder,
  equipment,
  team,
  assignee,
  onScrollToPM,
}) => {
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [isEquipmentDetailsExpanded, setIsEquipmentDetailsExpanded] = useState(false);
  
  // Get equipment working hours (current for reference)
  const { data: currentWorkingHours, isLoading: workingHoursLoading } = useEquipmentCurrentWorkingHours(
    equipment?.id || ''
  );
  
  // Use historical working hours from work order if available, otherwise show current
  const workingHours = workOrder.equipment_working_hours_at_creation ?? currentWorkingHours;

  // Calculate PM progress percentage
  const pmProgressPercent = workOrder.pm_total && workOrder.pm_total > 0 
    ? Math.round((workOrder.pm_progress || 0) / workOrder.pm_total * 100)
    : 0;

  // Check if due date is urgent
  const dueUrgent = workOrder.due_date ? isDueUrgent(workOrder.due_date) : false;

  return (
    <div className="space-y-3">
      {/* Top Summary Card - Task-First Info */}
      <Card className="shadow-elevation-2 border-l-4 border-l-primary">
        <CardContent className="p-4 space-y-4">
          {/* Location + Navigate */}
          {equipment?.location && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{equipment.location}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1"
                asChild
              >
                <a 
                  href={getNavigationUrl(equipment.location)} 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  <Navigation className="h-3.5 w-3.5" />
                  Navigate
                </a>
              </Button>
            </div>
          )}

          {/* Equipment Link */}
          {equipment && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <Wrench className="h-4 w-4 text-muted-foreground" />
                <div>
                  <span className="font-medium">{equipment.name}</span>
                  {equipment.manufacturer && (
                    <span className="text-muted-foreground ml-1">
                      ({equipment.manufacturer})
                    </span>
                  )}
                </div>
                <Badge variant="outline" className="text-xs">
                  {equipment.status}
                </Badge>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1"
                asChild
              >
                <Link to={`/dashboard/equipment/${equipment.id}`}>
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          )}

          {/* Due Date + Priority Row */}
          <div className="flex items-center justify-between gap-4">
            {workOrder.due_date && (
              <div className={cn(
                "flex items-center gap-2 text-sm",
                dueUrgent && "text-red-600 dark:text-red-400"
              )}>
                <Clock className="h-4 w-4" />
                <div>
                  <span className="font-medium">Due:</span>{' '}
                  <span>{new Date(workOrder.due_date).toLocaleDateString()}</span>
                </div>
                {dueUrgent && (
                  <AlertCircle className="h-4 w-4" />
                )}
              </div>
            )}
            <Badge 
              variant="outline" 
              className={cn("capitalize", getPriorityStyle(workOrder.priority))}
            >
              {workOrder.priority}
            </Badge>
          </div>

          {/* Assignee + Team */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            {assignee && (
              <div className="flex items-center gap-1">
                <User className="h-3.5 w-3.5" />
                <span>{assignee.name}</span>
              </div>
            )}
            {team && (
              <div className="flex items-center gap-1">
                <span className="text-xs">Team:</span>
                <span>{team.name}</span>
              </div>
            )}
          </div>

          {/* Working Hours Badge */}
          <div className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
              Working Hours:
            </span>
            <span className="text-sm text-blue-700 dark:text-blue-300 font-semibold">
              {workingHoursLoading ? (
                <span className="animate-pulse">...</span>
              ) : (
                `${workingHours?.toLocaleString() || 0} hrs`
              )}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* PM Checklist Progress Card */}
      {workOrder.has_pm && (
        <Card 
          className={cn(
            "shadow-elevation-2 transition-colors",
            onScrollToPM && "cursor-pointer hover:bg-muted/50",
            workOrder.pm_status === 'completed' && "border-green-200 dark:border-green-800"
          )}
          onClick={onScrollToPM ? () => onScrollToPM() : undefined}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Clipboard className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium text-sm">PM Checklist</span>
              </div>
              <div className="flex items-center gap-2">
                {workOrder.pm_status === 'completed' ? (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Complete
                  </Badge>
                ) : (
                  <span className="text-sm text-muted-foreground">
                    {workOrder.pm_progress || 0} / {workOrder.pm_total || 0}
                  </span>
                )}
              </div>
            </div>
            <Progress value={pmProgressPercent} className="h-2" />
            <p className="text-xs text-muted-foreground mt-2">
              Tap to view and complete checklist items
            </p>
          </CardContent>
        </Card>
      )}

      {/* Description - Collapsible */}
      {workOrder.description && (
        <Card className="shadow-elevation-2">
          <CardContent className="p-4">
            <Collapsible open={isDescriptionExpanded} onOpenChange={setIsDescriptionExpanded}>
              <CollapsibleTrigger asChild>
                <button className="flex items-center justify-between w-full text-left">
                  <span className="font-medium text-sm">Description</span>
                  {isDescriptionExpanded ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-3">
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {workOrder.description}
                </p>
              </CollapsibleContent>
            </Collapsible>
            {!isDescriptionExpanded && workOrder.description.length > 100 && (
              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                {workOrder.description}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Equipment Details - Collapsible */}
      {equipment && (
        <Card className="shadow-elevation-2">
          <CardContent className="p-4">
            <Collapsible open={isEquipmentDetailsExpanded} onOpenChange={setIsEquipmentDetailsExpanded}>
              <CollapsibleTrigger asChild>
                <button className="flex items-center justify-between w-full text-left">
                  <span className="font-medium text-sm">Equipment Details</span>
                  {isEquipmentDetailsExpanded ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-3 space-y-2 text-sm">
                {equipment.manufacturer && equipment.model && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Model</span>
                    <span>{equipment.manufacturer} {equipment.model}</span>
                  </div>
                )}
                {equipment.serial_number && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Serial</span>
                    <span className="font-mono">{equipment.serial_number}</span>
                  </div>
                )}
                {workOrder.created_at && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Created</span>
                    <span>{new Date(workOrder.created_at).toLocaleDateString()}</span>
                  </div>
                )}
                {workOrder.equipment_working_hours_at_creation && (
                  <div className="text-xs text-muted-foreground mt-2 p-2 bg-muted rounded">
                    Hours shown are from work order creation time
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>
          </CardContent>
        </Card>
      )}

      {/* Quick Info Row */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
        <Calendar className="h-3 w-3" />
        <span>Created: {workOrder.created_at ? new Date(workOrder.created_at).toLocaleDateString() : 'N/A'}</span>
        <span className="mx-1">•</span>
        <span>ID: {workOrder.id.slice(0, 8)}...</span>
      </div>
    </div>
  );
};

