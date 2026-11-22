import React, { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { AlertCircle, ArrowRight, Clock, Forklift, MapPin, WifiOff } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import EquipQRIcon from '@/components/ui/EquipQRIcon';
import { useAuth } from '@/hooks/useAuth';
import { useSimpleOrganizationSafe } from '@/hooks/useSimpleOrganization';
import { useSession } from '@/hooks/useSession';
import {
  mergeAllowedOrganizationIds,
  resolveValidatedOrganizationId,
} from '@/utils/trustedOrganizationScope';
import { persistDashboardOrganizationSelection } from '@/utils/organizationSelection';
import type { Database } from '@/integrations/supabase/types';
import type { Role } from '@/types/permissions';
import QrPageLoadingShell from '@/features/equipment/components/qr/QrPageLoadingShell';
import {
  fetchEquipmentQRPayload,
  resolveEquipmentQRDisplayImageUrl,
  userLimitsSensitivePi,
  insertScan,
  type EquipmentQRPayload,
} from '@/features/equipment/services/equipmentQRPermissions';
import { recordScanFollowUpEvent } from '@/features/equipment/services/scanFollowUpEventService';
import { logger } from '@/utils/logger';
import { useLatestCompletedPMDetails } from '@/features/pm-templates/hooks/usePMData';
import EquipmentQRLastPMCard from '@/features/equipment/components/qr/EquipmentQRLastPMCard';
import EquipmentQROpenWorkOrders from '@/features/equipment/components/qr/EquipmentQROpenWorkOrders';
import { EquipmentServiceSummaryBadge } from '@/features/equipment/components/EquipmentServiceSummaryBadge';
import { useBrowserOnline } from '@/hooks/useBrowserOnline';
import { useEquipmentById, useEquipmentSummaries } from '@/features/equipment/hooks/useEquipment';
import { setActivePersistenceScope } from '@/lib/queryPersistence';
import { queueNewWorkOrderForDashboard } from '@/features/work-orders/launcher/newWorkOrderLauncher';
import { useTeamMembership } from '@/features/teams/hooks/useTeamMembership';
import { isOrgAdminRole } from '@/features/teams/utils/teamAccessScope';

type EquipmentStatus = Database['public']['Enums']['equipment_status'];

const PRODUCTION_URL = 'https://equipqr.app';
const EquipmentQRQuickActions = lazy(() => import('@/features/equipment/components/qr/EquipmentQRQuickActions'));

type ScanStatus = 'idle' | 'logging' | 'logged' | 'failed';

function getStatusClasses(status: EquipmentStatus): string {
  switch (status) {
    case 'active':
      return 'border-success/30 bg-success/20 text-success';
    case 'maintenance':
      return 'border-warning/30 bg-warning/20 text-warning';
    case 'inactive':
      return 'border-border bg-muted text-muted-foreground';
    default:
      return 'border-border bg-muted text-muted-foreground';
  }
}

const OFFLINE_LOOKUP_MESSAGE = 'No connection';

/** The live lookup failed because the server could not be reached, not because it said no. */
function isConnectivityError(message: string | null, isOnline: boolean): boolean {
  if (!message) return false;
  if (!isOnline) return true;
  return /failed to fetch|load failed|networkerror|network request failed/i.test(message);
}

function getStatusLabel(status: EquipmentStatus): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
}

const EquipmentQRScan = (): React.JSX.Element => {
  const { equipmentId } = useParams<{ equipmentId: string }>();
  const [searchParams] = useSearchParams();
  const orgIdFromUrl = searchParams.get('org') ?? undefined;
  const { user, isLoading: authLoading } = useAuth();
  const orgContext = useSimpleOrganizationSafe();
  const currentOrganization = orgContext?.currentOrganization ?? null;
  const organizationId = orgContext?.organizationId ?? null;
  const organizations = orgContext?.organizations ?? [];
  const { sessionData } = useSession();
  const { getUserTeamIds, isLoading: teamsLoading } = useTeamMembership();
  const isOnline = useBrowserOnline();
  const allowedOrgIds = mergeAllowedOrganizationIds(
    organizations.map((org) => org.id),
    sessionData?.organizations?.map((org) => org.id) ?? [],
  );
  // The QR link names the organization the equipment belongs to; prefer it
  // (when the user is a member) so saved offline data is read from the right
  // organization even if another one was open last.
  const cacheOrgId =
    orgIdFromUrl && allowedOrgIds.includes(orgIdFromUrl)
      ? orgIdFromUrl
      : resolveValidatedOrganizationId({
          currentOrganizationId: currentOrganization?.id,
          sessionOrganizationId: sessionData?.currentOrganizationId,
          persistedOrganizationId: organizationId,
          allowedOrganizationIds: allowedOrgIds,
        });
  // This route has no organization provider, so the role comes from the
  // session's organization list. It must match what the dashboard uses or the
  // saved equipment would be looked up under a different cache entry.
  const cacheOrganization = sessionData?.organizations?.find((org) => org.id === cacheOrgId) ?? null;
  const cacheUserRole = currentOrganization?.userRole ?? cacheOrganization?.userRole;
  const isOrgAdmin = isOrgAdminRole(cacheUserRole);
  const teamsReady = isOrgAdmin || !teamsLoading;
  const cacheUserTeamIds = isOrgAdmin ? undefined : getUserTeamIds();
  const { data: cachedEquipment } = useEquipmentById(cacheOrgId, equipmentId, {
    userTeamIds: cacheUserTeamIds,
    isOrgAdmin,
    enabled: teamsReady,
  });
  // Never fetched from here: this only reads the copy the equipment list
  // saved, so any machine the user could see in the list opens offline, not
  // just the ones whose record they happened to open before.
  const { data: cachedSummaries } = useEquipmentSummaries(cacheOrgId ?? undefined, {
    userTeamIds: cacheUserTeamIds,
    isOrgAdmin,
    enabled: false,
  });

  useEffect(() => {
    if (user?.id && cacheOrgId) {
      setActivePersistenceScope({ userId: user.id, orgId: cacheOrgId });
    }
  }, [user?.id, cacheOrgId]);
  const [payload, setPayload] = useState<EquipmentQRPayload | null>(null);
  const latestPmQuery = useLatestCompletedPMDetails(
    payload?.equipment.id,
    payload?.organization.id
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scanStatus, setScanStatus] = useState<ScanStatus>('idle');
  const [scanId, setScanId] = useState<string | null>(null);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [heroImageFailed, setHeroImageFailed] = useState(false);
  const [heroImageUrl, setHeroImageUrl] = useState<string | null>(null);
  /** Bumps after each successful `fetchEquipmentQRPayload` so hero resolution retries on refetch even when ids + image reference are unchanged (e.g. after org switch). Local `setPayload` merges skip this bump. */
  const [payloadLoadGeneration, setPayloadLoadGeneration] = useState(0);
  const scanStartedRef = useRef(false);

  useEffect(() => {
    if (authLoading) return;
    if (user || !equipmentId) return;

    const orgParam = orgIdFromUrl ? `&org=${orgIdFromUrl}` : '';
    sessionStorage.setItem('pendingRedirect', `/qr/equipment/${equipmentId}?qr=true${orgParam}`);
    window.location.replace('/auth?tab=signin');
  }, [authLoading, equipmentId, user, orgIdFromUrl]);

  useEffect(() => {
    if (authLoading || !user || !equipmentId) return;

    // With no connection the lookup can only fail, and the client retries for
    // several seconds before it does. Go straight to the saved details; this
    // effect runs again when the connection returns.
    if (!isOnline) {
      setError(OFFLINE_LOOKUP_MESSAGE);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    fetchEquipmentQRPayload(equipmentId, orgIdFromUrl)
      .then(result => {
        if (!cancelled) {
          setPayload(result);
          setPayloadLoadGeneration(g => g + 1);
        }
      })
      .catch(loadError => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Unable to load equipment');
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [authLoading, equipmentId, user, orgIdFromUrl, isOnline]);

  const heroEquipmentId = payload?.equipment.id;
  const heroOrganizationId = payload?.organization.id;
  const heroStoredRef = payload?.equipment.imageReference ?? null;

  useEffect(() => {
    if (
      heroEquipmentId == null ||
      heroOrganizationId == null ||
      heroStoredRef == null ||
      !heroStoredRef.trim()
    ) {
      setHeroImageUrl(null);
      setHeroImageFailed(false);
      return;
    }

    const stored = heroStoredRef.trim();
    let cancelled = false;
    setHeroImageFailed(false);
    setHeroImageUrl(null);

    void resolveEquipmentQRDisplayImageUrl({
      equipmentId: heroEquipmentId,
      organizationId: heroOrganizationId,
      stored,
    })
      .then((url) => {
        if (!cancelled) setHeroImageUrl(url);
      })
      .catch(() => {
        if (!cancelled) setHeroImageUrl(null);
      });

    return () => {
      cancelled = true;
    };
  }, [heroStoredRef, heroEquipmentId, heroOrganizationId, payloadLoadGeneration]);

  useEffect(() => {
    if (!payload || !user || scanStartedRef.current) return;

    scanStartedRef.current = true;
    setScanStatus('logging');

    const logWithoutLocation = (notes: string) =>
      insertScan(payload.equipment.id, null, notes);

    const logScan = async (): Promise<string> => {
      const orgAllowsLocation = payload.organization.scan_location_collection_enabled;
      const userLimitedPi = await userLimitsSensitivePi(user.id);

      if (!orgAllowsLocation || userLimitedPi || !('geolocation' in navigator)) {
        return logWithoutLocation('QR code scan');
      }

      return await new Promise<string>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          position => {
            const location = `${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`;
            insertScan(payload.equipment.id, location, 'QR code scan with location')
              .then(resolve)
              .catch(reject);
          },
          () => {
            logWithoutLocation('QR code scan (location denied)')
              .then(resolve)
              .catch(reject);
          },
          {
            enableHighAccuracy: false,
            timeout: 5000,
            maximumAge: 300000,
          }
        );
      });
    };

    logScan()
      .then((id) => {
        setScanId(id);
        setScanStatus('logged');
      })
      .catch(() => setScanStatus('failed'));
  }, [payload, user]);

  useEffect(() => {
    if (!payload) return;

    const frameId = window.requestAnimationFrame(() => setShowQuickActions(true));
    return () => window.cancelAnimationFrame(frameId);
  }, [payload]);

  const openDashboardRecord = useCallback(async () => {
    if (!payload) return;
    persistDashboardOrganizationSelection(payload.organization.id);
    // Best-effort scan attribution; never block navigation on it.
    if (scanId) {
      try {
        await recordScanFollowUpEvent({
          organizationId: payload.organization.id,
          scanId,
          equipmentId: payload.equipment.id,
          eventType: 'dashboard_opened',
        });
      } catch (error) {
        logger.error('Failed to record dashboard_opened scan follow-up event', error);
      }
    }
    window.location.assign(`/dashboard/equipment/${payload.equipment.id}`);
  }, [payload, scanId]);

  // With no connection the live lookup cannot succeed. Show what this device
  // saved the last time it was online instead of an error.
  const offlinePayload = useMemo((): EquipmentQRPayload | null => {
    if (payload || !equipmentId || !cacheOrgId || !cacheOrganization || !cacheUserRole) return null;
    if (!isConnectivityError(error, isOnline)) return null;

    const saved =
      cachedEquipment ?? cachedSummaries?.find((summary) => summary.id === equipmentId) ?? null;
    if (!saved || saved.organization_id !== cacheOrgId) return null;

    return {
      equipment: {
        id: saved.id,
        name: saved.name,
        manufacturer: saved.manufacturer ?? '',
        model: saved.model ?? '',
        serialNumber: saved.serial_number ?? '',
        status: saved.status,
        location: saved.location ?? null,
        workingHours: saved.working_hours ?? null,
        imageReference: null,
        defaultPmTemplateId: saved.default_pm_template_id ?? null,
        team: saved.team ? { id: saved.team.id, name: saved.team.name } : null,
      },
      organization: {
        id: cacheOrganization.id,
        name: cacheOrganization.name,
        scan_location_collection_enabled: cacheOrganization.scanLocationCollectionEnabled,
      },
      userRole: cacheUserRole,
    };
  }, [
    payload,
    equipmentId,
    cacheOrgId,
    cacheOrganization,
    cacheUserRole,
    error,
    isOnline,
    cachedEquipment,
    cachedSummaries,
  ]);

  const activePayload = payload ?? offlinePayload;
  const isOfflineView = !payload && !!offlinePayload;

  // The full record is only on this device if it was opened before; the
  // equipment list alone saves enough to identify the machine and raise a
  // work order against it.
  const hasSavedFullRecord = !!cachedEquipment && cachedEquipment.id === offlinePayload?.equipment.id;

  const openOfflineRecord = useCallback(() => {
    if (!offlinePayload) return;
    persistDashboardOrganizationSelection(offlinePayload.organization.id);
    window.location.assign(`/dashboard/equipment/${offlinePayload.equipment.id}`);
  }, [offlinePayload]);

  const createOfflineWorkOrder = useCallback(() => {
    if (!offlinePayload) return;
    persistDashboardOrganizationSelection(offlinePayload.organization.id);
    queueNewWorkOrderForDashboard({ equipmentId: offlinePayload.equipment.id });
    window.location.assign('/dashboard/work-orders');
  }, [offlinePayload]);

  if (authLoading || isLoading) {
    return <QrPageLoadingShell />;
  }

  if (!activePayload) {
    const couldNotReachServer = isConnectivityError(error, isOnline);

    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Unable to Open Equipment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {couldNotReachServer
                  ? 'You have no connection and this equipment has not been saved on this device yet. Open the Equipment list once while connected to make it available offline.'
                  : error || 'Equipment not found'}
              </AlertDescription>
            </Alert>
            <Button className="w-full" onClick={() => window.location.assign('/dashboard')}>
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { equipment, organization } = activePayload;
  const currentYear = new Date().getFullYear();
  const heroImageSrc = heroImageUrl && !heroImageFailed ? heroImageUrl : null;

  const quickActions = showQuickActions && payload && (
    <Suspense fallback={<div className="h-44 rounded-lg border bg-muted/30" aria-hidden="true" />}>
      <EquipmentQRQuickActions
        equipment={{
          id: equipment.id,
          name: equipment.name,
          organizationId: payload.organization.id,
          teamId: equipment.team?.id ?? null,
          workingHours: equipment.workingHours,
          defaultPmTemplateId: equipment.defaultPmTemplateId,
        }}
        scanId={scanId}
        userRole={payload.userRole as Role}
        userDisplayName={
          (user?.user_metadata?.name as string | undefined) || user?.email?.split('@')[0] || 'User'
        }
        onWorkingHoursUpdated={(newHours) =>
          setPayload((prev) =>
            prev ? { ...prev, equipment: { ...prev.equipment, workingHours: newHours } } : prev
          )
        }
      />
    </Suspense>
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col px-4 py-5 sm:py-8">
        <div className="mb-5 flex items-center justify-between">
          <a
            href={PRODUCTION_URL}
            className="flex items-center gap-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            aria-label="Open EquipQR production site"
          >
            <EquipQRIcon className="h-9 w-9" title="" />
            <div>
              <p className="text-sm font-semibold">EquipQR</p>
              <p className="text-xs text-muted-foreground">Scanned equipment</p>
            </div>
          </a>
          <Badge variant="outline" className={getStatusClasses(equipment.status)}>
            {getStatusLabel(equipment.status)}
          </Badge>
        </div>

        <Card className="overflow-hidden">
          {/* Short hero on phones so the primary actions stay above the fold. */}
          <div className="aspect-[16/6] bg-muted sm:aspect-[16/8]">
            {heroImageSrc ? (
              <img
                src={heroImageSrc}
                alt={equipment.name}
                className="h-full w-full object-cover"
                decoding="async"
                onError={() => setHeroImageFailed(true)}
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <Forklift className="h-12 w-12 text-muted-foreground/60" />
              </div>
            )}
          </div>
          <CardHeader className="space-y-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {organization.name}
              </p>
              <CardTitle className="mt-1 text-2xl leading-tight">{equipment.name}</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                {equipment.manufacturer} {equipment.model} • {equipment.serialNumber}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <EquipmentServiceSummaryBadge
                  equipmentId={equipment.id}
                  organizationId={organization.id}
                />
                <span className="inline-flex items-center gap-1.5 rounded-full border bg-muted/50 px-2.5 py-1 text-xs font-medium text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" aria-hidden />
                  {equipment.workingHours == null ? 'Hours not recorded' : `${equipment.workingHours.toLocaleString()} hrs`}
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {isOfflineView ? (
              <div className="space-y-3">
                <Alert>
                  <WifiOff className="h-4 w-4" />
                  <AlertDescription>
                    No connection. These are the details saved on this device. Anything you
                    create now is kept on this device and syncs when you are back online.
                  </AlertDescription>
                </Alert>
                <Button className="w-full" size="lg" onClick={createOfflineWorkOrder}>
                  Create Work Order
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                {hasSavedFullRecord ? (
                  <Button className="w-full" size="lg" variant="outline" onClick={openOfflineRecord}>
                    Open Equipment Record
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                ) : null}
              </div>
            ) : null}
            {quickActions}

            <EquipmentQROpenWorkOrders
              organizationId={organization.id}
              equipmentId={equipment.id}
            />

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-lg border bg-card p-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  Location
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {equipment.location || 'No location set'}
                </p>
              </div>
              <div className="rounded-lg border bg-card p-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  Working Hours
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {equipment.workingHours == null ? 'Not recorded' : `${equipment.workingHours} hours`}
                </p>
              </div>
            </div>

            {equipment.team && (
              <div className="rounded-lg border bg-card p-3">
                <p className="text-sm font-medium">Assigned Team</p>
                <p className="mt-1 text-sm text-muted-foreground">{equipment.team.name}</p>
              </div>
            )}

            <div className="rounded-lg border bg-muted/40 p-3 text-sm">
              <p className="font-medium">
                {isOfflineView
                  ? 'Scan not recorded (no connection)'
                  : scanStatus === 'logged'
                    ? 'Scan recorded'
                    : scanStatus === 'failed'
                      ? 'Equipment loaded, scan log failed'
                      : 'Recording scan...'}
              </p>
              <p className="mt-1 text-muted-foreground">
                Use the actions above for field updates, or continue to the full dashboard record for parts, scans, and history.
              </p>
            </div>

            <EquipmentQRLastPMCard
              organizationId={organization.id}
              details={latestPmQuery.data ?? null}
              isLoading={latestPmQuery.isLoading}
              isError={latestPmQuery.isError}
            />

            {isOfflineView ? null : (
              <Button className="w-full" size="lg" variant="outline" onClick={openDashboardRecord}>
                Open Full Dashboard Record
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </CardContent>
        </Card>

        <footer className="mt-5 text-center text-[11px] leading-relaxed text-muted-foreground">
          <p>© {currentYear} Columbia Cloudworks LLC. All rights reserved.</p>
          <p>EquipQR® is a registered trademark of Columbia Cloudworks LLC.</p>
        </footer>
      </main>
    </div>
  );
};

export default EquipmentQRScan;
