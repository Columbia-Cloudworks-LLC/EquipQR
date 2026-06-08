import { AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { RotateCcw } from 'lucide-react';
import type { PMChecklistItem } from '@/features/pm-templates/services/preventativeMaintenanceService';

type PMChecklistFooterProps = {
  pmStatus: string;
  readOnly: boolean;
  isAdmin: boolean;
  notes: string;
  unratedRequiredItems: PMChecklistItem[];
  unsafeItems: PMChecklistItem[];
  isUpdating: boolean;
  isReverting: boolean;
  isSettingAllOK: boolean;
  completedAt?: string | null;
  formattedCompletedAt?: string;
  onNotesChange: (value: string) => void;
  onSaveChanges: () => void;
  onCompletePM: () => void;
  onShowSetAllOKDialog: () => void;
  onShowRevertPMDialog: () => void;
};

export function PMChecklistFooter({
  pmStatus,
  readOnly,
  isAdmin,
  notes,
  unratedRequiredItems,
  unsafeItems,
  isUpdating,
  isReverting,
  isSettingAllOK,
  completedAt,
  formattedCompletedAt,
  onNotesChange,
  onSaveChanges,
  onCompletePM,
  onShowSetAllOKDialog,
  onShowRevertPMDialog,
}: PMChecklistFooterProps) {
  return (
    <>
      {pmStatus !== 'completed' && unratedRequiredItems.length > 0 && (
        <Alert className="border-destructive/30 bg-destructive/10">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-destructive">
            {unratedRequiredItems.length} required item(s) need to be rated before completion.
            {!readOnly && (
              <>
                {' '}
                <button
                  onClick={onShowSetAllOKDialog}
                  className="text-destructive underline hover:no-underline focus:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded-sm"
                  disabled={isSettingAllOK}
                >
                  Set All to OK
                </button>
              </>
            )}
          </AlertDescription>
        </Alert>
      )}

      {pmStatus !== 'completed' && unsafeItems.length > 0 && (
        <Alert className="border-destructive/30 bg-destructive/10">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-destructive">
            {unsafeItems.length} item(s) marked as unsafe condition present require immediate
            attention.
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <label className="text-base font-semibold">General Notes</label>
        <Textarea
          placeholder="Add general notes about this PM..."
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          disabled={readOnly || pmStatus === 'completed'}
          rows={3}
          className="text-[15px] text-foreground placeholder:text-muted-foreground/70"
        />
      </div>

      {!readOnly && pmStatus !== 'completed' && (
        <div className="flex gap-2 pt-4">
          <Button onClick={onSaveChanges} disabled={isUpdating} variant="outline">
            {isUpdating ? 'Saving...' : 'Save Changes'}
          </Button>
          <Button
            onClick={onCompletePM}
            disabled={
              isUpdating || unratedRequiredItems.length > 0 || unsafeItems.length > 0
            }
          >
            {isUpdating ? 'Completing...' : 'Complete PM'}
          </Button>
        </div>
      )}

      {isAdmin && pmStatus === 'completed' && (
        <div className="flex gap-2 pt-4 border-t">
          <Button
            onClick={onShowRevertPMDialog}
            disabled={isReverting}
            variant="outline"
            className="border-destructive/50 text-destructive hover:bg-destructive/10"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Revert PM Completion
          </Button>
        </div>
      )}

      {completedAt && formattedCompletedAt && (
        <div className="pt-4 border-t text-sm text-muted-foreground">
          Completed on {formattedCompletedAt}
        </div>
      )}
    </>
  );
}
