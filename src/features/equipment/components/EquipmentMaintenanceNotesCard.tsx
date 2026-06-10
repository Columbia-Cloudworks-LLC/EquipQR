import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Wrench } from 'lucide-react';
import { Tables } from '@/integrations/supabase/types';
import InlineEditField from './InlineEditField';

type Equipment = Tables<'equipment'>;

export type EquipmentMaintenanceNotesCardProps = {
  equipment: Equipment;
  canEdit: boolean;
  notesFieldId: string;
  onFieldUpdate: (field: keyof Equipment, value: string) => void | Promise<void>;
};

export function EquipmentMaintenanceNotesCard({
  equipment,
  canEdit,
  notesFieldId,
  onFieldUpdate,
}: EquipmentMaintenanceNotesCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wrench className="h-5 w-5" />
          Maintenance Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label htmlFor={notesFieldId} className="text-sm font-medium text-muted-foreground">Notes</label>
          <div className="mt-1 w-full">
            <InlineEditField
              value={equipment.notes || ''}
              onSave={async (value) => {
                await onFieldUpdate('notes', value);
              }}
              canEdit={canEdit}
              fieldId={notesFieldId}
              type="textarea"
              placeholder="Enter maintenance notes or additional information"
              className="w-full text-base"
              editAriaLabel="Edit notes"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
