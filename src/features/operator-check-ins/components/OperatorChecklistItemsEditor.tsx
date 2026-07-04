import { ClipboardCheck, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { createDefaultOperatorChecklistItem } from '@/features/operator-check-ins/services/operatorChecklistTemplatesService';
import type { OperatorChecklistTemplateItem } from '@/features/operator-check-ins/types/operatorChecklist';
import {
  OperatorChecklistRowCard,
  RequiredBadge,
} from '@/features/operator-check-ins/components/OperatorChecklistRowCard';
import { useOperatorChecklistExpandedRows } from '@/features/operator-check-ins/hooks/useOperatorChecklistExpandedRows';

interface OperatorChecklistItemsEditorProps {
  items: OperatorChecklistTemplateItem[];
  onChange: (items: OperatorChecklistTemplateItem[]) => void;
  defaultSection?: string;
}

export function OperatorChecklistItemsEditor({
  items,
  onChange,
  defaultSection = 'Daily Safety',
}: OperatorChecklistItemsEditorProps) {
  const { expandedIds, setRowOpen, clearExpanded, expandRow } = useOperatorChecklistExpandedRows();

  function updateItem(index: number, patch: Partial<OperatorChecklistTemplateItem>) {
    onChange(items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  function removeItem(index: number) {
    const removedId = items[index]?.id;
    onChange(items.filter((_, i) => i !== index));
    if (removedId) clearExpanded(removedId);
  }

  function addItem() {
    const newItem = createDefaultOperatorChecklistItem(defaultSection);
    onChange([...items, newItem]);
    expandRow(newItem.id);
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="space-y-1">
            <CardTitle className="text-base">Pass/fail checklist items</CardTitle>
            <CardDescription>
              Safety or operational checks operators mark pass or fail after completing captured
              fields.
            </CardDescription>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={addItem}>
            <Plus className="mr-2 h-4 w-4" />
            Add item
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No checklist items yet. Add pass/fail items grouped by section for operators to
            complete.
          </p>
        ) : (
          items.map((item, index) => (
            <OperatorChecklistRowCard
              key={item.id}
              title={item.title}
              emptyTitle="Untitled item"
              subtitle={item.section.trim() || 'No section'}
              icon={<ClipboardCheck className="h-4 w-4" />}
              badges={
                <>
                  {item.section.trim() && (
                    <Badge variant="outline" className="font-normal">
                      {item.section}
                    </Badge>
                  )}
                  {item.required && <RequiredBadge />}
                </>
              }
              isOpen={expandedIds.has(item.id)}
              onOpenChange={(open) => setRowOpen(item.id, open)}
              onRemove={() => removeItem(index)}
              removeLabel={`Remove checklist item ${item.title || index + 1}`}
            >
              <div className="space-y-2">
                <Label htmlFor={`item-title-${item.id}`}>Checklist item</Label>
                <Input
                  id={`item-title-${item.id}`}
                  value={item.title}
                  onChange={(e) => updateItem(index, { title: e.target.value })}
                  placeholder="What the operator checks (e.g. Brakes functional)"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`item-section-${item.id}`}>Section</Label>
                <Input
                  id={`item-section-${item.id}`}
                  value={item.section}
                  onChange={(e) => updateItem(index, { section: e.target.value })}
                  placeholder="Group name shown on the form (e.g. Daily Safety)"
                />
              </div>

              <div className="flex items-center justify-between rounded-md border px-3 py-2">
                <div className="space-y-0.5">
                  <Label htmlFor={`item-required-${item.id}`}>Required to complete check-in</Label>
                  <p className="text-xs text-muted-foreground">
                    Operators must answer this item before submitting.
                  </p>
                </div>
                <Switch
                  id={`item-required-${item.id}`}
                  checked={item.required}
                  onCheckedChange={(checked) => updateItem(index, { required: checked })}
                />
              </div>
            </OperatorChecklistRowCard>
          ))
        )}
      </CardContent>
    </Card>
  );
}
