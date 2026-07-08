import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  createQuickFormFieldId,
  QUICK_FORM_INPUT_TYPES,
  type QuickFormField,
  type QuickFormInputType,
} from '@/features/quick-forms/types/quickForm';

export interface QuickFormFieldsEditorProps {
  fields: QuickFormField[];
  onChange: (fields: QuickFormField[]) => void;
}

/**
 * Admin editor for the quick form field list (#1184): the who / what / when /
 * where / how / why questions the public form collects.
 */
export function QuickFormFieldsEditor({ fields, onChange }: QuickFormFieldsEditorProps) {
  const updateField = (fieldId: string, patch: Partial<QuickFormField>) => {
    onChange(fields.map((field) => (field.id === fieldId ? { ...field, ...patch } : field)));
  };

  const removeField = (fieldId: string) => {
    onChange(fields.filter((field) => field.id !== fieldId));
  };

  const addField = () => {
    onChange([
      ...fields,
      { id: createQuickFormFieldId(), label: '', inputType: 'text', required: true },
    ]);
  };

  return (
    <div className="space-y-3">
      {fields.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No fields yet. Add the questions this form should collect.
        </p>
      )}

      {fields.map((field, index) => (
        <div
          key={field.id}
          className="rounded-md border p-3 space-y-3"
          data-testid="quick-form-field-row"
        >
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor={`qf-field-label-${field.id}`}>Field label</Label>
              <Input
                id={`qf-field-label-${field.id}`}
                value={field.label}
                placeholder={`Question ${index + 1} (e.g. Employee name)`}
                onChange={(e) => updateField(field.id, { label: e.target.value })}
              />
            </div>
            <div className="w-full sm:w-44 space-y-1.5">
              <Label htmlFor={`qf-field-type-${field.id}`}>Type</Label>
              <Select
                value={field.inputType}
                onValueChange={(value) =>
                  updateField(field.id, { inputType: value as QuickFormInputType })
                }
              >
                <SelectTrigger id={`qf-field-type-${field.id}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {QUICK_FORM_INPUT_TYPES.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor={`qf-field-help-${field.id}`}>Help text (optional)</Label>
              <Input
                id={`qf-field-help-${field.id}`}
                value={field.helpText ?? ''}
                placeholder="Shown under the field on the public form"
                onChange={(e) =>
                  updateField(field.id, { helpText: e.target.value || undefined })
                }
              />
            </div>
            <div className="flex items-center gap-2 pb-2">
              <Checkbox
                id={`qf-field-required-${field.id}`}
                checked={field.required !== false}
                onCheckedChange={(checked) =>
                  updateField(field.id, { required: checked === true })
                }
              />
              <Label htmlFor={`qf-field-required-${field.id}`} className="text-sm">
                Required
              </Label>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={() => removeField(field.id)}
                aria-label={`Remove field ${field.label || index + 1}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      ))}

      <Button type="button" variant="outline" size="sm" onClick={addField}>
        <Plus className="h-4 w-4 mr-2" />
        Add field
      </Button>
    </div>
  );
}
