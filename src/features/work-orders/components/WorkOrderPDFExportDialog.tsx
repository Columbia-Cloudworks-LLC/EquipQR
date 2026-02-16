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

interface WorkOrderPDFExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExport: (options: { includeCosts: boolean }) => Promise<void>;
  isExporting: boolean;
  /** Whether to show the costs option (hide for users without cost permissions) */
  showCostsOption?: boolean;
  /** Whether the organization has Google Workspace connected */
  isGoogleWorkspaceConnected?: boolean;
  /** Handler for saving to Google Drive (only called if isGoogleWorkspaceConnected) */
  onSaveToDrive?: (options: { includeCosts: boolean }) => Promise<void>;
  /** Whether saving to Google Drive is in progress */
  isSavingToDrive?: boolean;
}

/**
 * Dialog for exporting a Work Order as a customer-facing PDF.
 * Allows the user to optionally include cost items (off by default).
 */
export const WorkOrderPDFExportDialog: React.FC<WorkOrderPDFExportDialogProps> = ({
  open,
  onOpenChange,
  onExport,
  isExporting,
  showCostsOption = true,
  isGoogleWorkspaceConnected = false,
  onSaveToDrive,
  isSavingToDrive = false,
}) => {
  const [includeCosts, setIncludeCosts] = useState(false);
  
  const isAnyExporting = isExporting || isSavingToDrive;

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
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Export Work Order PDF</DialogTitle>
          <DialogDescription>
            Generate a customer-facing PDF document for this work order.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <p className="text-sm text-muted-foreground">
            The PDF will include work order details, equipment information, 
            the PM checklist (if applicable), and public notes with photos.
          </p>

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
                Include cost items
              </Label>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isAnyExporting}
          >
            Cancel
          </Button>
          
          {/* Google Drive button - only shown when connected */}
          {isGoogleWorkspaceConnected && onSaveToDrive && (
            <Button
              variant="outline"
              onClick={handleSaveToDrive}
              disabled={isAnyExporting}
            >
              {isSavingToDrive ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving to Drive...
                </>
              ) : (
                <>
                  <CloudUpload className="h-4 w-4 mr-2" />
                  Save to Google Drive
                </>
              )}
            </Button>
          )}
          
          <Button
            onClick={handleExport}
            disabled={isAnyExporting}
          >
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default WorkOrderPDFExportDialog;
