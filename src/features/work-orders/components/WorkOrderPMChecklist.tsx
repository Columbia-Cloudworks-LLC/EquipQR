import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CheckCircle2, Globe, Info, X } from 'lucide-react';
import { WorkOrderFormData } from '@/features/work-orders/hooks/useWorkOrderForm';
import {
  PM_TEMPLATE_NONE_VALUE,
  useWorkOrderPMChecklist,
  type WorkOrderPMChecklistEquipment,
  type WorkOrderPMChecklistValues,
} from '@/features/work-orders/hooks/useWorkOrderPMChecklist';
import type { PMTemplate } from '@/features/pm-templates/services/pmChecklistTemplatesService';

interface PMTemplateSelectorProps {
  isLoading: boolean;
  templates: PMTemplate[];
  selectedValue: string;
  onTemplateChange: (templateId: string) => void;
  showLicenseFooter?: boolean;
  canCreateCustomPMTemplates?: boolean;
  assignedTemplate?: PMTemplate | null;
  equipmentName?: string;
}

const PMTemplateSelector: React.FC<PMTemplateSelectorProps> = ({
  isLoading,
  templates,
  selectedValue,
  onTemplateChange,
  showLicenseFooter = false,
  canCreateCustomPMTemplates = true,
  assignedTemplate,
  equipmentName,
}) => {
  if (isLoading) {
    return (
      <div className="rounded-lg border bg-muted/30 p-3">
        <p className="text-sm text-muted-foreground">Loading templates...</p>
      </div>
    );
  }

  return (
    <Select
      value={selectedValue}
      onValueChange={onTemplateChange}
      disabled={isLoading}
    >
      <SelectTrigger id="pm-template-select" aria-label="PM template">
        <SelectValue placeholder="Select a PM template..." />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={PM_TEMPLATE_NONE_VALUE}>None</SelectItem>
        {templates.map((template) => (
          <SelectItem key={template.id} value={template.id}>
            <div className="flex items-center gap-2">
              <span>{template.name}</span>
              {template.organization_id === null && (
                <div className="flex items-center gap-1">
                  <Globe className="h-3 w-3" />
                  <span className="text-xs text-muted-foreground">(Global)</span>
                </div>
              )}
              {assignedTemplate?.id === template.id && equipmentName && (
                <span className="text-xs text-muted-foreground">(Equipment default)</span>
              )}
            </div>
          </SelectItem>
        ))}
        {showLicenseFooter && !canCreateCustomPMTemplates && templates.some(t => t.organization_id) && (
          <div className="border-t px-2 py-1 text-xs text-muted-foreground">
            Custom templates require user licenses
          </div>
        )}
      </SelectContent>
    </Select>
  );
};

interface WorkOrderPMChecklistProps {
  values: WorkOrderPMChecklistValues;
  setValue: <K extends keyof WorkOrderFormData>(field: K, value: WorkOrderFormData[K]) => void;
  selectedEquipment?: WorkOrderPMChecklistEquipment | null;
  allowTemplateOverride?: boolean;
  autoDefaultFromEquipment?: boolean;
}

export const WorkOrderPMChecklist: React.FC<WorkOrderPMChecklistProps> = ({
  values,
  setValue,
  selectedEquipment,
  allowTemplateOverride = false,
  autoDefaultFromEquipment = false,
}) => {
  const {
    templates,
    selectedTemplate,
    assignedTemplate,
    isLoading,
    restrictions,
    handleTemplateChange,
    handleClearTemplate,
    selectValue,
  } = useWorkOrderPMChecklist({
    values,
    setValue,
    selectedEquipment,
    allowTemplateOverride,
    autoDefaultFromEquipment,
  });

  const hasPmSelected = Boolean(values.pmTemplateId);

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="pm-template-select">PM Template</Label>
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            {templates.length === 0 && !isLoading && !hasPmSelected ? (
              <div className="rounded-lg border bg-muted/30 p-3">
                <p className="text-sm text-muted-foreground">
                  No PM templates available. Ask an admin to add templates or assign one on the equipment record.
                </p>
              </div>
            ) : (
              <PMTemplateSelector
                isLoading={isLoading}
                templates={templates}
                selectedValue={selectValue}
                onTemplateChange={handleTemplateChange}
                showLicenseFooter
                canCreateCustomPMTemplates={restrictions.canCreateCustomPMTemplates}
                assignedTemplate={assignedTemplate}
                equipmentName={selectedEquipment?.name}
              />
            )}
          </div>
          {hasPmSelected && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Remove PM template"
              onClick={handleClearTemplate}
              className="shrink-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        {assignedTemplate && selectedEquipment && hasPmSelected && values.pmTemplateId === assignedTemplate.id && (
          <p className="text-xs text-muted-foreground">
            Defaults to the PM template assigned to {selectedEquipment.name}. Choose another template or remove PM if this work order does not need a checklist.
          </p>
        )}
      </div>

      {hasPmSelected && (
        <>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              This work order includes a preventative maintenance checklist that must be completed before the work order can be marked as finished.
            </AlertDescription>
          </Alert>

          {selectedTemplate && (
            <div className="rounded-lg border bg-muted/30 p-3">
              <div className="mb-2 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">PM Checklist Preview</span>
                <span className="text-xs text-muted-foreground">({selectedTemplate.itemCount} items)</span>
              </div>
              <div className="space-y-1 text-xs text-muted-foreground">
                {selectedTemplate.sections.map((section) => (
                  <div key={section.name}>• {section.name} ({section.count} items)</div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
