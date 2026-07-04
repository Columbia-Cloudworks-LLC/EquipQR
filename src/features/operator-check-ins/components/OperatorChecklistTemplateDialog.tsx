import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  useCreateOperatorChecklistTemplate,
  useOperatorChecklistTemplate,
  useUpdateOperatorChecklistTemplate,
} from '@/features/operator-check-ins/hooks/useOperatorChecklistTemplates';
import { createDefaultTemplateData } from '@/features/operator-check-ins/services/operatorChecklistTemplatesService';
import type {
  OperatorChecklistDataField,
  OperatorChecklistTemplateItem,
} from '@/features/operator-check-ins/types/operatorChecklist';
import { OperatorChecklistDataFieldsEditor } from '@/features/operator-check-ins/components/OperatorChecklistDataFieldsEditor';
import { OperatorChecklistItemsEditor } from '@/features/operator-check-ins/components/OperatorChecklistItemsEditor';
import { toast } from 'sonner';

interface OperatorChecklistTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  templateId: string | null;
}

export function OperatorChecklistTemplateDialog({
  open,
  onOpenChange,
  organizationId,
  templateId,
}: OperatorChecklistTemplateDialogProps) {
  const isEdit = Boolean(templateId);
  const { data: existing } = useOperatorChecklistTemplate(templateId ?? undefined, organizationId);
  const createMutation = useCreateOperatorChecklistTemplate(organizationId);
  const updateMutation = useUpdateOperatorChecklistTemplate(organizationId);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [dataFields, setDataFields] = useState<OperatorChecklistDataField[]>([]);
  const [items, setItems] = useState<OperatorChecklistTemplateItem[]>([]);

  useEffect(() => {
    if (!open) return;
    if (existing) {
      setName(existing.name);
      setDescription(existing.description ?? '');
      setDataFields(existing.template_data.dataFields);
      setItems(existing.template_data.checklistItems);
    } else if (!isEdit) {
      const defaults = createDefaultTemplateData();
      setName('');
      setDescription('');
      setDataFields(defaults.dataFields);
      setItems(defaults.checklistItems);
    }
  }, [open, existing, isEdit]);

  async function handleSave() {
    if (!name.trim()) {
      toast.error('Template name is required.');
      return;
    }
    const templateData = { dataFields, checklistItems: items };
    try {
      if (isEdit && templateId) {
        await updateMutation.mutateAsync({
          templateId,
          updates: {
            name,
            description,
            templateData,
          },
        });
      } else {
        await createMutation.mutateAsync({
          organizationId,
          name,
          description,
          templateData,
        });
      }
      toast.success('Template saved.');
      onOpenChange(false);
    } catch {
      toast.error('Unable to save template.');
    }
  }

  const editorSessionKey = open ? (templateId ?? 'new') : 'closed';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit operator checklist' : 'New operator checklist'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Template details</CardTitle>
              <CardDescription>
                Name and description help admins identify this checklist when assigning it to
                equipment.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <div className="space-y-2">
                <Label htmlFor="template-name">Name</Label>
                <Input id="template-name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="template-description">Description</Label>
                <Textarea
                  id="template-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  placeholder="Optional internal note for other admins"
                />
              </div>
            </CardContent>
          </Card>

          <OperatorChecklistDataFieldsEditor
            key={editorSessionKey}
            fields={dataFields}
            onChange={setDataFields}
          />

          <OperatorChecklistItemsEditor key={editorSessionKey} items={items} onChange={setItems} />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => void handleSave()}
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
