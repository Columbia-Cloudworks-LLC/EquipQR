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
  getGooglePickerConfig,
  GOOGLE_PICKER_SCOPE,
  hasAllGoogleScopes,
  isGooglePickerConfigured,
} from '@/services/google-workspace/auth';

interface GoogleWorkspaceExportDestinationCardProps {
  currentUserRole: 'owner' | 'admin' | 'member';
}

interface PickerCallbackData {
  action: string;
  docs?: Array<{ id?: string; driveId?: string }>;
}

interface PickerInstance {
  setVisible: (visible: boolean) => void;
}

interface PickerBuilderInstance {
  addView: (view: unknown) => PickerBuilderInstance;
  setOAuthToken: (token: string) => PickerBuilderInstance;
  setDeveloperKey: (key: string) => PickerBuilderInstance;
  setAppId: (appId: string) => PickerBuilderInstance;
  setTitle: (title: string) => PickerBuilderInstance;
  setCallback: (callback: (data: PickerCallbackData) => void) => PickerBuilderInstance;
  build: () => PickerInstance;
}

interface DocsViewInstance {
  setIncludeFolders: (value: boolean) => DocsViewInstance;
  setSelectFolderEnabled: (value: boolean) => DocsViewInstance;
}

declare global {
  interface Window {
    gapi?: {
      load: (library: string, options: {
        callback: () => void;
        onerror?: () => void;
        timeout?: number;
        ontimeout?: () => void;
      }) => void;
    };
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: { access_token?: string; error?: string }) => void;
          }) => { requestAccessToken: (options?: { prompt?: string }) => void };
        };
      };
      picker: {
        Action: {
          PICKED: string;
        };
        DocsView: new () => DocsViewInstance;
        PickerBuilder: new () => PickerBuilderInstance;
      };
    };
  }
}

const GOOGLE_API_SCRIPT = 'https://apis.google.com/js/api.js';
const GOOGLE_GSI_SCRIPT = 'https://accounts.google.com/gsi/client';

function getDestinationSaveErrorToast(error: Error & { code?: string }) {
  switch (error.code) {
    case 'insufficient_scopes':
      return {
        title: 'Reconnect Google Workspace',
        description:
          'Google Workspace needs updated Drive permissions. Reconnect Google Workspace in Organization Settings, then try again.',
        variant: 'error' as const,
      };
    case 'token_revoked':
    case 'token_refresh_failed':
      return {
        title: 'Google Workspace Connection Expired',
        description:
          'Your Google Workspace connection expired or was revoked. Reconnect Google Workspace in Organization Settings, then try again.',
        variant: 'error' as const,
      };
    case 'not_connected':
      return {
        title: 'Google Workspace Not Connected',
        description:
          'Google Workspace is no longer connected for this organization. Reconnect Google Workspace in Organization Settings, then try again.',
        variant: 'error' as const,
      };
    default:
      return {
        title: 'Failed To Save Destination',
        description: error.message || 'Could not save destination.',
        variant: 'error' as const,
      };
  }
}

async function loadScript(src: string): Promise<void> {
  const existing = document.querySelector(`script[src="${src}"]`) as HTMLScriptElement | null;
  if (existing) {
    if (existing.dataset.loaded === 'true') return;
    await new Promise<void>((resolve, reject) => {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error(`Failed to load script: ${src}`)), { once: true });
    });
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      script.dataset.loaded = 'true';
      resolve();
    };
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.head.appendChild(script);
  });
}

export function GoogleWorkspaceExportDestinationCard({
  currentUserRole,
}: GoogleWorkspaceExportDestinationCardProps) {
  const { currentOrganization } = useOrganization();
  const { toast } = useAppToast();
  const canManage = currentUserRole === 'owner' || currentUserRole === 'admin';
  const [copiedId, setCopiedId] = useState(false);

  const {
    isConnected: isGoogleWorkspaceConnected,
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

  const handlePickDestination = useCallback(async () => {
    if (!currentOrganization?.id) return;

    if (!isGoogleWorkspaceConnected) {
      toast({
        title: 'Google Workspace Not Connected',
        description: 'Connect Google Workspace first, then choose an export destination.',
        variant: 'error',
      });
      return;
    }

    if (needsReconnectForDestination) {
      toast({
        title: 'Reconnect Google Workspace',
        description:
          'Reconnect Google Workspace to refresh Google Docs and Drive permissions before choosing a destination.',
        variant: 'error',
      });
      return;
    }

    if (!isGooglePickerConfigured()) {
      toast({
        title: 'Google Picker Not Configured',
        description:
          'Missing VITE_GOOGLE_PICKER_API_KEY, VITE_GOOGLE_PICKER_APP_ID, or VITE_GOOGLE_WORKSPACE_CLIENT_ID (shared OAuth client; VITE_GOOGLE_PICKER_CLIENT_ID is not used).',
        variant: 'error',
      });
      return;
    }

    const pickerConfig = getGooglePickerConfig();

    try {
      await loadScript(GOOGLE_API_SCRIPT);
      await loadScript(GOOGLE_GSI_SCRIPT);

      if (!window.google?.accounts?.oauth2?.initTokenClient) {
        toast({
          title: 'Google Sign-In Failed To Load',
          description: 'The Google Identity script did not initialize. Please reload and try again.',
          variant: 'error',
        });
        return;
      }

      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: pickerConfig.clientId,
        scope: GOOGLE_PICKER_SCOPE,
        callback: async (tokenResponse) => {
          if (tokenResponse.error || !tokenResponse.access_token) {
            toast({
              title: 'Google Picker Authorization Failed',
              description: tokenResponse.error ?? 'No access token returned.',
              variant: 'error',
            });
            return;
          }

          if (!window.gapi?.load) {
            toast({
              title: 'Google API Failed To Load',
              description: 'The Google API script did not initialize. Please reload and try again.',
              variant: 'error',
            });
            return;
          }

          window.gapi.load('picker', {
            callback: () => {
              if (!window.google?.picker?.DocsView || !window.google?.picker?.PickerBuilder) {
                toast({
                  title: 'Google Picker Failed To Load',
                  description: 'The Picker library did not initialize. Please reload and try again.',
                  variant: 'error',
                });
                return;
              }

              const docsView = new window.google.picker.DocsView()
                .setIncludeFolders(true)
                .setSelectFolderEnabled(true);

              const picker = new window.google.picker.PickerBuilder()
                .addView(docsView)
                .setOAuthToken(tokenResponse.access_token)
                .setDeveloperKey(pickerConfig.apiKey)
                .setAppId(pickerConfig.appId)
                .setTitle('Select Google Docs export destination')
                .setCallback(async (pickerData: PickerCallbackData) => {
                  if (pickerData.action !== window.google?.picker?.Action?.PICKED) return;
                  const doc = pickerData.docs?.[0];
                  if (!doc?.id) return;

                  const selectionKind = doc.driveId ? 'shared_drive' : 'folder';
                  try {
                    await setDestination({
                      selectionKind,
                      parentId: doc.id,
                    });
                    toast({
                      title: 'Destination Saved',
                      description: 'Google Docs exports will use the selected destination.',
                    });
                  } catch (error) {
                    const err = error as Error & { code?: string };
                    toast(getDestinationSaveErrorToast(err));
                  }
                })
                .build();

              picker.setVisible(true);
            },
            onerror: () => {
              toast({
                title: 'Google Picker Failed To Load',
                description: 'Could not load the Picker library. Please reload and try again.',
                variant: 'error',
              });
            },
            timeout: 10_000,
            ontimeout: () => {
              toast({
                title: 'Google Picker Timed Out',
                description: 'The Picker library took too long to load. Please check your connection and try again.',
                variant: 'error',
              });
            },
          });
        },
      });

      tokenClient.requestAccessToken({ prompt: 'consent' });
    } catch (error) {
      toast({
        title: 'Failed To Open Google Picker',
        description: error instanceof Error ? error.message : 'Unexpected error while loading Google Picker.',
        variant: 'error',
      });
    }
  }, [
    currentOrganization?.id,
    isGoogleWorkspaceConnected,
    needsReconnectForDestination,
    setDestination,
    toast,
  ]);

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
            loading: `Saving folder settings...`,
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

  const kindLabel = destination?.selection_kind === 'shared_drive' ? 'Shared Drive' : 'My Drive';

  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium">Google Docs Export</p>
            {destination && (
              <Badge variant="outline" className="bg-success/10 text-success border-success/30 text-xs">
                Configured
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Destination for internal work order packet exports
          </p>
        </div>

        <div className="shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={handlePickDestination}
            disabled={!isGoogleWorkspaceConnected || isSettingDestination || needsReconnectForDestination}
          >
            {isSettingDestination ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
            ) : (
              <FolderOpen className="h-3.5 w-3.5 mr-1.5" />
            )}
            {destination ? 'Change Destination' : 'Choose Destination'}
          </Button>
        </div>
      </div>

      {isLoadingDestination && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Loading destination...
        </div>
      )}

      {destination && (
        <div className="space-y-3">
          {/* Breadcrumb-style path */}
          <div className="flex items-center gap-1.5 text-sm">
            <FolderOpen className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground">{kindLabel}</span>
            <span className="text-muted-foreground">/</span>
            <span className="font-medium truncate">{destination.display_name}</span>
          </div>

          {/* Parent ID with copy button */}
          <div className="flex items-center gap-2">
            <code className="text-xs font-mono text-muted-foreground truncate max-w-[200px]">
              {destination.parent_id}
            </code>
            <button
              type="button"
              onClick={handleCopyParentId}
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Copy parent ID"
            >
              {copiedId ? (
                <Check className="h-3.5 w-3.5 text-success" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </button>
          </div>

          {/* Folder organization options */}
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
          Pick a folder or Shared Drive to enable Google Docs exports.
        </p>
      )}

      {needsReconnectForDestination && (
        <Alert>
          <AlertDescription className="text-sm">
            Reconnect Google Workspace to refresh Drive permissions before choosing a destination.
          </AlertDescription>
        </Alert>
      )}

      {!isGoogleWorkspaceConnected && !isLoadingDestination && (
        <p className="text-xs text-muted-foreground">
          Connect Google Workspace first to configure a destination.
        </p>
      )}
    </div>
  );
}

export default GoogleWorkspaceExportDestinationCard;
