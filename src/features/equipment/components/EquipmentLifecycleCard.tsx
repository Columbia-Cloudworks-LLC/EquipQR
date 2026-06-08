import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from 'lucide-react';
import { Tables } from '@/integrations/supabase/types';
import { useFormatTimestamp } from '@/hooks/useFormatTimestamp';
import InlineEditField from './InlineEditField';
import { formatDateForInput } from '@/features/equipment/utils/equipmentHelpers';

type Equipment = Tables<'equipment'>;

export type EquipmentLifecycleCardProps = {
  equipment: Equipment;
  canEdit: boolean;
  installationDateFieldId: string;
  warrantyExpirationFieldId: string;
  maintenanceDateFieldId: string;
  lastMaintenanceLink: string | null;
  lastMaintenanceDisplay: string;
  onFieldUpdate: (field: keyof Equipment, value: string) => void | Promise<void>;
};

export function EquipmentLifecycleCard({
  equipment,
  canEdit,
  installationDateFieldId,
  warrantyExpirationFieldId,
  maintenanceDateFieldId,
  lastMaintenanceLink,
  lastMaintenanceDisplay,
  onFieldUpdate,
}: EquipmentLifecycleCardProps) {
  const { formatDate } = useFormatTimestamp();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Lifecycle & Warranty
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor={installationDateFieldId} className="text-sm font-medium text-muted-foreground">Installation Date</label>
            <div className="mt-1">
              <InlineEditField
                value={formatDateForInput(equipment.installation_date)}
                onSave={(value) => onFieldUpdate('installation_date', value)}
                canEdit={canEdit}
                fieldId={installationDateFieldId}
                type="date"
                placeholder="Select installation date"
                className="text-base"
                editAriaLabel="Edit installation date"
              />
            </div>
          </div>

          <div>
            <label htmlFor={warrantyExpirationFieldId} className="text-sm font-medium text-muted-foreground">Warranty Expiration</label>
            <div className="mt-1">
              <InlineEditField
                value={formatDateForInput(equipment.warranty_expiration)}
                onSave={(value) => onFieldUpdate('warranty_expiration', value)}
                canEdit={canEdit}
                fieldId={warrantyExpirationFieldId}
                type="date"
                placeholder="Select warranty expiration date"
                className="text-base"
                editAriaLabel="Edit warranty expiration"
              />
            </div>
          </div>

          <div>
            <label htmlFor={maintenanceDateFieldId} className="text-sm font-medium text-muted-foreground">Last Maintenance</label>
            <div className="mt-1">
              <InlineEditField
                value={formatDateForInput(equipment.last_maintenance)}
                onSave={(value) => onFieldUpdate('last_maintenance', value)}
                canEdit={canEdit}
                fieldId={maintenanceDateFieldId}
                type="date"
                placeholder="Select last maintenance date"
                className="text-base"
                editAriaLabel="Edit last maintenance"
                displayNode={
                  lastMaintenanceLink ? (
                    <Link
                      to={lastMaintenanceLink}
                      className="text-primary hover:underline"
                      aria-label="View work order for last maintenance"
                    >
                      {lastMaintenanceDisplay}
                    </Link>
                  ) : undefined
                }
              />
            </div>
          </div>

          <div>
            <span className="text-sm font-medium text-muted-foreground">Created Date</span>
            <div className="mt-1 text-base text-foreground">
              {equipment.created_at ? formatDate(equipment.created_at) : '—'}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
