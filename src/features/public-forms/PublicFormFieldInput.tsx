/**
 * Shared input renderer for public token-gated forms (operator check-ins,
 * quick forms). Renders the right control for the field's input type with
 * consistent label / help-text treatment.
 */

import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { PublicFormInputType } from './publicFormValidation';

export interface PublicFormFieldInputProps {
  fieldId: string;
  label: string;
  inputType: PublicFormInputType;
  required: boolean;
  helpText?: string;
  value: unknown;
  onChange: (value: unknown) => void;
}

export function PublicFormFieldInput({
  fieldId,
  label,
  inputType,
  required,
  helpText,
  value,
  onChange,
}: PublicFormFieldInputProps) {
  if (inputType === 'checkbox') {
    return (
      <div className="flex items-center gap-2">
        <Checkbox
          id={fieldId}
          checked={value === true}
          onCheckedChange={(checked) => onChange(checked === true)}
        />
        <Label htmlFor={fieldId}>{label}</Label>
      </div>
    );
  }

  if (inputType === 'textarea') {
    return (
      <div className="space-y-2">
        <Label htmlFor={fieldId}>{label}{required ? ' *' : ''}</Label>
        {helpText && <p className="text-xs text-muted-foreground">{helpText}</p>}
        <Textarea
          id={fieldId}
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
        />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={fieldId}>{label}{required ? ' *' : ''}</Label>
      {helpText && <p className="text-xs text-muted-foreground">{helpText}</p>}
      <Input
        id={fieldId}
        type={inputType === 'number' ? 'number' : inputType === 'date' ? 'date' : 'text'}
        inputMode={inputType === 'number' ? 'decimal' : undefined}
        value={typeof value === 'string' || typeof value === 'number' ? String(value) : ''}
        onChange={(e) =>
          onChange(
            inputType === 'number'
              ? e.target.value.trim() === ''
                ? ''
                : Number(e.target.value)
              : e.target.value,
          )
        }
      />
    </div>
  );
}
