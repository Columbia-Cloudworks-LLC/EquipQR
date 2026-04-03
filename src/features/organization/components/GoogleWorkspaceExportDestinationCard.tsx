import { useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FolderOpen, Loader2 } from 'lucide-react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useAppToast } from '@/hooks/useAppToast';
import { useGoogleWorkspaceConnectionStatus } from '@/features/organization/hooks/useGoogleWorkspaceConnectionStatus';
import { useGoogleWorkspaceExportDestination } from '@/features/organization/hooks/useGoogleWorkspaceExportDestination';
import {
  getGooglePickerConfig,
  GOOGLE_PICKER_SCOPE,
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
      load: (library: string, options: { callback: () => void }) => void;
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

  const { isConnected: isGoogleWorkspaceConnected } = useGoogleWorkspaceConnectionStatus({
    organizationId: currentOrganization?.id,
    enabled: canManage,
  });

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

      const tokenClient = window.google?.accounts?.oauth2?.initTokenClient({
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

          window.gapi?.load('picker', {
            callback: () => {
              const docsView = new window.google!.picker.DocsView()
                .setIncludeFolders(true)
                .setSelectFolderEnabled(true);

              const picker = new window.google!.picker.PickerBuilder()
                .addView(docsView)
                .setOAuthToken(tokenResponse.access_token)
                .setDeveloperKey(pickerConfig.apiKey)
                .setAppId(pickerConfig.appId)
                .setTitle('Select Google Docs export destination')
                .setCallback(async (pickerData: PickerCallbackData) => {
                  if (pickerData.action !== window.google!.picker.Action.PICKED) return;
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
                    const needsReconnect =
                      err.code === 'insufficient_scopes' || err.code === 'not_connected';
                    toast({
                      title: 'Failed To Save Destination',
                      description: needsReconnect
                        ? 'Google Workspace needs updated permissions. Reconnect Google Workspace in Organization Settings, then try again.'
                        : (err.message || 'Could not save destination.'),
                      variant: 'error',
                    });
                  }
                })
                .build();

              picker.setVisible(true);
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
  }, [currentOrganization?.id, isGoogleWorkspaceConnected, setDestination, toast]);

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

        <Button
          variant="outline"
          onClick={handlePickDestination}
          disabled={!isGoogleWorkspaceConnected || isSettingDestination}
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
