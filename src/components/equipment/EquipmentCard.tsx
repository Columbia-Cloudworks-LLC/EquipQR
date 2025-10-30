import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QrCode, MapPin, Calendar, Package, Clock } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { getStatusColor } from '@/utils/equipmentHelpers';

interface Equipment {
  id: string;
  name: string;
  manufacturer: string;
  model: string;
  serial_number: string;
  status: string;
  location: string;
  last_maintenance?: string;
  image_url?: string;
  default_pm_template_id?: string | null;
  working_hours?: number | null;
}

interface EquipmentCardProps {
  equipment: Equipment;
  onShowQRCode: (id: string) => void;
}

const EquipmentCard: React.FC<EquipmentCardProps> = ({
  equipment,
  onShowQRCode
}) => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const handleCardClick = () => {
    navigate(`/dashboard/equipment/${equipment.id}`);
  };

  const handleQRClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onShowQRCode(equipment.id);
  };

  return (
    <Card 
      className="hover:shadow-lg transition-shadow cursor-pointer"
      onClick={handleCardClick}
    >
      <CardHeader className={isMobile ? "p-4 pb-3" : ""}>
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg">{equipment.name}</CardTitle>
            <CardDescription>
              {equipment.manufacturer} {equipment.model}
            </CardDescription>
            <div className="mt-1.5">
              <Badge className={`${getStatusColor(equipment.status)} text-xs`} variant="outline">
                {equipment.status}
              </Badge>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 flex-shrink-0"
            onClick={handleQRClick}
          >
            <QrCode className="h-4 w-4" />
            <span className="sr-only">Show QR Code</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent className={`space-y-3 md:space-y-4 ${isMobile ? "px-4 pb-4" : ""}`}>
        {/* Equipment Image */}
        <div className="aspect-video w-full overflow-hidden rounded-md bg-muted">
          {equipment.image_url ? (
            <img
              src={equipment.image_url}
              alt={`${equipment.name} equipment`}
              className="h-full w-full object-cover transition-transform hover:scale-105"
              onError={(e) => {
                e.currentTarget.src = `https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?w=400&h=300&fit=crop&crop=center`;
              }}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Package className="h-12 w-12 text-muted-foreground/50" />
            </div>
          )}
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <span className="font-medium">Serial:</span>
            <span className="text-muted-foreground break-words">{equipment.serial_number}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="text-muted-foreground truncate">{equipment.location}</span>
          </div>
          <div className={`flex ${isMobile ? 'flex-col items-start gap-1.5' : 'items-center gap-4 flex-wrap'}`}>
            {equipment.last_maintenance && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-muted-foreground text-xs md:text-sm">
                  Last maintenance: {new Date(equipment.last_maintenance).toLocaleDateString()}
                </span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="text-muted-foreground text-xs md:text-sm font-medium">
                {equipment.working_hours?.toLocaleString() || '0'} hours
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default EquipmentCard;