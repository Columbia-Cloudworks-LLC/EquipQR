import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

import { Forklift, Loader2, AlertCircle, Trash2, RefreshCw } from 'lucide-react';
import { usePMTemplates } from '@/features/pm-templates/hooks/usePMTemplates';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useBulkAssignTemplate, useBulkRemoveTemplates, useBulkChangeTemplate } from '@/features/equipment/hooks/useEquipmentTemplateManagement';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { EquipmentRecord } from '@/features/equipment/types/equipment';

interface BulkTemplateManagementDialogProps {
  selectedEquipment: EquipmentRecord[];
  open: boolean;
  onClose: () => void;
}

type ActionType = 'assign' | 'remove' | 'change';

export const BulkTemplateManagementDialog: React.FC<BulkTemplateManagementDialogProps> = ({
  selectedEquipment,
  open,
  onClose
}) => {
  const { currentOrganization } = useOrganization();
  const { data: templates = [] } = usePMTemplates();
  
  const bulkAssignTemplate = useBulkAssignTemplate();
  const bulkRemoveTemplates = useBulkRemoveTemplates();
  const bulkChangeTemplate = useBulkChangeTemplate();
  
  const [action, setAction] = useState<ActionType>('assign');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');

  // Filter templates based on restrictions - for now show all available templates
  const availableTemplates = templates.filter(template => 
    template.organization_id === null || // Global templates
    template.organization_id === currentOrganization?.id // Org templates
  );

  const equipmentWithTemplates = selectedEquipment.filter(eq => eq.default_pm_template_id);
  const equipmentWithoutTemplates = selectedEquipment.filter(eq => !eq.default_pm_template_id);

  const handleAction = async () => {
    if (selectedEquipment.length === 0) return;

    const equipmentIds = selectedEquipment.map(eq => eq.id);

    try {
      switch (action) {
        case 'assign':
          if (!selectedTemplateId) return;
          await bulkAssignTemplate.mutateAsync({
            equipmentIds,
            templateId: selectedTemplateId
          });
          break;
        case 'remove':
          await bulkRemoveTemplates.mutateAsync(equipmentIds);
          break;
        case 'change':
          if (!selectedTemplateId) return;
          await bulkChangeTemplate.mutateAsync({
            equipmentIds,
            newTemplateId: selectedTemplateId
          });
          break;
      }
      onClose();
    } catch (error) {
      console.error('Error performing bulk action:', error);
    }
  };

  const isLoading = bulkAssignTemplate.isPending || bulkRemoveTemplates.isPending || bulkChangeTemplate.isPending;
  const needsTemplate = action === 'assign' || action === 'change';
  const canPerformAction = !needsTemplate || selectedTemplateId;

  const getActionText = () => {
    switch (action) {
      case 'assign': return `Assign Template to ${selectedEquipment.length} Equipment`;
      case 'remove': return `Remove Templates from ${selectedEquipment.length} Equipment`;
      case 'change': return `Change Template for ${selectedEquipment.length} Equipment`;
    }
  };

  const getActionIcon = () => {
    switch (action) {
      case 'assign': return <Forklift className="h-4 w-4" />;
      case 'remove': return <Trash2 className="h-4 w-4" />;
      case 'change': return <RefreshCw className="h-4 w-4" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Manage PM Templates</DialogTitle>
          <DialogDescription>
            Manage PM template assignments for {selectedEquipment.length} selected equipment records.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Action Selection */}
          <div className="space-y-3">
            <Label>Select Action</Label>
            <RadioGroup value={action} onValueChange={(value) => setAction(value as ActionType)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="assign" id="assign" />
                <Label htmlFor="assign" className="flex items-center gap-2">
                  <Forklift className="h-4 w-4" />
                  Assign template to equipment
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="remove" id="remove" />
                <Label htmlFor="remove" className="flex items-center gap-2">
                  <Trash2 className="h-4 w-4" />
                  Remove templates from equipment
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="change" id="change" />
                <Label htmlFor="change" className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Change template for equipment
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Template Selection */}
          {needsTemplate && (
            <div className="space-y-3">
              <Label>Select PM Template</Label>
              <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a PM template..." />
                </SelectTrigger>
                <SelectContent>
                  {availableTemplates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      <div className="flex items-center gap-2">
                        <span>{template.name}</span>
                        {template.organization_id === null && (
                          <Badge variant="outline" className="text-xs">Global</Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Warnings and Info */}
          {action === 'remove' && equipmentWithoutTemplates.length > 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {equipmentWithoutTemplates.length} of the selected equipment records don't have assigned templates.
              </AlertDescription>
            </Alert>
          )}

          {action === 'change' && equipmentWithoutTemplates.length > 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {equipmentWithoutTemplates.length} of the selected equipment records don't have assigned templates. 
                This action will assign the selected template to them.
              </AlertDescription>
            </Alert>
          )}

          {action === 'assign' && equipmentWithTemplates.length > 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {equipmentWithTemplates.length} of the selected equipment records already have assigned templates. 
                This will replace their existing assignments.
              </AlertDescription>
            </Alert>
          )}

          {/* Equipment Summary */}
          <div className="space-y-2">
            <Label>Selected Equipment ({selectedEquipment.length})</Label>
            <div className="max-h-40 overflow-y-auto space-y-1">
              {selectedEquipment.map((eq) => (
                <Card key={eq.id} className="p-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Forklift className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{eq.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">{eq.status}</Badge>
                      {eq.default_pm_template_id && (
                        <Badge variant="secondary" className="text-xs">
                          Has Template
                        </Badge>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleAction} 
            disabled={!canPerformAction || isLoading}
            className="gap-2"
          >
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            {!isLoading && getActionIcon()}
            {getActionText()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};