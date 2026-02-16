import React from 'react';
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { History, Clock } from "lucide-react";
import { usePermissions } from '@/hooks/usePermissions';

interface WorkOrderHistoricalToggleProps {
  isHistorical: boolean;
  onToggle: (value: boolean) => void;
  disabled?: boolean;
}

export const WorkOrderHistoricalToggle: React.FC<WorkOrderHistoricalToggleProps> = ({
  isHistorical,
  onToggle,
  disabled = false
}) => {
  const { canManageOrganization } = usePermissions();

  if (!canManageOrganization()) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <History className="h-4 w-4" />
          <Label htmlFor="historical-toggle">Historical Work Order</Label>
        </div>
        <Switch
          id="historical-toggle"
          checked={isHistorical}
          onCheckedChange={onToggle}
          disabled={disabled}
        />
      </div>
      {isHistorical && (
        <Alert>
          <Clock className="h-4 w-4" />
          <AlertDescription>
            Creating a historical work order to record past maintenance activities. 
            These records help maintain equipment history and compliance.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

