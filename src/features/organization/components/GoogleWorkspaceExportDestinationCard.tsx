import { useCallback, useState } from 'react';
import { toast as sonnerToast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FolderOpen, Loader2 } from 'lucide-react';
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FolderOpen className="h-5 w-5" />
          Google Docs Export Destination
        </CardTitle>
        <CardDescription>
          Choose where internal work order packet Google Docs are created.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoadingDestination ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading destination...
          </div>
        ) : destination ? (
          <div className="rounded-md border p-3 space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                {destination.selection_kind === 'shared_drive' ? 'Shared Drive' : 'My Drive Folder'}
              </Badge>
            </div>
            <p className="text-sm font-medium">{destination.display_name}</p>
            <p className="text-xs text-muted-foreground break-all">
              Parent ID: {destination.parent_id}
            </p>
          </div>
        ) : (
          <Alert>
            <AlertDescription>
              No destination configured yet. Pick a folder or Shared Drive destination to enable Google Docs exports.
            </AlertDescription>
          </Alert>
        )}

        {needsReconnectForDestination && (
          <Alert>
            <AlertDescription>
              Reconnect Google Workspace to refresh Google Docs and Drive permissions before choosing a destination.
            </AlertDescription>
          </Alert>
        )}

        <Button
          variant="outline"
          onClick={handlePickDestination}
          disabled={!isGoogleWorkspaceConnected || isSettingDestination || needsReconnectForDestination}
        >
          {isSettingDestination ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving Destination...
            </>
          ) : (
            <>
              <FolderOpen className="h-4 w-4 mr-2" />
              {destination ? 'Change Destination' : 'Choose Destination'}
            </>
          )}
        </Button>

        {destination && (
          <div className="rounded-md border p-3 space-y-3">
            <p className="text-sm font-medium">Folder Organization</p>
            <p className="text-xs text-muted-foreground">
              Choose how exported documents are organized into subfolders within the destination.
            </p>
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
          </div>
        )}

        {!isGoogleWorkspaceConnected && (
          <p className="text-xs text-muted-foreground">
            Connect Google Workspace first to configure a destination.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default GoogleWorkspaceExportDestinationCard;
