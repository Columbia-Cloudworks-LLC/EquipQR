import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, QrCode, MapPin, Calendar, Trash2, Clock } from 'lucide-react';
import { Tables } from '@/integrations/supabase/types';

type Equipment = Tables<'equipment'>;

interface MobileEquipmentHeaderProps {
  equipment: Equipment;
  onShowQRCode: () => void;
  canDelete?: boolean;
  onDelete?: () => void;
  onShowWorkingHours?: () => void;
}

const MobileEquipmentHeader: React.FC<MobileEquipmentHeaderProps> = ({
  equipment,
  onShowQRCode,
  canDelete = false,
  onDelete,
  onShowWorkingHours,
}) => {
  const navigate = useNavigate();

  return (
    <div className="space-y-4">
      {/* Navigation and Actions */}
      <div className="flex items-center justify-between">
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => navigate('/dashboard/equipment')}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={onShowQRCode}>
            <QrCode className="h-4 w-4" />
          </Button>
          {canDelete && onDelete && (
            <Button size="sm" variant="destructive" onClick={onDelete}>
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Equipment Title */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold leading-tight">{equipment.name}</h1>
        <p className="text-sm text-muted-foreground">
          {equipment.manufacturer} {equipment.model}
        </p>
        <p className="text-sm text-muted-foreground">
          S/N: {equipment.serial_number}
        </p>
      </div>

      {/* Quick Info Cards */}
      <div className="grid grid-cols-1 gap-3">
        {/* Working Hours KPI */}
        {onShowWorkingHours && (
          <button
            onClick={onShowWorkingHours}
            className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors text-left w-full"
          >
            <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">Working Hours</p>
              <p className="text-sm text-muted-foreground">
                {equipment.working_hours?.toLocaleString() || '0'} hours
              </p>
            </div>
          </button>
        )}
        
        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
          <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Location</p>
            <p className="text-sm text-muted-foreground truncate">{equipment.location}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
          <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Last Maintenance</p>
            <p className="text-sm text-muted-foreground">
              {equipment.last_maintenance ? 
                new Date(equipment.last_maintenance).toLocaleDateString() : 
                'Not recorded'
              }
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobileEquipmentHeader;