import { useCallback, useState } from 'react';
import { toast as sonnerToast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FolderOpen, Loader2, Copy, Check } from 'lucide-react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useAppToast } from '@/hooks/useAppToast';
import { useGoogleWorkspaceConnectionStatus } from '@/features/organization/hooks/useGoogleWorkspaceConnectionStatus';
import { useGoogleWorkspaceExportDestination } from '@/features/organization/hooks/useGoogleWorkspaceExportDestination';
import {
  GOOGLE_EXPORT_DESTINATION_REQUIRED_SCOPES,
  hasAllGoogleScopes,
} from '@/services/google-workspace/auth';
import { GoogleDriveDestinationPickerDialog } from './GoogleDriveDestinationPickerDialog';

interface GoogleWorkspaceExportDestinationCardProps {
  currentUserRole: 'owner' | 'admin' | 'member';
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
        description: error.message || 'Could not save organization folder.',
        variant: 'error' as const,
      };
  }
}

export function GoogleWorkspaceExportDestinationCard({
  currentUserRole,
}: GoogleWorkspaceExportDestinationCardProps) {
  const { currentOrganization } = useOrganization();
  const { toast } = useAppToast();
  const canManage = currentUserRole === 'owner' || currentUserRole === 'admin';
  const [copiedId, setCopiedId] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [showAdvancedId, setShowAdvancedId] = useState(false);

  const {
    isConnected: isGoogleWorkspaceConnected,
    domain: workspaceDomain,
    connectionStatus,
  } = useGoogleWorkspaceConnectionStatus({
    organizationId: currentOrganization?.id,
    enabled: canManage,
  });

  const needsReconnectForDestination =
    isGoogleWorkspaceConnected &&
    !hasAllGoogleScopes(
      connectionStatus?.scopes,
      GOOGLE_EXPORT_DESTINATION_REQUIRED_SCOPES
    );

  const {
    destination,
    isLoadingDestination,
    setDestination,
    isSettingDestination,
  } = useGoogleWorkspaceExportDestination(currentOrganization?.id);

  const handleCopyParentId = useCallback(async () => {
    if (!destination?.parent_id) return;
    await navigator.clipboard.writeText(destination.parent_id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  }, [destination?.parent_id]);

  const handleSaveSelection = useCallback(
    async (selection: {
      selectionKind: 'folder' | 'shared_drive';
      parentId: string;
      displayName: string;
    }) => {
      await setDestination({
        selectionKind: selection.selectionKind,
        parentId: selection.parentId,
      });
      toast({
        title: 'Organization folder saved',
        description: `EquipQR files for ${currentOrganization?.name ?? 'this organization'} will save to ${selection.displayName}.`,
      });
    },
    [currentOrganization?.name, setDestination, toast],
  );

  const [isSavingFlags, setIsSavingFlags] = useState(false);

  const handleToggleFolderFlag = useCallback(
    async (flag: 'folderByTeam' | 'folderByEquipment', checked: boolean) => {
      if (!destination) return;
      setIsSavingFlags(true);

      const label = flag === 'folderByTeam' ? 'team' : 'equipment';
      const action = checked ? 'enabled' : 'disabled';

      try {
        await sonnerToast.promise(
          setDestination({
            selectionKind: destination.selection_kind,
            parentId: destination.parent_id,
            [flag]: checked,
          }),
          {
            loading: 'Saving folder settings...',
            success: `Organize by ${label} ${action}`,
            error: (err: Error & { code?: string }) => {
              const errToast = getDestinationSaveErrorToast(err);
              return errToast.description;
            },
          },
        );
      } finally {
        setIsSavingFlags(false);
      }
    },
    [destination, setDestination],
  );

  if (!canManage) {
    return null;
  }

  const kindLabel = destination?.selection_kind === 'shared_drive' ? 'Shared Drive folder' : 'My Drive folder';
  const organizationName = currentOrganization?.name ?? 'Organization';

  return (
    <>
      <div className="rounded-lg border p-4 space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium">Google Drive File Storage</p>
              {destination && (
                <Badge variant="outline" className="bg-success/10 text-success border-success/30 text-xs">
                  Configured
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Organization folder for {organizationName}
              {workspaceDomain ? ` on ${workspaceDomain}` : ''}
            </p>
            {connectionStatus?.connected_email && (
              <p className="text-xs text-muted-foreground">
                Authorized by {connectionStatus.connected_email}
              </p>
            )}
          </div>

          <div className="shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPickerOpen(true)}
              disabled={!isGoogleWorkspaceConnected || isSettingDestination || needsReconnectForDestination}
            >
              {isSettingDestination ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
              ) : (
                <FolderOpen className="h-3.5 w-3.5 mr-1.5" />
              )}
              {destination ? 'Change organization folder' : 'Choose organization folder'}
            </Button>
          </div>
        </div>

        {isLoadingDestination && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Loading organization folder...
          </div>
        )}

        {destination && (
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 text-sm">
              <FolderOpen className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground">{kindLabel}</span>
              <span className="text-muted-foreground">/</span>
              <span className="font-medium truncate">{destination.display_name}</span>
            </div>

            <div className="text-xs">
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
                onClick={() => setShowAdvancedId((prev) => !prev)}
              >
                {showAdvancedId ? 'Hide advanced details' : 'Advanced: show folder ID'}
              </button>
              {showAdvancedId && (
                <div className="mt-2 flex items-center gap-2">
                  <code className="text-xs font-mono text-muted-foreground truncate max-w-[200px]">
                    {destination.parent_id}
                  </code>
                  <button
                    type="button"
                    onClick={handleCopyParentId}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="Copy folder ID"
                  >
                    {copiedId ? (
                      <Check className="h-3.5 w-3.5 text-success" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              )}
            </div>

            <fieldset className="space-y-2" role="group" aria-label="Folder organization">
              <legend className="text-xs font-medium text-muted-foreground mb-1.5">
                Folder Organization
              </legend>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="folder-by-team"
                  checked={destination.folder_by_team}
                  disabled={isSettingDestination || isSavingFlags}
                  onCheckedChange={(checked) =>
                    handleToggleFolderFlag('folderByTeam', Boolean(checked))
                  }
                />
                <Label htmlFor="folder-by-team" className="text-sm leading-none cursor-pointer">
                  Organize by team
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="folder-by-equipment"
                  checked={destination.folder_by_equipment}
                  disabled={isSettingDestination || isSavingFlags}
                  onCheckedChange={(checked) =>
                    handleToggleFolderFlag('folderByEquipment', Boolean(checked))
                  }
                />
                <Label htmlFor="folder-by-equipment" className="text-sm leading-none cursor-pointer">
                  Organize by equipment
                </Label>
              </div>
            </fieldset>
          </div>
        )}

        {!destination && !isLoadingDestination && (
          <p className="text-xs text-muted-foreground">
            Choose a Shared Drive folder or My Drive folder where EquipQR should store organization files.
          </p>
        )}

        {needsReconnectForDestination && (
          <Alert>
            <AlertDescription className="text-sm">
              Reconnect Google Workspace to refresh Drive permissions before choosing an organization folder.
            </AlertDescription>
          </Alert>
        )}

        {!isGoogleWorkspaceConnected && !isLoadingDestination && (
          <p className="text-xs text-muted-foreground">
            Connect Google Workspace first to choose an organization folder.
          </p>
        )}
      </div>

      {currentOrganization?.id && (
        <GoogleDriveDestinationPickerDialog
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          organizationId={currentOrganization.id}
          organizationName={organizationName}
          workspaceDomain={workspaceDomain}
          connectedEmail={connectionStatus?.connected_email ?? null}
          onSelect={handleSaveSelection}
          isSaving={isSettingDestination}
        />
      )}
    </>
  );
}

export default GoogleWorkspaceExportDestinationCard;
