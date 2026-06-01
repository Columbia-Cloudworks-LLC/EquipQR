import { useCallback, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, ChevronRight, FolderOpen, HardDrive } from 'lucide-react';
import { useAppToast } from '@/hooks/useAppToast';
import {
  listGoogleDriveDestinations,
  type GoogleDriveDestinationBrowseItem,
  type GoogleExportSelectionKind,
} from '@/services/google-workspace';

interface BrowseFrame {
  parentId: string | null;
  driveId: string | null;
  label: string;
}

interface GoogleDriveDestinationPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  organizationName: string;
  workspaceDomain: string | null;
  connectedEmail: string | null;
  onSelect: (selection: {
    selectionKind: GoogleExportSelectionKind;
    parentId: string;
    displayName: string;
  }) => Promise<void>;
  isSaving?: boolean;
}

function getDestinationSaveErrorToast(error: Error & { code?: string }) {
  switch (error.code) {
    case 'insufficient_scopes':
      return {
        title: 'Reconnect Google Workspace',
        description:
          'Google Workspace needs updated Drive permissions. Reconnect Google Workspace on the Integrations page, then try again.',
        variant: 'error' as const,
      };
    case 'token_revoked':
    case 'token_refresh_failed':
      return {
        title: 'Google Workspace Connection Expired',
        description:
          'Your Google Workspace connection expired or was revoked. Reconnect Google Workspace on the Integrations page, then try again.',
        variant: 'error' as const,
      };
    case 'not_connected':
      return {
        title: 'Google Workspace Not Connected',
        description:
          'Google Workspace is no longer connected for this organization. Reconnect Google Workspace on the Integrations page, then try again.',
        variant: 'error' as const,
      };
    default:
      return {
        title: 'Failed To Save Folder',
        description: error.message || 'Could not save the selected organization folder.',
        variant: 'error' as const,
      };
  }
}

export function GoogleDriveDestinationPickerDialog({
  open,
  onOpenChange,
  organizationId,
  organizationName,
  workspaceDomain,
  connectedEmail,
  onSelect,
  isSaving = false,
}: GoogleDriveDestinationPickerDialogProps) {
  const { toast } = useAppToast();
  const [stack, setStack] = useState<BrowseFrame[]>([
    { parentId: null, driveId: null, label: 'All locations' },
  ]);

  const currentFrame = stack[stack.length - 1];

  const browseQuery = useQuery({
    queryKey: [
      'google-workspace',
      'drive-destinations',
      organizationId,
      currentFrame.parentId,
      currentFrame.driveId,
    ],
    queryFn: () =>
      listGoogleDriveDestinations({
        organizationId,
        parentId: currentFrame.parentId,
        driveId: currentFrame.driveId,
      }),
    enabled: open && Boolean(organizationId),
    staleTime: 30 * 1000,
  });

  const resetNavigation = useCallback(() => {
    setStack([{ parentId: null, driveId: null, label: 'All locations' }]);
  }, []);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        resetNavigation();
      }
      onOpenChange(nextOpen);
    },
    [onOpenChange, resetNavigation],
  );

  const breadcrumb = useMemo(
    () => stack.map((frame) => frame.label).join(' / '),
    [stack],
  );

  const handleNavigateInto = useCallback((item: GoogleDriveDestinationBrowseItem) => {
    setStack((prev) => [
      ...prev,
      {
        parentId: item.kind === 'shared_drive' ? 'root' : item.id,
        driveId: item.kind === 'shared_drive' ? item.id : item.driveId,
        label: item.name,
      },
    ]);
  }, []);

  const handleSelectFolder = useCallback(
    async (item: GoogleDriveDestinationBrowseItem) => {
      const selectionKind: GoogleExportSelectionKind =
        item.kind === 'shared_drive' ? 'shared_drive' : 'folder';
      try {
        await onSelect({
          selectionKind,
          parentId: item.id,
          displayName: item.name,
        });
        handleOpenChange(false);
      } catch (error) {
        toast(getDestinationSaveErrorToast(error as Error & { code?: string }));
      }
    },
    [handleOpenChange, onSelect, toast],
  );

  const handleBack = useCallback(() => {
    setStack((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
  }, []);

  const items = browseQuery.data?.items ?? [];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent size="md" className="max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Choose organization folder</DialogTitle>
          <DialogDescription>
            Browse folders in the connected Google Workspace for <span className="font-medium">{organizationName}</span>
            {workspaceDomain ? (
              <> ({workspaceDomain}{connectedEmail ? `, authorized by ${connectedEmail}` : ''})</>
            ) : null}
            . Only folders visible to this Workspace connection can be selected.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 min-h-0 flex-1 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground truncate">{breadcrumb}</p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleBack}
              disabled={stack.length <= 1 || browseQuery.isLoading || isSaving}
            >
              Back
            </Button>
          </div>

          {browseQuery.isLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading folders...
            </div>
          )}

          {browseQuery.error && (
            <Alert variant="destructive">
              <AlertDescription>
                {browseQuery.error instanceof Error
                  ? browseQuery.error.message
                  : 'Failed to load Google Drive folders.'}
              </AlertDescription>
            </Alert>
          )}

          {!browseQuery.isLoading && !browseQuery.error && (
            <div className="overflow-y-auto rounded-md border divide-y">
              {items.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">
                  No folders found here. Try another Shared Drive or ask your Google admin for access.
                </p>
              ) : (
                items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-2 p-3"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {item.kind === 'shared_drive' ? (
                        <HardDrive className="h-4 w-4 shrink-0 text-muted-foreground" />
                      ) : (
                        <FolderOpen className="h-4 w-4 shrink-0 text-muted-foreground" />
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{item.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.kind === 'shared_drive' ? 'Shared Drive' : 'Folder'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {item.selectable && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={isSaving}
                          onClick={() => void handleSelectFolder(item)}
                        >
                          Select
                        </Button>
                      )}
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={isSaving}
                        onClick={() => handleNavigateInto(item)}
                        aria-label={`Open ${item.name}`}
                      >
                        Open
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default GoogleDriveDestinationPickerDialog;
