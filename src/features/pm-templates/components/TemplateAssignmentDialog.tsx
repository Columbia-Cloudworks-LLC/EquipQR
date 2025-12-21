import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { Search, Package, Loader2, AlertCircle } from 'lucide-react';
import { usePMTemplate } from '@/features/pm-templates/hooks/usePMTemplates';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useEquipment } from '@/features/equipment/hooks/useEquipment';
import { useBulkAssignTemplate } from '@/features/equipment/hooks/useEquipmentTemplateManagement';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface TemplateAssignmentDialogProps {
  templateId: string;
  open: boolean;
  onClose: () => void;
}

export const TemplateAssignmentDialog: React.FC<TemplateAssignmentDialogProps> = ({
  templateId,
  open,
  onClose
}) => {
  const { currentOrganization } = useOrganization();
  const { data: template } = usePMTemplate(templateId);
  const { data: equipment = [] } = useEquipment(currentOrganization?.id);
  const bulkAssignTemplate = useBulkAssignTemplate();
  
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredEquipment = equipment.filter(eq => 
    eq.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    eq.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
    eq.serial_number.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const equipmentWithExistingTemplates = filteredEquipment.filter(eq => eq.default_pm_template_id);

  const handleSelectEquipment = (equipmentId: string, checked: boolean) => {
    if (checked) {
      setSelectedEquipment(prev => [...prev, equipmentId]);
    } else {
      setSelectedEquipment(prev => prev.filter(id => id !== equipmentId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      // Only select visible equipment
      const visibleIds = filteredEquipment.map(eq => eq.id);
      setSelectedEquipment(prev => [...new Set([...prev, ...visibleIds])]);
    } else {
      // Remove all visible equipment from selection
      const visibleIds = filteredEquipment.map(eq => eq.id);
      setSelectedEquipment(prev => prev.filter(id => !visibleIds.includes(id)));
    }
  };

  const handleAssignTemplate = async () => {
    if (!template || !currentOrganization || selectedEquipment.length === 0) return;

    try {
      await bulkAssignTemplate.mutateAsync({
        equipmentIds: selectedEquipment,
        templateId: template.id
      });
      onClose();
      setSelectedEquipment([]);
    } catch (error) {
      console.error('Error assigning template:', error);
    }
  };

  const handleClose = () => {
    setSelectedEquipment([]);
    onClose();
  };

  if (!template) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Assign Default PM Template: {template.name}</DialogTitle>
          <DialogDescription>
            Set this template as the default PM procedure for selected equipment. 
            Future work orders for this equipment will automatically use this template.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 min-h-0">
          {equipmentWithExistingTemplates.length > 0 && selectedEquipment.some(id => 
            equipmentWithExistingTemplates.find(eq => eq.id === id)
          ) && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Some selected equipment already have assigned PM templates. 
                Assigning this template will replace their existing assignments.
              </AlertDescription>
            </Alert>
          )}

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
                checked={filteredEquipment.length > 0 && filteredEquipment.every(eq => selectedEquipment.includes(eq.id))}
                onCheckedChange={handleSelectAll}
              />
              <Label>Select All ({filteredEquipment.length})</Label>
            </div>
          </div>

          <div className="text-sm text-muted-foreground">
            {selectedEquipment.filter(id => filteredEquipment.some(eq => eq.id === id)).length} of {filteredEquipment.length} visible equipment selected
            {selectedEquipment.length > selectedEquipment.filter(id => filteredEquipment.some(eq => eq.id === id)).length && (
              <span className="ml-2 text-xs">
                ({selectedEquipment.length - selectedEquipment.filter(id => filteredEquipment.some(eq => eq.id === id)).length} hidden)
              </span>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto space-y-2">
            {filteredEquipment.map((eq) => (
              <Card key={eq.id} className="p-3 hover:bg-muted/50">
                <div className="flex items-center space-x-3">
                  <Checkbox
                    checked={selectedEquipment.includes(eq.id)}
                    onCheckedChange={(checked) => handleSelectEquipment(eq.id, checked === true)}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <p className="font-medium truncate">{eq.name}</p>
                      <Badge variant="outline" className="text-xs">{eq.status}</Badge>
                      {eq.default_pm_template_id && (
                        <Badge variant="secondary" className="text-xs">
                          Has PM Template
                        </Badge>
                      )}
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
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleAssignTemplate} 
            disabled={selectedEquipment.length === 0 || bulkAssignTemplate.isPending}
            className="gap-2"
          >
            {bulkAssignTemplate.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Assign Template to {selectedEquipment.length} Equipment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
