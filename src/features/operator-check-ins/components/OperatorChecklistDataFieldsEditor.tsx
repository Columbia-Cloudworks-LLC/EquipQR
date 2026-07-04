import { MapPin, User, Wrench } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
  CLIENT_CONTEXT_FIELD_OPTIONS,
  EQUIPMENT_SNAPSHOT_FIELD_OPTIONS,
  OPERATOR_INPUT_TYPE_OPTIONS,
  type OperatorChecklistDataField,
  type OperatorFieldSource,
} from '@/features/operator-check-ins/types/operatorChecklist';
import { createOperatorDataField } from '@/features/operator-check-ins/services/operatorChecklistTemplatesService';
import {
  OperatorChecklistRowCard,
  RequiredBadge,
} from '@/features/operator-check-ins/components/OperatorChecklistRowCard';
import { useOperatorChecklistExpandedRows } from '@/features/operator-check-ins/hooks/useOperatorChecklistExpandedRows';

interface OperatorChecklistDataFieldsEditorProps {
  fields: OperatorChecklistDataField[];
  onChange: (fields: OperatorChecklistDataField[]) => void;
}

const SOURCE_META: Record<
  OperatorFieldSource,
  { label: string; icon: typeof User; badgeVariant: 'default' | 'secondary' | 'outline' }
> = {
  operator_input: { label: 'Operator input', icon: User, badgeVariant: 'default' },
  client_context: { label: 'Client context', icon: MapPin, badgeVariant: 'secondary' },
  equipment_snapshot: { label: 'Equipment snapshot', icon: Wrench, badgeVariant: 'outline' },
};

function resolveFieldSubtitle(field: OperatorChecklistDataField): string {
  if (field.source === 'operator_input') {
    const option = OPERATOR_INPUT_TYPE_OPTIONS.find((o) => o.key === (field.inputType ?? 'text'));
    return option?.label ?? 'Short text';
  }
  if (field.source === 'client_context') {
    const option = CLIENT_CONTEXT_FIELD_OPTIONS.find((o) => o.key === field.clientKey);
    return option?.label ?? 'Client context field';
  }
  const option = EQUIPMENT_SNAPSHOT_FIELD_OPTIONS.find((o) => o.key === field.equipmentKey);
  return option?.label ?? 'Equipment field';
}

function sourceSpecificSelectLabel(source: OperatorFieldSource): string {
  switch (source) {
    case 'operator_input':
      return 'Answer type';
    case 'client_context':
      return 'Client context field';
    case 'equipment_snapshot':
      return 'Equipment field';
    default: {
      const _exhaustive: never = source;
      return _exhaustive;
    }
  }
}

export function OperatorChecklistDataFieldsEditor({
  fields,
  onChange,
}: OperatorChecklistDataFieldsEditorProps) {
  const { expandedIds, setRowOpen, clearExpanded, expandRow } = useOperatorChecklistExpandedRows();

  function updateField(index: number, patch: Partial<OperatorChecklistDataField>) {
    onChange(fields.map((field, i) => (i === index ? { ...field, ...patch } : field)));
  }

  function removeField(index: number) {
    const removedId = fields[index]?.id;
    onChange(fields.filter((_, i) => i !== index));
    if (removedId) clearExpanded(removedId);
  }

  function addField(source: OperatorFieldSource) {
    const newField = createOperatorDataField(source);
    onChange([...fields, newField]);
    expandRow(newField.id);
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Captured data fields</CardTitle>
        <CardDescription>
          Choose what operators enter, what the device captures automatically, and which equipment
          record values appear on the public check-in form.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => addField('operator_input')}>
            <User className="mr-2 h-4 w-4" />
            Add operator field
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => addField('client_context')}>
            <MapPin className="mr-2 h-4 w-4" />
            Add client field
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => addField('equipment_snapshot')}>
            <Wrench className="mr-2 h-4 w-4" />
            Add equipment field
          </Button>
        </div>

        {fields.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No captured fields yet. Add at least one field if operators should provide details before
            completing the checklist.
          </p>
        ) : (
          fields.map((field, index) => {
            const meta = SOURCE_META[field.source];
            const SourceIcon = meta.icon;
            return (
              <OperatorChecklistRowCard
                key={field.id}
                title={field.label}
                emptyTitle="Untitled field"
                subtitle={resolveFieldSubtitle(field)}
                icon={<SourceIcon className="h-4 w-4" />}
                badges={
                  <>
                    <Badge variant={meta.badgeVariant} className="font-normal">
                      {meta.label}
                    </Badge>
                    {field.required && field.source === 'operator_input' && <RequiredBadge />}
                  </>
                }
                isOpen={expandedIds.has(field.id)}
                onOpenChange={(open) => setRowOpen(field.id, open)}
                onRemove={() => removeField(index)}
                removeLabel={`Remove field ${field.label || index + 1}`}
              >
                <div className="space-y-2">
                  <Label htmlFor={`field-label-${field.id}`}>Field label</Label>
                  <Input
                    id={`field-label-${field.id}`}
                    value={field.label}
                    onChange={(e) => updateField(index, { label: e.target.value })}
                    placeholder="Label shown on the check-in form"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor={`field-source-${field.id}`}>Where this value comes from</Label>
                    <Select
                      value={field.source}
                      onValueChange={(value) =>
                        updateField(
                          index,
                          createOperatorDataField(value as OperatorFieldSource, {
                            id: field.id,
                            label: field.label,
                            required: field.required,
                            helpText: field.helpText,
                          }),
                        )
                      }
                    >
                      <SelectTrigger id={`field-source-${field.id}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="operator_input">Operator enters value</SelectItem>
                        <SelectItem value="client_context">Client/device context</SelectItem>
                        <SelectItem value="equipment_snapshot">Equipment record snapshot</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`field-specific-${field.id}`}>
                      {sourceSpecificSelectLabel(field.source)}
                    </Label>
                    {field.source === 'operator_input' && (
                      <Select
                        value={field.inputType ?? 'text'}
                        onValueChange={(value) =>
                          updateField(index, {
                            inputType: value as OperatorChecklistDataField['inputType'],
                          })
                        }
                      >
                        <SelectTrigger id={`field-specific-${field.id}`}>
                          <SelectValue placeholder="Input type" />
                        </SelectTrigger>
                        <SelectContent>
                          {OPERATOR_INPUT_TYPE_OPTIONS.map((option) => (
                            <SelectItem key={option.key} value={option.key}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    {field.source === 'client_context' && (
                      <Select
                        value={field.clientKey ?? ''}
                        onValueChange={(value) =>
                          updateField(index, {
                            clientKey: value as OperatorChecklistDataField['clientKey'],
                          })
                        }
                      >
                        <SelectTrigger id={`field-specific-${field.id}`}>
                          <SelectValue placeholder="Client context field" />
                        </SelectTrigger>
                        <SelectContent>
                          {CLIENT_CONTEXT_FIELD_OPTIONS.map((option) => (
                            <SelectItem key={option.key} value={option.key}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    {field.source === 'equipment_snapshot' && (
                      <Select
                        value={field.equipmentKey ?? ''}
                        onValueChange={(value) =>
                          updateField(index, {
                            equipmentKey: value as OperatorChecklistDataField['equipmentKey'],
                          })
                        }
                      >
                        <SelectTrigger id={`field-specific-${field.id}`}>
                          <SelectValue placeholder="Equipment field" />
                        </SelectTrigger>
                        <SelectContent>
                          {EQUIPMENT_SNAPSHOT_FIELD_OPTIONS.map((option) => (
                            <SelectItem key={option.key} value={option.key}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`field-help-${field.id}`}>Help text (optional)</Label>
                  <Input
                    id={`field-help-${field.id}`}
                    value={field.helpText ?? ''}
                    onChange={(e) => updateField(index, { helpText: e.target.value || undefined })}
                    placeholder="Short hint shown below the label on the form"
                  />
                </div>

                {field.source === 'operator_input' && (
                  <div className="flex items-center justify-between rounded-md border px-3 py-2">
                    <div className="space-y-0.5">
                      <Label htmlFor={`field-required-${field.id}`}>Require an answer</Label>
                      <p className="text-xs text-muted-foreground">
                        Operators cannot submit until this field is filled in.
                      </p>
                    </div>
                    <Switch
                      id={`field-required-${field.id}`}
                      checked={Boolean(field.required)}
                      onCheckedChange={(checked) => updateField(index, { required: checked })}
                    />
                  </div>
                )}
              </OperatorChecklistRowCard>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
