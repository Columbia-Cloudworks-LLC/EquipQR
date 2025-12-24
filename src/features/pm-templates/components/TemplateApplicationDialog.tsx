import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { Search, Forklift, Loader2 } from 'lucide-react';
import { logger } from '@/utils/logger';
import { usePMTemplate } from '@/features/pm-templates/hooks/usePMTemplates';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useEquipment } from '@/features/equipment/hooks/useEquipment';
import { useCreateWorkOrder } from '@/features/work-orders/hooks/useWorkOrderCreation';
import { useInitializePMChecklist } from '@/features/pm-templates/hooks/useInitializePMChecklist';
import { toast } from 'sonner';

interface TemplateApplicationDialogProps {
  templateId: string;
  open: boolean;
  onClose: () => void;
}

export const TemplateApplicationDialog: React.FC<TemplateApplicationDialogProps> = ({
  templateId,
  open,
  onClose
}) => {
  const { currentOrganization } = useOrganization();
  const { data: template } = usePMTemplate(templateId);
  const { data: equipment = [] } = useEquipment(currentOrganization?.id);
  const createWorkOrder = useCreateWorkOrder();
  const initializePM = useInitializePMChecklist();
  
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const filteredEquipment = equipment.filter(eq => 
    eq.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    eq.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
    eq.serial_number.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectEquipment = (equipmentId: string, checked: boolean) => {
    if (checked) {
      setSelectedEquipment(prev => [...prev, equipmentId]);
    } else {
      setSelectedEquipment(prev => prev.filter(id => id !== equipmentId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedEquipment(filteredEquipment.map(eq => eq.id));
    } else {
      setSelectedEquipment([]);
    }
  };

  const handleApplyTemplate = async () => {
    if (!template || !currentOrganization || selectedEquipment.length === 0) return;

    setIsCreating(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      for (const equipmentId of selectedEquipment) {
        try {
          const equipmentItem = equipment.find(eq => eq.id === equipmentId);
          if (!equipmentItem) continue;

          // Create work order for PM
          const workOrderData = {
            title: `Preventative Maintenance - ${equipmentItem.name}`,
            description: `PM using template: ${template.name}`,
            equipmentId: equipmentId,
            priority: 'medium' as const,
            equipment: equipmentItem
          };

          const workOrder = await createWorkOrder.mutateAsync(workOrderData);

          // Initialize PM checklist with template
          await initializePM.mutateAsync({
            workOrderId: workOrder.id,
            equipmentId: equipmentId,
            organizationId: currentOrganization.id,
            templateId: template.id
          });

          successCount++;
        } catch (error) {
          logger.error('Error creating PM for equipment', { equipmentId, error });
          errorCount++;
        }
      }

      if (successCount > 0) {
        toast.success(
          `Successfully created ${successCount} PM work order${successCount === 1 ? '' : 's'}${
            errorCount > 0 ? ` (${errorCount} failed)` : ''
          }`
        );
      }

      if (errorCount > 0 && successCount === 0) {
        toast.error('Failed to create PM work orders');
      }

      onClose();
    } catch (error) {
      logger.error('Error applying template', { error });
      toast.error('Failed to apply template');
    } finally {
      setIsCreating(false);
    }
  };

  if (!template) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Apply Template: {template.name}</DialogTitle>
          <DialogDescription>
            Create preventative maintenance work orders using this template for selected equipment.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 min-h-0">
          <div className="flex items-center justify-between">
            <div className="space-y-2 flex-1">
              <Label htmlFor="search">Search Equipment</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search by name, model, or serial number..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="flex items-center space-x-2 ml-4">
              <Checkbox
                checked={selectedEquipment.length === filteredEquipment.length && filteredEquipment.length > 0}
                onCheckedChange={handleSelectAll}
              />
              <Label>Select All ({filteredEquipment.length})</Label>
            </div>
          </div>

          <div className="text-sm text-muted-foreground">
            {selectedEquipment.length} of {filteredEquipment.length} equipment selected
          </div>

          <div className="max-h-96 overflow-y-auto space-y-2">
            {filteredEquipment.map((eq) => (
              <Card key={eq.id} className="p-3 hover:bg-muted/50 cursor-pointer"
                    onClick={() => handleSelectEquipment(eq.id, !selectedEquipment.includes(eq.id))}>
                <div className="flex items-center space-x-3">
                  <Checkbox
                    checked={selectedEquipment.includes(eq.id)}
                    onCheckedChange={(checked) => handleSelectEquipment(eq.id, checked as boolean)}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Forklift className="h-4 w-4 text-muted-foreground" />
                      <p className="font-medium truncate">{eq.name}</p>
                      <Badge variant="outline" className="text-xs">{eq.status}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {eq.manufacturer} {eq.model} • {eq.serial_number}
                    </p>
                    {eq.location && (
                      <p className="text-xs text-muted-foreground">📍 {eq.location}</p>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleApplyTemplate} 
            disabled={selectedEquipment.length === 0 || isCreating}
            className="gap-2"
          >
            {isCreating && <Loader2 className="h-4 w-4 animate-spin" />}
            Create {selectedEquipment.length} PM Work Order{selectedEquipment.length === 1 ? '' : 's'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
