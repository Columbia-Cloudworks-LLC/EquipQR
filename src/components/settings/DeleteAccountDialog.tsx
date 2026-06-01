import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, AlertTriangle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { useAppToast } from '@/hooks/useAppToast';
import {
  useAccountDeletionPreview,
  useExecuteAccountDeletion,
  useRequestManualDeletionReview,
} from '@/hooks/useAccountDeletion';
import {
  DELETE_ACCOUNT_CONFIRMATION_PHRASE,
  type AccountDeletionBlocker,
} from '@/services/accountDeletionService';
import { signOutGlobally } from '@/services/authSessionService';

type DeleteAccountDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function blockerHeading(blockers: AccountDeletionBlocker[]): string {
  if (blockers.some((b) => b.code === 'sole_owner_of_shared_org')) {
    return 'Organization ownership must be transferred first';
  }
  if (blockers.some((b) => b.code === 'pending_ownership_transfer')) {
    return 'Pending ownership transfer must be resolved';
  }
  return 'Manual review is required before this account can be deleted';
}

export function DeleteAccountDialog({ open, onOpenChange }: DeleteAccountDialogProps) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const appToast = useAppToast();
  const [confirmationText, setConfirmationText] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);

  const normalizedEmail = (user?.email ?? '').trim().toLowerCase();

  const {
    data: preview,
    isLoading: isPreviewLoading,
    isError: isPreviewError,
    error: previewError,
    refetch: refetchPreview,
  } = useAccountDeletionPreview(open);

  const executeDeletion = useExecuteAccountDeletion();
  const requestManualReview = useRequestManualDeletionReview();

  useEffect(() => {
    if (!open) {
      setConfirmationText('');
      setSubmitError(null);
    }
  }, [open]);

  const blockers = useMemo(() => preview?.blockers ?? [], [preview?.blockers]);
  const isBlocked = preview ? !preview.eligible_for_self_service : false;
  const canExecute =
    !isBlocked &&
    confirmationText === DELETE_ACCOUNT_CONFIRMATION_PHRASE &&
    normalizedEmail.length > 0;

  const blockerTitle = useMemo(() => blockerHeading(blockers), [blockers]);

  async function handleExecuteDeletion() {
    if (!user?.email || !canExecute) return;
    setSubmitError(null);

    try {
      const result = await executeDeletion.mutateAsync({
        confirmationText,
        expectedUserEmail: normalizedEmail,
      });

      if (result.blocked) {
        setSubmitError(result.message ?? 'Manual review is required before deletion.');
        return;
      }

      appToast.success({
        description: 'Your EquipQR account has been deleted.',
      });

      try {
        await signOutGlobally();
      } catch {
        // fall through to app signOut cleanup
      }
      await signOut();
      onOpenChange(false);
      navigate('/', { replace: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete account.';
      setSubmitError(message);
      appToast.error({ description: message });
    }
  }

  async function handleRequestManualReview() {
    if (!normalizedEmail) return;
    setSubmitError(null);

    try {
      const result = await requestManualReview.mutateAsync(normalizedEmail);
      appToast.success({
        description:
          result.message ??
          'Your deletion request was recorded. Our team will follow up if additional steps are needed.',
      });
      onOpenChange(false);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to submit deletion review request.';
      setSubmitError(message);
      appToast.error({ description: message });
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-4 w-4" />
            Delete account
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4 text-sm text-muted-foreground">
              <p>
                This permanently deletes your EquipQR login, personal settings, and avatar.
                Work you contributed to organizations — work orders, notes, photos, inventory,
                and audit history — stays with those organizations using your display name.
              </p>

              {isPreviewLoading ? (
                <div className="flex items-center gap-2 text-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Checking whether your account can be deleted safely...
                </div>
              ) : null}

              {isPreviewError ? (
                <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-destructive">
                  <p>{previewError instanceof Error ? previewError.message : 'Preview failed.'}</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => refetchPreview()}
                  >
                    Retry preview
                  </Button>
                </div>
              ) : null}

              {preview && isBlocked ? (
                <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-3 text-foreground">
                  <p className="font-medium">{blockerTitle}</p>
                  <ul className="mt-2 list-disc space-y-1 pl-5">
                    {blockers.map((blocker) => (
                      <li key={`${blocker.code}-${blocker.message}`}>{blocker.message}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {preview && !isBlocked ? (
                <div className="space-y-3">
                  <p>
                    Confirm by typing{' '}
                    <span className="font-mono text-foreground">{DELETE_ACCOUNT_CONFIRMATION_PHRASE}</span>{' '}
                    and verifying your account email{' '}
                    <span className="font-medium text-foreground">{normalizedEmail}</span>.
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="delete-account-confirmation">Confirmation phrase</Label>
                    <Input
                      id="delete-account-confirmation"
                      value={confirmationText}
                      onChange={(e) => setConfirmationText(e.target.value)}
                      placeholder={DELETE_ACCOUNT_CONFIRMATION_PHRASE}
                      autoComplete="off"
                    />
                  </div>
                </div>
              ) : null}

              {submitError ? (
                <p className="text-destructive" role="alert">
                  {submitError}
                </p>
              ) : null}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={executeDeletion.isPending || requestManualReview.isPending}>
            Cancel
          </AlertDialogCancel>

          {preview && isBlocked ? (
            <Button
              type="button"
              variant="destructive"
              onClick={handleRequestManualReview}
              disabled={requestManualReview.isPending || isPreviewLoading}
            >
              {requestManualReview.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Request manual review'
              )}
            </Button>
          ) : (
            <Button
              type="button"
              variant="destructive"
              onClick={handleExecuteDeletion}
              disabled={!canExecute || executeDeletion.isPending || isPreviewLoading}
            >
              {executeDeletion.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete my account'
              )}
            </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default DeleteAccountDialog;
