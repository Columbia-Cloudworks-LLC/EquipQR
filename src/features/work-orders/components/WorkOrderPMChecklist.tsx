import React from 'react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ClipboardList, Wrench, Info, CheckCircle2, Globe } from "lucide-react";
import { cn } from '@/lib/utils';
import { WorkOrderFormData } from '@/features/work-orders/hooks/useWorkOrderForm';
import { useWorkOrderPMChecklist } from '@/features/work-orders/hooks/useWorkOrderPMChecklist';
import { logger } from '@/utils/logger';

interface WorkOrderPMChecklistProps {
  values: Pick<WorkOrderFormData, 'hasPM' | 'pmTemplateId'>;
  setValue: <K extends keyof WorkOrderFormData>(field: K, value: WorkOrderFormData[K]) => void;
  selectedEquipment?: { 
    id: string; 
    name: string; 
    default_pm_template_id?: string | null;
  } | null;
}

export const WorkOrderPMChecklist: React.FC<WorkOrderPMChecklistProps> = ({
  values,
  setValue,
  selectedEquipment
}) => {
  const {
    templates,
    selectedTemplate,
    assignedTemplate,
    hasAssignedTemplate,
    isLoading,
    restrictions,
    handleTemplateChange
  } = useWorkOrderPMChecklist({
    values,
    setValue,
    selectedEquipment
  });

  // Debug logging to identify the issue
  React.useEffect(() => {
    if (values.hasPM) {
      logger.debug('[PM Checklist Debug]', {
        hasPM: values.hasPM,
        selectedEquipment: selectedEquipment ? {
          id: selectedEquipment.id,
          name: selectedEquipment.name,
          default_pm_template_id: selectedEquipment.default_pm_template_id
        } : 'null/undefined',
        hasAssignedTemplate,
        assignedTemplate: assignedTemplate ? {
          id: assignedTemplate.id,
          name: assignedTemplate.name
        } : 'null',
        templatesCount: templates.length,
        templates: templates.length > 0 ? templates.map(t => ({
          id: t.id,
          name: t.name,
          org_id: t.organization_id
        })) : '[] (EMPTY)',
        isLoading,
        canCreateCustomPMTemplates: restrictions.canCreateCustomPMTemplates,
        pmTemplateId: values.pmTemplateId || 'not set'
      });
    }
  }, [values.hasPM, selectedEquipment, hasAssignedTemplate, assignedTemplate, templates, isLoading, restrictions.canCreateCustomPMTemplates, values.pmTemplateId]);

  return (
    <>
      <div className="space-y-2">
        <Label id="wo-type-label">Work Order Type</Label>
        <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-labelledby="wo-type-label">
          <button
            type="button"
            role="radio"
            aria-checked={!values.hasPM}
            onClick={() => setValue('hasPM', false)}
            className={cn(
              "flex flex-col items-center gap-2 rounded-lg border-2 p-4 text-center transition-all",
              !values.hasPM
                ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                : "border-border hover:border-muted-foreground/40"
            )}
          >
            <ClipboardList className={cn("h-6 w-6", !values.hasPM ? "text-primary" : "text-muted-foreground")} />
            <span className="text-sm font-medium">Standard Work Order</span>
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={values.hasPM}
            onClick={() => setValue('hasPM', true)}
            className={cn(
              "flex flex-col items-center gap-2 rounded-lg border-2 p-4 text-center transition-all",
              values.hasPM
                ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                : "border-border hover:border-muted-foreground/40"
            )}
          >
            <Wrench className={cn("h-6 w-6", values.hasPM ? "text-primary" : "text-muted-foreground")} />
            <span className="text-sm font-medium">With PM Checklist</span>
          </button>
        </div>
      </div>

      {values.hasPM && (
        <div className="space-y-3">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              This work order will include a preventative maintenance checklist that must be completed before the work order can be marked as finished.
            </AlertDescription>
          </Alert>

          {/* Template Selector */}
          <div className="space-y-2">
            <Label htmlFor="pmTemplate">Checklist Template</Label>
            {hasAssignedTemplate && assignedTemplate ? (
              <div className="p-3 border rounded-lg bg-primary/5">
                <div className="flex items-center gap-2">
                  <Wrench className="h-4 w-4 text-primary" />
                  <span className="font-medium">{assignedTemplate.name}</span>
                  <span className="text-xs text-muted-foreground">(Assigned to {selectedEquipment?.name})</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  This equipment uses the assigned PM template. To change it, edit the equipment record.
                </p>
              </div>
            ) : (
              <>
                {isLoading ? (
                  <div className="p-3 border rounded-lg bg-muted/30">
                    <p className="text-sm text-muted-foreground">Loading templates...</p>
                  </div>
                ) : templates.length === 0 ? (
                  <div className="p-3 border rounded-lg bg-muted/30">
                    <p className="text-sm text-muted-foreground">
                      No PM templates available. Please create a template first.
                    </p>
                  </div>
                ) : (
                  <Select
                    value={values.pmTemplateId || ''}
                    onValueChange={handleTemplateChange}
                    disabled={isLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a checklist template..." />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          <div className="flex items-center gap-2">
                            <span>{template.name}</span>
                            {template.organization_id === null && (
                              <div className="flex items-center gap-1">
                                <Globe className="w-3 h-3" />
                                <span className="text-xs text-muted-foreground">(Global)</span>
                              </div>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                      {!restrictions.canCreateCustomPMTemplates && templates.some(t => t.organization_id) && (
                        <div className="px-2 py-1 text-xs text-muted-foreground border-t">
                          Custom templates require user licenses
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                )}
              </>
            )}
          </div>
          
          {/* Template Preview */}
          {selectedTemplate && (
            <div className="bg-muted/30 p-3 rounded-lg border">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">PM Checklist Preview</span>
                <span className="text-xs text-muted-foreground">({selectedTemplate.itemCount} items)</span>
              </div>
              <div className="text-xs text-muted-foreground space-y-1">
                {selectedTemplate.sections.map((section) => (
                  <div key={section.name}>• {section.name} ({section.count} items)</div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
};



