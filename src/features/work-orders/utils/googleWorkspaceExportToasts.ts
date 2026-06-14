import { INTERNAL_WORK_ORDER_PACKET_POLICY } from '@/features/work-orders/constants/workOrderExportPolicy';

type ToastFn = (props: {
  title: string;
  description?: string;
  variant?: 'error' | 'warning';
}) => void;

export function handleGoogleWorkspaceExportError(
  toast: ToastFn,
  error: Error & { code?: string },
  destination: 'Sheets' | 'Docs' | 'PDF',
): boolean {
  if (error.code === 'insufficient_scopes' || error.code === 'not_connected') {
    toast({
      title: 'Google Workspace Permissions Required',
      description: 'Please reconnect Google Workspace in Organization Settings to enable this feature.',
      variant: 'error',
    });
    return true;
  }

  if (error.code === 'missing_destination') {
    toast({
      title: 'Organization Drive Folder Required',
      description: 'Set an organization Drive folder in Organization Settings before exporting.',
      variant: 'error',
    });
    return true;
  }

  if (error.code === 'single_work_order_required') {
    toast({
      title: 'Single Work Order Only',
      description: 'Google Docs export supports a single work order. Use Google Sheets for bulk exports.',
      variant: 'error',
    });
    return true;
  }

  toast({
    title: 'Export Failed',
    description:
      error.message ||
      `Failed to export ${INTERNAL_WORK_ORDER_PACKET_POLICY.exportName.toLowerCase()} to Google ${destination}.`,
    variant: 'error',
  });
  return true;
}
