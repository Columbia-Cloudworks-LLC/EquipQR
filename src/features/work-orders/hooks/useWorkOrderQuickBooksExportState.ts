import { useIsMutating, useQuery } from '@tanstack/react-query';
import { useOrganization } from '@/contexts/OrganizationContext';
import { quickBooks } from '@/lib/queryKeys/integrations';
import { getConnectionStatus } from '@/services/quickbooks';
import { resolveQuickBooksCustomerId } from '@/features/teams/services/customerAccountService';
import { QUICKBOOKS_EXPORT_MUTATION_KEY, useQuickBooksLastExport } from '@/hooks/useExportToQuickBooks';
import { useQuickBooksAccess } from '@/hooks/useQuickBooksAccess';
import { isQuickBooksEnabled } from '@/lib/flags';
import type { WorkOrderStatus } from '@/features/work-orders/types/workOrder';
import {
  getQuickBooksExportAvailability,
  getQuickBooksInvoiceDisplay,
} from '@/features/work-orders/utils/quickBooksExportPresentation';

interface UseWorkOrderQuickBooksExportStateArgs {
  workOrderId: string;
  teamId: string | null;
  workOrderStatus: WorkOrderStatus;
}

/**
 * Connection, team mapping, and last-export state shared by every QuickBooks
 * export control on a work order, so they agree on availability and labels.
 */
export function useWorkOrderQuickBooksExportState({
  workOrderId,
  teamId,
  workOrderStatus,
}: UseWorkOrderQuickBooksExportStateArgs) {
  const { currentOrganization } = useOrganization();
  const featureEnabled = isQuickBooksEnabled();
  const { data: canExport = false, isLoading: accessLoading } = useQuickBooksAccess();

  const organizationId = currentOrganization?.id;

  const { data: connectionStatus, isLoading: connectionLoading } = useQuery({
    queryKey: quickBooks.connection(organizationId ?? ''),
    queryFn: () => {
      if (!organizationId) {
        throw new Error('Organization is required for QuickBooks connection status');
      }
      return getConnectionStatus(organizationId);
    },
    enabled: !!organizationId && canExport && featureEnabled,
    staleTime: 60 * 1000,
  });

  // Same resolution as the export backend: team customer account first, then
  // the legacy quickbooks_team_customers mapping.
  const { data: resolvedCustomerId, isLoading: mappingLoading } = useQuery({
    queryKey: quickBooks.resolvedMapping(organizationId ?? '', teamId ?? ''),
    queryFn: () => {
      if (!organizationId || !teamId) {
        throw new Error('Organization and team are required for QuickBooks team mapping');
      }
      return resolveQuickBooksCustomerId(organizationId, teamId);
    },
    enabled:
      !!organizationId && !!teamId && canExport && featureEnabled && connectionStatus?.isConnected,
  });

  const { data: existingExport } = useQuickBooksLastExport(
    workOrderId,
    !!workOrderId && canExport && featureEnabled && connectionStatus?.isConnected,
  );

  // Exports run from InvoiceReviewDialog's own mutation; observe any in-flight
  // export for this work order rather than an unused local mutation instance.
  const isExporting =
    useIsMutating({
      mutationKey: QUICKBOOKS_EXPORT_MUTATION_KEY,
      predicate: (mutation) => {
        const variables: unknown = mutation.state.variables;
        return (
          typeof variables === 'object' &&
          variables !== null &&
          'workOrderId' in variables &&
          variables.workOrderId === workOrderId
        );
      },
    }) > 0;

  const { alreadyExported, hasInvoiceIdentifiers, invoiceDisplay } =
    getQuickBooksInvoiceDisplay(existingExport);

  const { tooltipMessage, isDisabled, showSetupState } = getQuickBooksExportAvailability({
    isCompleted: workOrderStatus === 'completed',
    isConnected: connectionStatus?.isConnected,
    hasTeam: !!teamId,
    hasMapping: !!resolvedCustomerId,
    isExporting,
    alreadyExported,
    hasInvoiceIdentifiers,
    invoiceDisplay,
  });

  const hasLinkedInvoice = alreadyExported && hasInvoiceIdentifiers;

  return {
    featureEnabled,
    canExport,
    accessLoading,
    existingExport,
    isExporting,
    isLoading: connectionLoading || mappingLoading || isExporting,
    alreadyExported,
    hasLinkedInvoice,
    invoiceDisplay,
    tooltipMessage,
    showSetupState,
    setupDisabled: isDisabled && !hasLinkedInvoice,
    updateLabel: invoiceDisplay ? `Update Invoice #${invoiceDisplay}` : 'Update Invoice',
  };
}
