import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Download, Loader2, CloudUpload } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { SERVICE_REPORT_EXPORT_POLICY } from '@/features/work-orders/constants/workOrderExportPolicy';

interface WorkOrderPDFExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExport: (options: { includeCosts: boolean }) => Promise<void>;
  isExporting: boolean;
  /** Whether to show the costs option (hide for users without cost permissions) */
  showCostsOption?: boolean;
  /** Whether the organization has Google Workspace connected */
  isGoogleWorkspaceConnected?: boolean;
  /** Whether the organization has a configured Drive folder */
  hasOrganizationDriveDestination?: boolean;
  /** Handler for saving to Google Drive (only called when connected and folder configured) */
  onSaveToDrive?: (options: { includeCosts: boolean }) => Promise<void>;
  /** Whether saving to Google Drive is in progress */
  isSavingToDrive?: boolean;
  /** When true, emphasize the Save to Drive action (opened from Google Drive > PDF) */
  focusDriveAction?: boolean;
}

const exportDialogFooterClassName =
  'flex-col-reverse gap-2 sm:flex-col sm:justify-stretch sm:space-x-0';

const exportDialogActionClassName = 'w-full sm:w-full';

/**
 * Dialog for exporting a work order as a service report PDF.
 * Allows the user to optionally include cost items (off by default).
 */
export const WorkOrderPDFExportDialog: React.FC<WorkOrderPDFExportDialogProps> = ({
  open,
  onOpenChange,
  onExport,
  isExporting,
  showCostsOption = true,
  isGoogleWorkspaceConnected = false,
  hasOrganizationDriveDestination = false,
  onSaveToDrive,
  isSavingToDrive = false,
  focusDriveAction = false,
}) => {
  const [includeCosts, setIncludeCosts] = useState(false);
  
  const isAnyExporting = isExporting || isSavingToDrive;
  const showDriveAction =
    isGoogleWorkspaceConnected && hasOrganizationDriveDestination && onSaveToDrive;

  // Reset state when dialog closes (via Cancel, backdrop click, or escape key)
  useEffect(() => {
    if (!open) {
      setIncludeCosts(false);
    }
  }, [open]);

  const handleExport = async () => {
    try {
      await onExport({ includeCosts });
      // Close dialog on success (state is reset by useEffect above)
      onOpenChange(false);
    } catch {
      // Keep dialog open on error so user can retry without re-selecting options
      // Error toast is already shown by the hook
    }
  };

  const handleSaveToDrive = async () => {
    if (!onSaveToDrive) return;
    try {
      await onSaveToDrive({ includeCosts });
      // Close dialog on success
      onOpenChange(false);
    } catch {
      // Keep dialog open on error so user can retry
      // Error toast is already shown by the hook
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm" className="overflow-y-visible">
        <DialogHeader>
          <DialogTitle>{SERVICE_REPORT_EXPORT_POLICY.title}</DialogTitle>
          <DialogDescription>
            {SERVICE_REPORT_EXPORT_POLICY.description} Includes work order summary,
            equipment, PM checklist, and public notes.
          </DialogDescription>
        </DialogHeader>

        {showCostsOption && (
          <div className="flex items-center space-x-2">
            <Checkbox
              id="include-costs"
              checked={includeCosts}
              onCheckedChange={(checked) => setIncludeCosts(checked === true)}
            />
            <Label 
              htmlFor="include-costs" 
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Include itemized costs
            </Label>
          </div>
        )}

        <DialogFooter className={exportDialogFooterClassName}>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isAnyExporting}
            className={exportDialogActionClassName}
          >
            Cancel
          </Button>

          {showDriveAction && (
            <Button
              variant={focusDriveAction ? 'default' : 'outline'}
              onClick={handleSaveToDrive}
              disabled={isAnyExporting}
              className={exportDialogActionClassName}
              aria-label="Save Service Report PDF to organization Drive"
            >
              {isSavingToDrive ? (
                <>
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                  Saving to Drive…
                </>
              ) : (
                <>
                  <CloudUpload className="h-4 w-4 shrink-0" />
                  Save to Drive
                </>
              )}
            </Button>
          )}

          <Button
            onClick={handleExport}
            disabled={isAnyExporting}
            variant={focusDriveAction ? 'outline' : 'default'}
            className={exportDialogActionClassName}
            aria-label="Download Service Report PDF"
          >
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                Generating…
              </>
            ) : (
              <>
                <Download className="h-4 w-4 shrink-0" />
                Download PDF
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
