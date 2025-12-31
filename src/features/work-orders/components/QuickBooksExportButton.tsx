/**
 * QuickBooks Export Button Component
 * 
 * Allows admin/owners to export a work order to QuickBooks as a draft invoice.
 * Shows loading state and handles success/error feedback.
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenuItem 
} from '@/components/ui/dropdown-menu';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { FileSpreadsheet, RefreshCw, CheckCircle, AlertTriangle } from 'lucide-react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useQuery } from '@tanstack/react-query';
import { 
  getConnectionStatus,
  getTeamCustomerMapping,
  getLastSuccessfulExport
} from '@/services/quickbooks';
import { useExportToQuickBooks } from '@/hooks/useExportToQuickBooks';
import { isQuickBooksEnabled } from '@/lib/flags';
import { usePermissions } from '@/hooks/usePermissions';
import type { WorkOrderStatus } from '@/features/work-orders/types/workOrder';

interface QuickBooksExportButtonProps {
  workOrderId: string;
  /**
   * Team ID derived from the equipment assigned to this work order.
   * QuickBooks customer mapping is done at the team level, and the team
   * association comes from the equipment (not the work order directly).
   */
  teamId: string | null;
  /**
   * Current status of the work order.
   *
   * Exports to QuickBooks are only allowed when the work order status is
   * `'completed'`. Other statuses will prevent the export action from
   * being available/enabled in the UI.
   */
  workOrderStatus: WorkOrderStatus;
  /** Render as a dropdown menu item instead of a button */
  asMenuItem?: boolean;
  /** Called after successful export */
  onExportSuccess?: () => void;
}

export const QuickBooksExportButton: React.FC<QuickBooksExportButtonProps> = ({
  workOrderId,
  teamId,
  workOrderStatus,
  asMenuItem = false,
  onExportSuccess
}) => {
  const { currentOrganization } = useOrganization();
  const permissions = usePermissions();

  // Check permissions
  const canExport = permissions.hasRole(['owner', 'admin']);

  // Check if feature is enabled
  const featureEnabled = isQuickBooksEnabled();

  // Query for connection status
  const { data: connectionStatus, isLoading: connectionLoading } = useQuery({
    queryKey: ['quickbooks', 'connection', currentOrganization?.id],
    queryFn: () => getConnectionStatus(currentOrganization!.id),
    enabled: !!currentOrganization?.id && canExport && featureEnabled,
    staleTime: 60 * 1000,
  });

  // Query for team customer mapping
  const { data: teamMapping, isLoading: mappingLoading } = useQuery({
    queryKey: ['quickbooks', 'team-mapping', currentOrganization?.id, teamId],
    queryFn: () => getTeamCustomerMapping(currentOrganization!.id, teamId!),
    enabled: !!currentOrganization?.id && !!teamId && canExport && featureEnabled && connectionStatus?.isConnected,
  });

  // Query for existing export
  const { data: existingExport } = useQuery({
    queryKey: ['quickbooks', 'export', workOrderId],
    queryFn: () => getLastSuccessfulExport(workOrderId),
    enabled: !!workOrderId && canExport && featureEnabled && connectionStatus?.isConnected,
    staleTime: 30 * 1000,
  });

  // Export mutation using the hook
  const exportMutation = useExportToQuickBooks();

  // Don't render if feature is disabled or user doesn't have permission
  if (!featureEnabled || !canExport) {
    return null;
  }

  // Determine button state and tooltip
  const isExporting = exportMutation.isPending;
  const isLoading = connectionLoading || mappingLoading || isExporting;
  const isConnected = connectionStatus?.isConnected;
  const hasMapping = !!teamMapping;
  const hasTeam = !!teamId;
  const alreadyExported = !!existingExport;
  const isCompleted = workOrderStatus === 'completed';

  let tooltipMessage = '';
  let isDisabled = false;

  if (!isCompleted) {
    tooltipMessage = 'Work order must be completed before exporting to QuickBooks.';
    isDisabled = true;
  } else if (!isConnected) {
    tooltipMessage = 'QuickBooks is not connected. Connect in Organization Settings.';
    isDisabled = true;
  } else if (!hasTeam) {
    tooltipMessage = 'Equipment must be assigned to a team to export.';
    isDisabled = true;
  } else if (!hasMapping) {
    tooltipMessage = 'Equipment\'s team does not have a QuickBooks customer mapping. Set up mapping in Team Settings.';
    isDisabled = true;
  } else if (isExporting) {
    tooltipMessage = 'Exporting...';
    isDisabled = true;
  } else if (alreadyExported) {
    tooltipMessage = `Previously exported as Invoice ${existingExport.quickbooks_invoice_id}. Click to update.`;
  } else {
    tooltipMessage = 'Export work order as a draft invoice in QuickBooks';
  }

  const handleExport = () => {
    if (isDisabled) return;
    exportMutation.mutate(workOrderId, {
      onSuccess: () => {
        onExportSuccess?.();
      },
    });
  };

  const buttonContent = (
    <>
      {isLoading ? (
        <RefreshCw className="h-4 w-4 animate-spin mr-2" />
      ) : alreadyExported ? (
        <CheckCircle className="h-4 w-4 mr-2" />
      ) : isDisabled ? (
        <AlertTriangle className="h-4 w-4 mr-2" />
      ) : (
        <FileSpreadsheet className="h-4 w-4 mr-2" />
      )}
      {alreadyExported ? 'Update QuickBooks Invoice' : 'Export to QuickBooks'}
    </>
  );

  if (asMenuItem) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuItem
              onClick={handleExport}
              disabled={isDisabled || isLoading}
              className={isDisabled ? 'opacity-50 cursor-not-allowed' : ''}
            >
              {buttonContent}
            </DropdownMenuItem>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p className="max-w-xs">{tooltipMessage}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={isDisabled || isLoading}
            >
              {buttonContent}
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p className="max-w-xs">{tooltipMessage}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default QuickBooksExportButton;
