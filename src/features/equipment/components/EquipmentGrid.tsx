import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Forklift } from 'lucide-react';
import EquipmentCard from './EquipmentCard';

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
}

interface EquipmentGridProps {
  equipment: Equipment[];
  searchQuery: string;
  statusFilter: string;
  organizationName: string;
  canCreate: boolean;
  onShowQRCode: (id: string) => void;
  onAddEquipment: () => void;
}

const EquipmentGrid: React.FC<EquipmentGridProps> = ({
  equipment,
  searchQuery,
  statusFilter,
  organizationName,
  canCreate,
  onShowQRCode,
  onAddEquipment
}) => {
  if (equipment.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <Forklift className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No equipment found</h3>
          <p className="text-muted-foreground mb-4">
            {searchQuery || statusFilter !== 'all' 
              ? 'No equipment matches your current filters.' 
              : `Get started by adding your first piece of equipment to ${organizationName}.`}
          </p>
          {(!searchQuery && statusFilter === 'all' && canCreate) && (
            <Button onClick={onAddEquipment}>
              <Plus className="h-4 w-4 mr-2" />
              Add Equipment
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:gap-6 md:grid-cols-2 lg:grid-cols-3">
      {equipment.map((item) => (
        <EquipmentCard
          key={item.id}
          equipment={item}
          onShowQRCode={onShowQRCode}
        />
      ))}
    </div>
  );
};

export default EquipmentGrid;