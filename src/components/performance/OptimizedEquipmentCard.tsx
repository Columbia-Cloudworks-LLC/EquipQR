import React, { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { QrCode, Settings, Calendar } from 'lucide-react';
import { Equipment } from '@/services/supabaseDataService';

interface OptimizedEquipmentCardProps {
  equipment: Equipment;
  onQRClick?: (id: string) => void;
  onEditClick?: (id: string) => void;
  onViewClick?: (id: string) => void;
}

// OPTIMIZED: Memoized component to prevent unnecessary re-renders
const OptimizedEquipmentCard = memo(({ 
  equipment, 
  onQRClick, 
  onEditClick, 
  onViewClick 
}: OptimizedEquipmentCardProps) => {
  const getStatusVariant = (status: Equipment['status']) => {
    switch (status) {
      case 'active':
        return 'default';
      case 'maintenance':
        return 'secondary';
      case 'inactive':
        return 'outline';
      default:
        return 'outline';
    }
  };

  return (
    <Card className="h-full hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg truncate">{equipment.name}</CardTitle>
          <Badge variant={getStatusVariant(equipment.status)}>
            {equipment.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1 text-sm text-muted-foreground">
          <p><span className="font-medium">Model:</span> {equipment.model}</p>
          <p><span className="font-medium">Manufacturer:</span> {equipment.manufacturer}</p>
          <p><span className="font-medium">Serial:</span> {equipment.serial_number}</p>
          <p><span className="font-medium">Location:</span> {equipment.location}</p>
        </div>
        
        {equipment.installation_date && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            Installed: {new Date(equipment.installation_date).toLocaleDateString()}
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => onQRClick?.(equipment.id)}
          >
            <QrCode className="h-4 w-4 mr-1" />
            QR
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => onEditClick?.(equipment.id)}
          >
            <Settings className="h-4 w-4 mr-1" />
            Edit
          </Button>
          <Button
            variant="default"
            size="sm"
            className="flex-1"
            onClick={() => onViewClick?.(equipment.id)}
          >
            View
          </Button>
        </div>
      </CardContent>
    </Card>
  );
});

OptimizedEquipmentCard.displayName = 'OptimizedEquipmentCard';

export default OptimizedEquipmentCard;