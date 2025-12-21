import React from 'react';
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Wrench, Info, CheckCircle2, Globe } from "lucide-react";
import { WorkOrderFormData } from '@/features/work-orders/hooks/useWorkOrderForm';
import { usePMTemplates } from '@/hooks/usePMTemplates';
import { useSimplifiedOrganizationRestrictions } from '@/hooks/useSimplifiedOrganizationRestrictions';

interface WorkOrderPMSectionProps {
  values: WorkOrderFormData & { pmTemplateId?: string };
  setValue: (field: keyof (WorkOrderFormData & { pmTemplateId?: string }), value: string | boolean | null) => void;
  selectedEquipment?: { 
    id: string; 
    name: string; 
    default_pm_template_id?: string | null;
  } | null;
}

export const WorkOrderPMSection: React.FC<WorkOrderPMSectionProps> = ({
  values,
  setValue,
  selectedEquipment
}) => {
  const { data: allTemplates = [], isLoading } = usePMTemplates();
  const { restrictions } = useSimplifiedOrganizationRestrictions();
  
  // Check if equipment has an assigned template
  const hasAssignedTemplate = selectedEquipment?.default_pm_template_id;
  const assignedTemplate = hasAssignedTemplate 
    ? allTemplates.find(t => t.id === selectedEquipment.default_pm_template_id)
    : null;
  
  // Filter templates based on user restrictions (only if no assigned template)
  // BUT: Always include the template from values.pmTemplateId if it exists (for edit mode)
  let templates = !hasAssignedTemplate 
    ? (restrictions.canCreateCustomPMTemplates 
        ? allTemplates 
        : allTemplates.filter(t => !t.organization_id)) // Only global templates for free users
    : [];
  
  // If we're in edit mode and have a pmTemplateId, ensure that template is in the list
  if (values.pmTemplateId && !hasAssignedTemplate) {
    const currentTemplate = allTemplates.find(t => t.id === values.pmTemplateId);
    if (currentTemplate && !templates.find(t => t.id === currentTemplate.id)) {
      // Add the current template to the list even if it would normally be filtered out
      templates = [...templates, currentTemplate];
    }
  }
  
  // Find the selected template - prioritize the one from form values
  const selectedTemplate = assignedTemplate || 
                          (values.pmTemplateId && templates.find(t => t.id === values.pmTemplateId)) ||
                          templates.find(t => t.name === 'Forklift PM') || 
                          templates[0];
  
  // Auto-set assigned template when equipment is selected
  React.useEffect(() => {
    if (hasAssignedTemplate && assignedTemplate && values.hasPM) {
      setValue('pmTemplateId', assignedTemplate.id);
    }
  }, [hasAssignedTemplate, assignedTemplate, values.hasPM, setValue]);

  const handleTemplateChange = (templateId: string) => {
    setValue('pmTemplateId', templateId);
  };

  return (
    <>
      <div className="flex items-center space-x-2 p-3 border rounded-lg bg-muted/50">
        <Checkbox
          id="hasPM"
          checked={values.hasPM}
          onCheckedChange={(checked) => setValue('hasPM', checked as boolean)}
        />
        <div className="flex items-center gap-2">
          <Wrench className="h-4 w-4 text-primary" />
          <Label htmlFor="hasPM" className="text-sm font-medium cursor-pointer">
            Include Preventative Maintenance
          </Label>
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
                  This equipment uses the assigned PM template. Template selection is not available.
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
                  {!restrictions.canCreateCustomPMTemplates && allTemplates.some(t => t.organization_id) && (
                    <div className="px-2 py-1 text-xs text-muted-foreground border-t">
                      Custom templates require user licenses
                    </div>
                  )}
                </SelectContent>
              </Select>
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

