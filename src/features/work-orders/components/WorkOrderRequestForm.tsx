
import React, { useCallback } from 'react';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Forklift, Info, Mic, MicOff } from "lucide-react";
import { useOrganization } from '@/contexts/OrganizationContext';
import { useFormValidation } from '@/hooks/useFormValidation';
import { useAsyncOperation } from '@/hooks/useAsyncOperation';
import { useSpeechToText } from '@/hooks/useSpeechToText';
import { useEquipment, useEquipmentById } from '@/features/equipment/hooks/useEquipment';
import { useCreateWorkOrder, CreateWorkOrderData } from '@/features/work-orders/hooks/useWorkOrderCreation';

const requestFormSchema = z.object({
  title: z.string().min(1, "Title is required").max(100, "Title must be less than 100 characters"),
  description: z.string().min(1, "Description is required").max(1000, "Description must be less than 1000 characters"),
  equipmentId: z.string().min(1, "Equipment is required"),
  dueDate: z.string().optional(),
});

type RequestFormData = z.infer<typeof requestFormSchema>;

interface WorkOrderRequestFormProps {
  open: boolean;
  onClose: () => void;
  equipmentId?: string;
  onSubmit?: (data: RequestFormData) => void;
}

const WorkOrderRequestForm: React.FC<WorkOrderRequestFormProps> = ({ 
  open, 
  onClose, 
  equipmentId,
  onSubmit 
}) => {
  const { currentOrganization } = useOrganization();
  const createWorkOrderMutation = useCreateWorkOrder();
  
  const { data: allEquipment = [] } = useEquipment(currentOrganization?.id);
  const { data: preSelectedEquipment } = useEquipmentById(
    currentOrganization?.id, 
    equipmentId
  );

  const initialValues: Partial<RequestFormData> = {
    title: '',
    description: '',
    equipmentId: equipmentId || '',
    dueDate: '',
  };

  const form = useFormValidation(requestFormSchema, initialValues);

  // Handler to append transcript to the description field
  const handleSpeechResult = useCallback((transcript: string) => {
    const currentValue = (form.values.description as string) || '';
    const separator = currentValue.trim() ? ' ' : '';
    form.setValue('description', currentValue + separator + transcript);
  }, [form]);

  const {
    isSupported: isSpeechSupported,
    isListening,
    error: speechError,
    interimTranscript,
    toggleListening,
  } = useSpeechToText({
    onResult: handleSpeechResult,
  });

  const { execute: submitForm, isLoading: isSubmitting } = useAsyncOperation(
    async (data: RequestFormData) => {
      if (onSubmit) {
        await onSubmit(data);
      } else {
        // Use the createWorkOrder hook (work order starts unassigned)
        const workOrderData: CreateWorkOrderData = {
          title: data.title,
          description: data.description,
          equipmentId: data.equipmentId,
          priority: 'medium', // Default priority for requests
          dueDate: data.dueDate || undefined,
          // Work order starts unassigned; can be assigned to team members later
          assigneeId: undefined,
        };
        
        await createWorkOrderMutation.mutateAsync(workOrderData);
      }
    },
    {
      onSuccess: () => {
        form.reset();
        onClose();
      }
    }
  );

  const handleSubmit = async () => {
    await form.handleSubmit(submitForm);
  };

  const handleClose = () => {
    if (Object.keys(form.values).length > 0) {
      const confirmClose = window.confirm('You have unsaved changes. Are you sure you want to close?');
      if (!confirmClose) return;
    }
    form.reset();
    onClose();
  };

  function renderEquipmentField() {
    if (preSelectedEquipment) {
      return (
        <div className="space-y-2">
          <Label>Equipment</Label>
          <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-md border">
            <Forklift className="h-4 w-4 text-muted-foreground" />
            <div className="flex-1">
              <div className="font-medium">{preSelectedEquipment.name}</div>
              <div className="text-sm text-muted-foreground">
                {preSelectedEquipment.manufacturer} {preSelectedEquipment.model} • {preSelectedEquipment.serial_number}
              </div>
            </div>
            <Badge variant="secondary" className="text-xs">
              Selected
            </Badge>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        <Label>Equipment *</Label>
        <Select 
          value={form.values.equipmentId as string} 
          onValueChange={(value) => form.setValue('equipmentId', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select equipment" />
          </SelectTrigger>
          <SelectContent>
            {allEquipment.map((equipment) => (
              <SelectItem key={equipment.id} value={equipment.id}>
                <div className="flex flex-col">
                  <span>{equipment.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {equipment.manufacturer} {equipment.model} • {equipment.location}
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {form.errors.equipmentId && (
          <p className="text-sm text-destructive">{form.errors.equipmentId}</p>
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[calc(100dvh-2rem)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Request Work Order</DialogTitle>
          <DialogDescription>
            {preSelectedEquipment ? 
              `Submit a work request for ${preSelectedEquipment.name}` :
              'Submit a new work order request for review'
            }
          </DialogDescription>
        </DialogHeader>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Your request will be submitted for review. Once the equipment has a team assigned, work orders can be assigned to team members.
          </AlertDescription>
        </Alert>

        <div className="space-y-6">
          <Card>
            <CardContent className="pt-4 space-y-4">
              <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                Request Details
              </h3>
              
              <div className="space-y-2">
                <Label htmlFor="wo-request-title">Title *</Label>
                <Input
                  id="wo-request-title"
                  placeholder={preSelectedEquipment ? 
                    `Issue with ${preSelectedEquipment.name}` : 
                    "Brief description of the issue or work needed"
                  }
                  value={form.values.title as string || ''}
                  onChange={(e) => form.setValue('title', e.target.value)}
                  aria-invalid={!!form.errors.title}
                  aria-describedby={form.errors.title ? 'wo-request-title-error' : undefined}
                />
                {form.errors.title && (
                  <p id="wo-request-title-error" className="text-sm text-destructive" aria-live="polite">{form.errors.title}</p>
                )}
              </div>

              {renderEquipmentField()}

              <div className="space-y-2">
                <Label htmlFor="wo-request-due-date">Preferred Due Date</Label>
                <Input
                  id="wo-request-due-date"
                  type="date"
                  value={form.values.dueDate as string || ''}
                  onChange={(e) => form.setValue('dueDate', e.target.value)}
                  aria-describedby="wo-request-due-date-hint"
                />
                <p id="wo-request-due-date-hint" className="text-xs text-muted-foreground">
                  Optional - This is a preference, final scheduling will be determined by the assigned team
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="wo-request-description">Description *</Label>
              {isSpeechSupported && (
                <Button
                  type="button"
                  variant={isListening ? "destructive" : "outline"}
                  size="sm"
                  onClick={toggleListening}
                  aria-pressed={isListening}
                  aria-label={isListening ? "Stop voice input" : "Start voice input"}
                  className="h-7 px-2 gap-1"
                >
                  {isListening ? (
                    <>
                      <MicOff className="h-3.5 w-3.5" />
                      <span className="text-xs">Stop</span>
                    </>
                  ) : (
                    <>
                      <Mic className="h-3.5 w-3.5" />
                      <span className="text-xs">Voice</span>
                    </>
                  )}
                </Button>
              )}
            </div>
            <div className="relative">
              <Textarea
                id="wo-request-description"
                placeholder={preSelectedEquipment ? 
                  `Describe the issue or work needed for ${preSelectedEquipment.name}. Include any symptoms, error messages, or specific requirements...` :
                  "Provide detailed information about the work needed, including any symptoms, requirements, or urgency..."
                }
                className="min-h-[120px]"
                value={form.values.description as string || ''}
                onChange={(e) => form.setValue('description', e.target.value)}
                aria-invalid={!!form.errors.description}
                aria-describedby={form.errors.description ? 'wo-request-description-error' : undefined}
              />
              {isListening && interimTranscript && (
                <div className="absolute bottom-2 left-2 right-2 text-xs text-muted-foreground bg-muted/80 rounded px-2 py-1 pointer-events-none">
                  {interimTranscript}...
                </div>
              )}
            </div>
            {speechError && (
              <p className="text-sm text-destructive">{speechError}</p>
            )}
            {form.errors.description && (
              <p id="wo-request-description-error" className="text-sm text-destructive" aria-live="polite">{form.errors.description}</p>
            )}
          </div>

          {form.errors.general && (
            <Alert variant="destructive">
              <AlertDescription>
                {form.errors.general}
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={isSubmitting || !form.isValid || createWorkOrderMutation.isPending}
            >
              {(isSubmitting || createWorkOrderMutation.isPending) ? 'Submitting...' : 'Submit Request'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WorkOrderRequestForm;
