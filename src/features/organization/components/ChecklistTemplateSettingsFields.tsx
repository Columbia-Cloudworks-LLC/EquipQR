import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { SaveStatus } from '@/components/ui/SaveStatus';
import { Globe, Shield, Lock } from 'lucide-react';
import type { ChecklistTemplateEditorTemplate } from '@/features/organization/components/checklistTemplateEditorTypes';

type ChecklistTemplateSettingsFieldsProps = {
  template?: ChecklistTemplateEditorTemplate | null;
  templateName: string;
  templateDescription: string;
  intervalEnabled: boolean;
  intervalValue: number | null;
  intervalType: 'days' | 'hours';
  intervalError: string | null;
  autoSaveStatus: 'saving' | 'saved' | 'error' | 'offline';
  lastSaved: Date | undefined;
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onIntervalEnabledChange: (checked: boolean) => void;
  onIntervalValueChange: (value: number | null) => void;
  onIntervalTypeChange: (value: 'days' | 'hours') => void;
};

export function ChecklistTemplateSettingsFields({
  template,
  templateName,
  templateDescription,
  intervalEnabled,
  intervalValue,
  intervalType,
  intervalError,
  autoSaveStatus,
  lastSaved,
  onNameChange,
  onDescriptionChange,
  onIntervalEnabledChange,
  onIntervalValueChange,
  onIntervalTypeChange,
}: ChecklistTemplateSettingsFieldsProps) {
  return (
    <div className="space-y-3">
      <div>
        <Label htmlFor="templateName">Template Name</Label>
        <Input
          id="templateName"
          value={templateName}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="Enter template name"
        />
      </div>
      <div>
        <Label htmlFor="templateDescription">Description (Optional)</Label>
        <Textarea
          id="templateDescription"
          value={templateDescription}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder="Enter template description"
          rows={2}
        />
      </div>
      <div className="space-y-3 rounded-md border p-4">
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="intervalToggle" className="text-sm font-medium">
              Maintenance Interval
            </Label>
            <p className="text-xs text-muted-foreground mt-0.5">
              Flag equipment as needing attention when this interval is exceeded since the last completed PM.
            </p>
          </div>
          <Switch
            id="intervalToggle"
            checked={intervalEnabled}
            onCheckedChange={onIntervalEnabledChange}
          />
        </div>
        {intervalEnabled && (
          <div className="space-y-2">
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex-1 max-w-[200px]">
                <Label htmlFor="intervalValue" className="text-xs">
                  Every
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="intervalValue"
                    type="number"
                    min={1}
                    value={intervalValue ?? ''}
                    onChange={(e) => {
                      const val = e.target.value ? parseInt(e.target.value, 10) : null;
                      onIntervalValueChange(val);
                    }}
                    placeholder="e.g. 90"
                    className={intervalError ? 'border-destructive' : ''}
                  />
                  <span className="text-sm text-muted-foreground whitespace-nowrap">
                    {intervalType === 'hours' ? 'Working Hours' : 'Calendar Days'}
                  </span>
                </div>
                {intervalError && <p className="text-xs text-destructive mt-1">{intervalError}</p>}
              </div>
              <RadioGroup
                value={intervalType}
                onValueChange={(val) => onIntervalTypeChange(val as 'days' | 'hours')}
                className="flex gap-4 pb-1"
              >
                <div className="flex items-center gap-1.5">
                  <RadioGroupItem value="days" id="interval-days" />
                  <Label htmlFor="interval-days" className="text-sm font-normal cursor-pointer">
                    Calendar Days
                  </Label>
                </div>
                <div className="flex items-center gap-1.5">
                  <RadioGroupItem value="hours" id="interval-hours" />
                  <Label htmlFor="interval-hours" className="text-sm font-normal cursor-pointer">
                    Working Hours
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </div>
        )}
      </div>
      {template && (
        <div className="flex items-center gap-2">
          {!template.organization_id && (
            <Badge variant="secondary">
              <Globe className="w-3 h-3 mr-1" />
              Global
            </Badge>
          )}
          {template.organization_id && <Badge variant="secondary">Organization</Badge>}
          {template.is_protected && (
            <Badge variant="outline">
              <Shield className="w-3 h-3 mr-1" />
              Protected
            </Badge>
          )}
          {!template.is_protected && !template.organization_id && (
            <Badge variant="outline">
              <Lock className="w-3 h-3 mr-1" />
              Read-only
            </Badge>
          )}
          <SaveStatus status={autoSaveStatus} lastSaved={lastSaved} />
        </div>
      )}
    </div>
  );
}
