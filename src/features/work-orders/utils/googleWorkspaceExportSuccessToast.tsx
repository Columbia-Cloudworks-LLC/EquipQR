import { toast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';

export function showGoogleDriveExportSuccessToast(
  description: string,
  webViewLink?: string,
): void {
  toast({
    title: 'Export Complete',
    description,
    action: webViewLink ? (
      <ToastAction
        altText="Open in Google Drive"
        onClick={() => window.open(webViewLink, '_blank', 'noopener,noreferrer')}
      >
        Open
      </ToastAction>
    ) : undefined,
  });
}
