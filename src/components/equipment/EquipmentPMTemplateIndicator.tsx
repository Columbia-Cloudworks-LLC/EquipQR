import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Wrench, X } from 'lucide-react';
import { usePMTemplate } from '@/hooks/usePMTemplates';
import { useRemoveTemplateFromEquipment } from '@/hooks/useEquipmentTemplateManagement';
import { usePermissions } from '@/hooks/usePermissions';

interface EquipmentPMTemplateIndicatorProps {
  equipmentId: string;
  equipmentName: string;
  templateId: string | null;
  compact?: boolean;
}

export const EquipmentPMTemplateIndicator: React.FC<EquipmentPMTemplateIndicatorProps> = ({
  equipmentId,
  templateId,
  compact = false
}) => {
  const { data: template } = usePMTemplate(templateId || '');
  const removeTemplate = useRemoveTemplateFromEquipment();
  const { hasRole } = usePermissions();
  const canRemove = hasRole(['owner', 'admin']);

  const handleRemoveTemplate = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (templateId) {
      removeTemplate.mutate(equipmentId);
    }
  };

  if (!templateId || !template) {
    return null;
  }

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="secondary" className="text-xs gap-1">
              <Wrench className="h-3 w-3" />
              PM
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>PM Template: {template.name}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className="flex items-center gap-2 p-2 bg-primary/5 border border-primary/20 rounded-md">
      <div className="flex items-center gap-2 flex-1">
        <Wrench className="h-4 w-4 text-primary" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-primary">Default PM Template</p>
          <p className="text-xs text-muted-foreground truncate">{template.name}</p>
        </div>
      </div>
      {canRemove && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRemoveTemplate}
                disabled={removeTemplate.isPending}
                className="h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Remove PM template assignment</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
};