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
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getConnectionStatus,
  getTeamCustomerMapping,
  exportInvoice,
  getLastSuccessfulExport
} from '@/services/quickbooks';
import { isQuickBooksEnabled } from '@/lib/flags';
import { usePermissions } from '@/hooks/usePermissions';
import { toast } from 'sonner';

interface QuickBooksExportButtonProps {
  workOrderId: string;
  teamId: string | null;
  /** Render as a dropdown menu item instead of a button */
  asMenuItem?: boolean;
  /** Called after successful export */
  onExportSuccess?: () => void;
}

export const QuickBooksExportButton: React.FC<QuickBooksExportButtonProps> = ({
  workOrderId,
  teamId,
  asMenuItem = false,
  onExportSuccess
}) => {
  const { currentOrganization } = useOrganization();
  const queryClient = useQueryClient();
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

  // Export mutation
  const exportMutation = useMutation({
    mutationFn: () => exportInvoice(workOrderId),
    onSuccess: (result) => {
      if (result.success) {
        const message = result.isUpdate 
          ? `Invoice ${result.invoiceNumber} updated in QuickBooks`
          : `Invoice ${result.invoiceNumber} created in QuickBooks`;
        toast.success(message);
        queryClient.invalidateQueries({ queryKey: ['quickbooks', 'export', workOrderId] });
        onExportSuccess?.();
      } else {
        toast.error(result.error || 'Failed to export to QuickBooks');
      }
    },
    onError: (error: Error) => {
      toast.error(`Export failed: ${error.message}`);
    },
  });

  // Don't render if feature is disabled or user doesn't have permission
  if (!featureEnabled || !canExport) {
    return null;
  }

  // Determine button state and tooltip
  const isLoading = connectionLoading || mappingLoading || exportMutation.isPending;
  const isConnected = connectionStatus?.isConnected;
  const hasMapping = !!teamMapping;
  const hasTeam = !!teamId;
  const alreadyExported = !!existingExport;

  let tooltipMessage = '';
  let isDisabled = false;

  if (!isConnected) {
    tooltipMessage = 'QuickBooks is not connected. Connect in Organization Settings.';
    isDisabled = true;
  } else if (!hasTeam) {
    tooltipMessage = 'Work order must be assigned to a team to export.';
    isDisabled = true;
  } else if (!hasMapping) {
    tooltipMessage = 'Team does not have a QuickBooks customer mapping. Set up mapping in Team Settings.';
    isDisabled = true;
  } else if (alreadyExported) {
    tooltipMessage = `Previously exported as Invoice ${existingExport.quickbooks_invoice_id}. Click to update.`;
  } else {
    tooltipMessage = 'Export work order as a draft invoice in QuickBooks';
  }

  const handleExport = () => {
    if (isDisabled) return;
    exportMutation.mutate();
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


