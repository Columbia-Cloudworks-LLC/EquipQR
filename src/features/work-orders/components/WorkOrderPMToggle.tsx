import React from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  PM_TEMPLATE_NONE_VALUE,
  useWorkOrderPMChecklist,
  type WorkOrderPMChecklistEquipment,
  type WorkOrderPMChecklistSetValue,
  type WorkOrderPMChecklistValues,
} from '@/features/work-orders/hooks/useWorkOrderPMChecklist';
import type { PMTemplateSummary } from '@/features/pm-templates/services/pmChecklistTemplatesService';

interface WorkOrderPMToggleProps {
  values: WorkOrderPMChecklistValues;
  setValue: WorkOrderPMChecklistSetValue;
  selectedEquipment?: WorkOrderPMChecklistEquipment | null;
  disabled?: boolean;
  /** Reports the selected template so the caller can render a preview elsewhere. */
  onSelectedTemplateChange?: (template: PMTemplateSummary | null) => void;
  /**
   * Increment to turn PM on from outside (e.g. the "Preventative Maintenance"
   * title chip). Routed through the same path as the switch so it counts as an
   * explicit choice and survives a later equipment change.
   */
  turnOnSignal?: number;
}

/**
 * Compact "Include PM" switch for the work order dialog's side panel. Turning it
 * on picks the equipment's assigned template when there is one; with no
 * template the standard forklift checklist is used.
 */
export const WorkOrderPMToggle: React.FC<WorkOrderPMToggleProps> = ({
  values,
  setValue,
  selectedEquipment,
  disabled = false,
  onSelectedTemplateChange,
  turnOnSignal = 0,
}) => {
  const {
    templates,
    selectedTemplate,
    assignedTemplate,
    isLoading,
    handleTemplateChange,
    handleClearTemplate,
  } = useWorkOrderPMChecklist({
    values,
    setValue,
    selectedEquipment,
    autoDefaultFromEquipment: true,
  });

  const includePM = Boolean(values.hasPM);

  React.useEffect(() => {
    onSelectedTemplateChange?.(includePM ? selectedTemplate : null);
  }, [includePM, selectedTemplate, onSelectedTemplateChange]);

  // The hook's handlers also record that the user chose explicitly, so a later
  // equipment change does not silently override the choice.
  const selectTemplate = (templateId: string | null) => {
    if (templateId) {
      handleTemplateChange(templateId);
      return;
    }
    // No template: PM stays on and uses the standard forklift checklist.
    handleClearTemplate();
    setValue('hasPM', true);
  };

  const handleToggle = (checked: boolean) => {
    if (!checked) {
      handleClearTemplate();
      return;
    }
    selectTemplate(assignedTemplate?.id ?? values.pmTemplateId ?? null);
  };

  const lastTurnOnSignalRef = React.useRef(turnOnSignal);
  React.useEffect(() => {
    if (turnOnSignal === lastTurnOnSignalRef.current) return;
    lastTurnOnSignalRef.current = turnOnSignal;
    if (!values.hasPM) {
      selectTemplate(assignedTemplate?.id ?? values.pmTemplateId ?? null);
    }
    // Only the signal should trigger this; the handlers are recreated every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turnOnSignal]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor="work-order-include-pm" className="cursor-pointer">
          Include PM
        </Label>
        <Switch
          id="work-order-include-pm"
          checked={includePM}
          onCheckedChange={handleToggle}
          disabled={disabled}
        />
      </div>
      {includePM ? (
        <Select
          value={values.pmTemplateId ?? PM_TEMPLATE_NONE_VALUE}
          onValueChange={(templateId) =>
            selectTemplate(templateId === PM_TEMPLATE_NONE_VALUE ? null : templateId)
          }
          disabled={disabled || isLoading}
        >
          <SelectTrigger id="pm-template-select" aria-label="PM template" className="h-9">
            <SelectValue placeholder={isLoading ? 'Loading templates...' : 'Select a PM template...'} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={PM_TEMPLATE_NONE_VALUE}>Standard forklift checklist</SelectItem>
            {templates.map((template) => (
              <SelectItem key={template.id} value={template.id}>
                {template.name}
                {assignedTemplate?.id === template.id ? ' (equipment default)' : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}
    </div>
  );
};
