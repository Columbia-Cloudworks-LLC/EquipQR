import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  ChevronDown, 
  ChevronUp, 
  Clipboard, 
  MapPin, 
  Calendar, 
  User,
  Clock,
  DollarSign
} from 'lucide-react';
import { WorkOrderQuickActions } from './WorkOrderQuickActions';
import { useEquipmentCurrentWorkingHours } from '@/hooks/useEquipmentWorkingHours';

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
  onStatusChange?: (status: string) => void;
  onPriorityChange?: (priority: string) => void;
  onViewEquipment?: () => void;
  onAddNote?: () => void;
  onUploadImage?: () => void;
  onDownloadPDF?: () => void;
  onViewPMDetails?: () => void;
  canEdit?: boolean;
}

export const WorkOrderDetailsMobile: React.FC<WorkOrderDetailsMobileProps> = ({
  workOrder,
  equipment,
  team,
  assignee,
  costs,
  onStatusChange,
  onPriorityChange,
  onViewEquipment,
  onAddNote,
  onUploadImage,
  onDownloadPDF,
  onViewPMDetails,
  canEdit = false
}) => {
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(true);
  const [isEquipmentExpanded, setIsEquipmentExpanded] = useState(true);
  const [isCostsExpanded, setIsCostsExpanded] = useState(false);
  
  // Get equipment working hours (current for reference)
  const { data: currentWorkingHours, isLoading: workingHoursLoading } = useEquipmentCurrentWorkingHours(
    equipment?.id || ''
  );
  
  // Use historical working hours from work order if available, otherwise show current
  const workingHours = workOrder.equipment_working_hours_at_creation ?? currentWorkingHours;

  return (
    <div className="space-y-4">
      {/* Quick Actions Card */}
      <Card>
        <CardContent className="p-4">
          <WorkOrderQuickActions
            workOrder={workOrder}
            equipment={equipment}
            onStatusChange={onStatusChange}
            onPriorityChange={onPriorityChange}
            onViewEquipment={onViewEquipment}
            onAddNote={onAddNote}
            onUploadImage={onUploadImage}
            onDownloadPDF={onDownloadPDF}
            onViewPMDetails={onViewPMDetails}
            canEdit={canEdit}
          />
        </CardContent>
      </Card>

      {/* Work Order Details Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Clipboard className="h-5 w-5" />
            Work Order Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Description - Expandable */}
          {workOrder.description && (
            <div>
              <Collapsible open={isDescriptionExpanded} onOpenChange={setIsDescriptionExpanded}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="p-0 h-auto justify-start text-left">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Description</span>
                      {isDescriptionExpanded ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </div>
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {workOrder.description}
                  </p>
                </CollapsibleContent>
              </Collapsible>
            </div>
          )}

          {/* Equipment Information - Expandable */}
          {equipment && (
            <div>
              <Collapsible open={isEquipmentExpanded} onOpenChange={setIsEquipmentExpanded}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="p-0 h-auto justify-start text-left">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Equipment Information</span>
                      {isEquipmentExpanded ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </div>
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 space-y-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{equipment.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {equipment.status}
                      </Badge>
                    </div>
                    {equipment.manufacturer && equipment.model && (
                      <p className="text-sm text-muted-foreground">
                        {equipment.manufacturer} {equipment.model}
                      </p>
                    )}
                    {equipment.serial_number && (
                      <p className="text-sm text-muted-foreground">
                        Serial: {equipment.serial_number}
                      </p>
                    )}
                    {equipment.location && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        <span>{equipment.location}</span>
                      </div>
                    )}
                    
                    {/* Working Hours KPI */}
                    <div className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-blue-900 dark:text-blue-100 text-sm">
                            {workOrder.equipment_working_hours_at_creation ? 'Working Hours (at creation):' : 'Working Hours:'}
                          </span>
                          <span className="text-blue-700 dark:text-blue-300 font-semibold text-sm">
                            {workingHoursLoading ? (
                              <span className="animate-pulse">Loading...</span>
                            ) : (
                              `${workingHours?.toLocaleString() || 0} hrs`
                            )}
                          </span>
                        </div>
                        {workOrder.equipment_working_hours_at_creation && (
                          <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                            Historical snapshot from work order creation
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          )}

          {/* Work Order Metadata */}
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <span>Created</span>
              </div>
              <span>{workOrder.created_at ? new Date(workOrder.created_at).toLocaleDateString() : 'N/A'}</span>
            </div>
            
            {workOrder.due_date && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>Due Date</span>
                </div>
                <span>{new Date(workOrder.due_date).toLocaleDateString()}</span>
              </div>
            )}

            {team && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-muted-foreground">
                  <User className="h-3 w-3" />
                  <span>Team</span>
                </div>
                <span>{team.name}</span>
              </div>
            )}

            {assignee && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-muted-foreground">
                  <User className="h-3 w-3" />
                  <span>Assigned to</span>
                </div>
                <span>{assignee.name}</span>
              </div>
            )}
          </div>

          {/* Costs - Expandable */}
          {costs && costs.items.length > 0 && (
            <div>
              <Collapsible open={isCostsExpanded} onOpenChange={setIsCostsExpanded}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="p-0 h-auto justify-start text-left">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      <span className="font-medium">Costs</span>
                      <Badge variant="outline" className="text-xs">
                        ${costs.total.toFixed(2)}
                      </Badge>
                      {isCostsExpanded ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </div>
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 space-y-1">
                  {costs.items.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{item.description}</span>
                      <span>${item.amount.toFixed(2)}</span>
                    </div>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
