import React from 'react';
import { Button } from "@/components/ui/button";
import { Plus, Upload } from 'lucide-react';

interface EquipmentHeaderProps {
  organizationName: string;
  canCreate: boolean;
  canImport: boolean;
  onAddEquipment: () => void;
  onImportCsv: () => void;
}

const EquipmentHeader: React.FC<EquipmentHeaderProps> = ({
  organizationName,
  canCreate,
  canImport,
  onAddEquipment,
  onImportCsv
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4" data-testid="equipment-header">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Equipment</h1>
        <p className="text-muted-foreground">
          Manage equipment for {organizationName}
        </p>
      </div>
      <div className="flex flex-col sm:flex-row gap-2" data-testid="button-container">
        {canImport && (
          <Button 
            variant="outline"
            onClick={onImportCsv} 
            className="flex items-center gap-2 w-full sm:w-auto"
          >
            <Upload className="h-4 w-4" />
            Import CSV
          </Button>
        )}
        {canCreate && (
          <Button 
            onClick={onAddEquipment} 
            className="flex items-center gap-2 w-full sm:w-auto"
          >
            <Plus className="h-4 w-4" />
            Add Equipment
          </Button>
        )}
      </div>
    </div>
  );
};

export default EquipmentHeader;