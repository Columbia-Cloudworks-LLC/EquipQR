
import React from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle, Download, X } from 'lucide-react';

interface CSVSuccessStepProps {
  importProgress: {
    processed: number;
    total: number;
    isImporting: boolean;
    completed: boolean;
    errors: Array<{ row: number; reason: string }>;
  };
  organizationName: string;
  importId: string;
  selectedTeamId: string | null;
  onClose: () => void;
  onDownloadErrors: () => void;
}

export const CSVSuccessStep: React.FC<CSVSuccessStepProps> = ({
  importProgress,
  organizationName,
  importId,
  selectedTeamId,
  onClose,
  onDownloadErrors
}) => {
  const successCount = importProgress.processed - importProgress.errors.length;
  const hasErrors = importProgress.errors.length > 0;

  return (
    <div className="space-y-6">
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <CheckCircle className="w-16 h-16 text-success-foreground0" />
        </div>
        
        <div>
          <h3 className="text-xl font-semibold text-success">Import Complete!</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Equipment has been successfully imported to {organizationName}
          </p>
        </div>
      </div>

      <div className="bg-muted rounded-lg p-4 space-y-3">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium text-success">Successfully processed:</span>
            <div className="text-lg font-bold text-success">{successCount}</div>
          </div>
          
          {hasErrors && (
            <div>
              <span className="font-medium text-destructive">Failed:</span>
              <div className="text-lg font-bold text-destructive">{importProgress.errors.length}</div>
            </div>
          )}
        </div>

        <div className="text-xs text-muted-foreground">
          <div>Import ID: {importId}</div>
          {selectedTeamId && <div>Team: Assigned to selected team</div>}
        </div>
      </div>

      {hasErrors && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h4 className="font-medium text-destructive mb-2">Some items failed to import</h4>
              <p className="text-sm text-destructive">
                {importProgress.errors.length} items couldn't be processed. Download the error report to see details.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={onDownloadErrors}
              className="ml-4 flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download Errors
            </Button>
          </div>
        </div>
      )}

      <div className="flex justify-center pt-4">
        <Button onClick={onClose} className="flex items-center gap-2">
          <X className="w-4 h-4" />
          Close
        </Button>
      </div>
    </div>
  );
};

