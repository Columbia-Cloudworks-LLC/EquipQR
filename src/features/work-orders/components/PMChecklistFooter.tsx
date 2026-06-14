import { AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { RotateCcw } from 'lucide-react';
import type { PMChecklistItem } from '@/features/pm-templates/services/preventativeMaintenanceService';
import { useVoiceTextAppender } from '@/hooks/useVoiceTextAppender';
import VoiceInputButton from '@/components/common/VoiceInputButton';
import VoiceInterimTranscript from '@/components/common/VoiceInterimTranscript';

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
  const notesDisabled = readOnly || pmStatus === 'completed';

  const {
    isListening,
    error: speechError,
    interimTranscript,
    toggleListening,
    canUseVoice,
  } = useVoiceTextAppender({
    value: notes,
    onChange: onNotesChange,
    disabled: notesDisabled,
  });

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
        <div className="flex items-center justify-between">
          <label htmlFor="pm-general-notes" className="text-base font-semibold">General Notes</label>
          <VoiceInputButton
            isListening={isListening}
            onToggle={toggleListening}
            canUseVoice={canUseVoice}
          />
        </div>
        <div className="relative">
          <Textarea
            id="pm-general-notes"
            placeholder="Add general notes about this PM..."
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            disabled={notesDisabled}
            rows={3}
            className="text-[15px] text-foreground placeholder:text-muted-foreground/70"
          />
          <VoiceInterimTranscript
            isListening={isListening}
            interimTranscript={interimTranscript}
          />
        </div>
        {speechError && (
          <p className="text-sm text-destructive">{speechError}</p>
        )}
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
