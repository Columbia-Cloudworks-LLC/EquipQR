import React, { useState, useMemo } from 'react';
import { Search, Forklift, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTeamEquipmentForWorkOrder } from '@/features/work-orders/hooks/useWorkOrderEquipment';

interface WorkOrderMultiEquipmentSelectorProps {
  primaryEquipmentId: string;
  primaryEquipmentTeamId: string;
  workOrderId?: string; // For editing existing work orders
  selectedEquipmentIds: string[];
  onSelectionChange: (equipmentIds: string[]) => void;
}

export const WorkOrderMultiEquipmentSelector: React.FC<WorkOrderMultiEquipmentSelectorProps> = ({
  primaryEquipmentId,
  primaryEquipmentTeamId,
  workOrderId,
  selectedEquipmentIds,
  onSelectionChange,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Get available equipment from the same team, excluding primary equipment
  const excludeIds = [primaryEquipmentId, ...selectedEquipmentIds];
  const { data: availableEquipment = [], isLoading } = useTeamEquipmentForWorkOrder(
    workOrderId || '',
    primaryEquipmentTeamId,
    excludeIds
  );

  // Filter equipment based on search term
  const filteredEquipment = useMemo(() => {
    if (!searchTerm.trim()) return availableEquipment;
    
    const term = searchTerm.toLowerCase();
    return availableEquipment.filter(equipment => 
      equipment.name.toLowerCase().includes(term) ||
      equipment.manufacturer?.toLowerCase().includes(term) ||
      equipment.model?.toLowerCase().includes(term) ||
      equipment.location?.toLowerCase().includes(term)
    );
  }, [availableEquipment, searchTerm]);

  const handleEquipmentToggle = (equipmentId: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedEquipmentIds, equipmentId]);
    } else {
      onSelectionChange(selectedEquipmentIds.filter(id => id !== equipmentId));
    }
  };

  const handleSelectAll = () => {
    const allIds = filteredEquipment.map(eq => eq.id);
    const newSelection = [...new Set([...selectedEquipmentIds, ...allIds])];
    onSelectionChange(newSelection);
  };

  const handleSelectNone = () => {
    const filteredIds = filteredEquipment.map(eq => eq.id);
    const newSelection = selectedEquipmentIds.filter(id => !filteredIds.includes(id));
    onSelectionChange(newSelection);
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Label>Additional Equipment</Label>
        <div className="h-32 bg-muted animate-pulse rounded-md" />
      </div>
    );
  }

  if (availableEquipment.length === 0) {
    return (
      <div className="space-y-2">
        <Label>Additional Equipment</Label>
        <Card>
          <CardContent className="p-4">
            <div className="text-center text-muted-foreground">
              <Forklift className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No additional equipment available from this team</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>Additional Equipment</Label>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSelectAll}
            disabled={filteredEquipment.length === 0}
          >
            Select All
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSelectNone}
            disabled={filteredEquipment.length === 0}
          >
            Select None
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search equipment..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Equipment List */}
        <Card className="max-h-64 overflow-y-auto">
          <CardContent className="p-0">
            {filteredEquipment.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                <p className="text-sm">No equipment found matching your search</p>
              </div>
            ) : (
              <div className="divide-y">
                {filteredEquipment.map((equipment) => {
                  const isSelected = selectedEquipmentIds.includes(equipment.id);
                  
                  return (
                    <div
                      key={equipment.id}
                      className="flex items-center space-x-3 p-3 hover:bg-muted/50 transition-colors"
                    >
                      <Checkbox
                        id={`equipment-${equipment.id}`}
                        checked={isSelected}
                        onCheckedChange={(checked) => 
                          handleEquipmentToggle(equipment.id, checked as boolean)
                        }
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Forklift className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span className="font-medium truncate">{equipment.name}</span>
                          {isSelected && (
                            <Badge variant="secondary" className="text-xs">
                              <Check className="h-3 w-3 mr-1" />
                              Selected
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {equipment.manufacturer || ''} {equipment.model || ''}
                          {equipment.location && ` • ${equipment.location}`}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Selection Summary */}
        {selectedEquipmentIds.length > 0 && (
          <div className="text-sm text-muted-foreground">
            {selectedEquipmentIds.length} additional equipment selected
          </div>
        )}
      </div>
    </div>
  );
};


