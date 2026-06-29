// fallow-ignore-file code-duplication
// Duplication rationale: Historical filters mirror live filter selects
import React, { useState } from 'react';
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DateTimePicker } from "@/components/ui/datetime-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from '@/components/ui/button';
import { CalendarIcon, CalendarClock } from "lucide-react";
import { WorkOrderFormData } from '@/features/work-orders/hooks/useWorkOrderForm';
import { HistoricalTimelineEditorDialog } from '@/features/work-orders/components/HistoricalTimelineEditorDialog';
import { useOrganization } from '@/contexts/OrganizationContext';
import {
  synthesizeDefaultTimeline,
  type HistoricalTimelineEvent,
} from '@/features/work-orders/utils/historicalTimeline';
import { formatStatus } from '@/features/work-orders/utils/workOrderHelpers';

interface WorkOrderHistoricalFieldsProps {
  values: Partial<WorkOrderFormData>;
  errors: Record<string, string>;
  setValue: <K extends keyof WorkOrderFormData>(field: K, value: WorkOrderFormData[K]) => void;
}

export const WorkOrderHistoricalFields: React.FC<WorkOrderHistoricalFieldsProps> = ({
  values,
  errors,
  setValue
}) => {
  const { currentOrganization } = useOrganization();
  const [timelineDialogOpen, setTimelineDialogOpen] = useState(false);
  const timelineEvents = values.historicalTimelineEvents;

  const handleOpenTimelineBuilder = () => {
    if (!values.historicalStartDate || !values.status) {
      return;
    }

    if (!timelineEvents || timelineEvents.length === 0) {
      setValue(
        'historicalTimelineEvents',
        synthesizeDefaultTimeline({
          startDate: values.historicalStartDate,
          finalStatus: values.status,
          completedDate: values.completedDate ?? null,
          assigneeId: values.assigneeId ?? null,
        }),
      );
    }

    setTimelineDialogOpen(true);
  };

  const handleTimelineSave = (events: HistoricalTimelineEvent[]) => {
    setValue('historicalTimelineEvents', events);
    const finalEvent = events[events.length - 1];
    if (finalEvent) {
      setValue('status', finalEvent.newStatus);
      if (finalEvent.newStatus === 'completed') {
        setValue('completedDate', new Date(finalEvent.changedAt));
      }
    }
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
      <h3 className="font-medium flex items-center gap-2">
        <CalendarIcon className="h-4 w-4" />
        Historical Information
      </h3>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Start Date *</Label>
          <DateTimePicker
            date={values.historicalStartDate}
            onDateChange={(date) => setValue('historicalStartDate', date)}
            placeholder="Pick start date and time"
          />
          {errors.historicalStartDate && (
            <p className="text-sm text-destructive">{errors.historicalStartDate}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="status">Final Status</Label>
          <Select
            value={values.status || 'accepted'}
            onValueChange={(value) => {
              setValue('status', value as WorkOrderFormData['status']);
              setValue('historicalTimelineEvents', undefined);
              if (value !== 'completed' && value !== 'cancelled') {
                setValue('completedDate', undefined);
              }
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="submitted">Submitted</SelectItem>
              <SelectItem value="accepted">Accepted</SelectItem>
              <SelectItem value="assigned">Assigned</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="on_hold">On Hold</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {(values.status === 'completed' || values.status === 'cancelled') && (
        <div className="space-y-2">
          <Label>Completion Date</Label>
          <DateTimePicker
            date={values.completedDate}
            onDateChange={(date) => {
              setValue('completedDate', date);
              setValue('historicalTimelineEvents', undefined);
            }}
            placeholder="Pick completion date and time"
          />
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="historicalNotes">Historical Notes</Label>
        <Textarea
          id="historicalNotes"
          value={values.historicalNotes || ''}
          onChange={(e) => setValue('historicalNotes', e.target.value)}
          placeholder="Notes about this historical record..."
          rows={2}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={handleOpenTimelineBuilder}
          disabled={!values.historicalStartDate || !values.status || !currentOrganization?.id || !values.equipmentId}
        >
          <CalendarClock className="mr-2 h-4 w-4" />
          Build timeline
        </Button>
        {timelineEvents && timelineEvents.length > 0 ? (
          <p className="text-sm text-muted-foreground">
            Custom timeline with {timelineEvents.length} events ending in {formatStatus(timelineEvents[timelineEvents.length - 1]?.newStatus ?? values.status ?? 'accepted')}.
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Optional. Leave blank to auto-generate a valid timeline from start, final status, and completion date.
          </p>
        )}
      </div>

      {currentOrganization?.id && values.equipmentId ? (
        <HistoricalTimelineEditorDialog
          open={timelineDialogOpen}
          onOpenChange={setTimelineDialogOpen}
          workOrderId="create-mode"
          organizationId={currentOrganization.id}
          equipmentId={values.equipmentId}
          title="Build historical timeline"
          mode="create"
          initialEvents={timelineEvents}
          onCreateSave={handleTimelineSave}
        />
      ) : null}
    </div>
  );
};
