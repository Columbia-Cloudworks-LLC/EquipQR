import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { QuickFormFieldsEditor } from './QuickFormFieldsEditor';
import type { QuickForm } from '@/features/quick-forms/services/quickFormsService';
import {
  parseQuickFormData,
  type QuickFormData,
  type QuickFormField,
} from '@/features/quick-forms/types/quickForm';

export interface QuickFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When set, the dialog edits this form; otherwise it creates a new one. */
  editingForm: QuickForm | null;
  onSubmit: (input: {
    name: string;
    description: string | null;
    formData: QuickFormData;
  }) => Promise<void>;
  isSaving: boolean;
}

export function QuickFormDialog({
  open,
  onOpenChange,
  editingForm,
  onSubmit,
  isSaving,
}: QuickFormDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [fields, setFields] = useState<QuickFormField[]>([]);
  const [collectLocation, setCollectLocation] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editingForm) {
      const parsed = parseQuickFormData(editingForm.form_data);
      setName(editingForm.name);
      setDescription(editingForm.description ?? '');
      setFields(parsed.fields);
      setCollectLocation(parsed.collectLocation === true);
    } else {
      setName('');
      setDescription('');
      setFields([]);
      setCollectLocation(false);
    }
  }, [open, editingForm]);

  const validFields = fields.filter((field) => field.label.trim().length > 0);
  const canSave = name.trim().length > 0 && validFields.length > 0 && !isSaving;

  const handleSave = async () => {
    if (!canSave) return;
    await onSubmit({
      name: name.trim(),
      description: description.trim() || null,
      formData: {
        fields: validFields.map((field) => ({ ...field, label: field.label.trim() })),
        collectLocation,
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[calc(100dvh-2rem)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingForm ? 'Edit Quick Form' : 'New Quick Form'}</DialogTitle>
          <DialogDescription>
            Quick forms collect data from anyone with the QR link — no sign-in
            required. Only organization owners and admins can see submissions.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="quick-form-name">Form name</Label>
            <Input
              id="quick-form-name"
              value={name}
              placeholder="e.g. Job Site Time Sheet"
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="quick-form-description">Description (optional)</Label>
            <Textarea
              id="quick-form-description"
              value={description}
              placeholder="Shown to submitters at the top of the form"
              rows={2}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <Switch
              id="quick-form-collect-location"
              checked={collectLocation}
              onCheckedChange={setCollectLocation}
            />
            <Label htmlFor="quick-form-collect-location" className="text-sm">
              Ask submitters for their GPS location (optional consent)
            </Label>
          </div>

          <div className="space-y-1.5">
            <Label>Fields</Label>
            <QuickFormFieldsEditor fields={fields} onChange={setFields} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={() => void handleSave()} disabled={!canSave}>
            {isSaving ? 'Saving…' : editingForm ? 'Save changes' : 'Create form'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
