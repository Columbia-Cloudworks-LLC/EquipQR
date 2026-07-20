import React, { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { AlertCircle, ArrowRight, Clock, Forklift, MapPin } from 'lucide-react';
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
import { useBrowserOnline } from '@/hooks/useBrowserOnline';
import { useEquipmentById } from '@/features/equipment/hooks/useEquipment';

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

function getStatusLabel(status: EquipmentStatus): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
}

const EquipmentQRScan = () => {
  const { equipmentId } = useParams<{ equipmentId: string }>();
  const [searchParams] = useSearchParams();
  const orgIdFromUrl = searchParams.get('org') ?? undefined;
  const { user, isLoading: authLoading } = useAuth();
  const orgContext = useSimpleOrganizationSafe();
  const currentOrganization = orgContext?.currentOrganization ?? null;
  const organizationId = orgContext?.organizationId ?? null;
  const organizations = orgContext?.organizations ?? [];
  const { sessionData } = useSession();
  const isOnline = useBrowserOnline();
  const allowedOrgIds = mergeAllowedOrganizationIds(
    organizations.map((org) => org.id),
    sessionData?.organizations?.map((org) => org.id) ?? [],
  );
  const cacheOrgId = resolveValidatedOrganizationId({
    currentOrganizationId: currentOrganization?.id,
    sessionOrganizationId: sessionData?.currentOrganizationId,
    persistedOrganizationId: organizationId,
    allowedOrganizationIds: allowedOrgIds,
  });
  const { data: cachedEquipment } = useEquipmentById(cacheOrgId, equipmentId);
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
  }, [authLoading, equipmentId, user, orgIdFromUrl]);

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

  if (authLoading || isLoading) {
    return <QrPageLoadingShell />;
  }

  if (error || !payload) {
    const canOpenCachedEquipment =
      !isOnline &&
      !!cachedEquipment &&
      !!equipmentId &&
      !!cacheOrgId &&
      cachedEquipment.organization_id === cacheOrgId;

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
                {canOpenCachedEquipment
                  ? 'You are offline. Open the cached equipment record from your last session, or reconnect to load live QR details.'
                  : error || 'Equipment not found'}
              </AlertDescription>
            </Alert>
            {canOpenCachedEquipment ? (
              <Button
                className="w-full"
                onClick={() => window.location.assign(`/dashboard/equipment/${equipmentId}`)}
              >
                Open Cached Equipment
              </Button>
            ) : null}
            <Button className="w-full" variant={canOpenCachedEquipment ? 'outline' : 'default'} onClick={() => window.location.assign('/dashboard')}>
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { equipment, organization } = payload;
  const currentYear = new Date().getFullYear();
  const heroImageSrc = heroImageUrl && !heroImageFailed ? heroImageUrl : null;

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
          <div className="aspect-[16/10] bg-muted">
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
                <Forklift className="h-16 w-16 text-muted-foreground/60" />
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
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
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
                {scanStatus === 'logged'
                  ? 'Scan recorded'
                  : scanStatus === 'failed'
                    ? 'Equipment loaded, scan log failed'
                    : 'Recording scan...'}
              </p>
              <p className="mt-1 text-muted-foreground">
                Use quick actions below for field updates, or continue to the full dashboard record for parts, scans, and history.
              </p>
            </div>

            <EquipmentQRLastPMCard
              organizationId={payload.organization.id}
              details={latestPmQuery.data ?? null}
              isLoading={latestPmQuery.isLoading}
              isError={latestPmQuery.isError}
            />

            {showQuickActions && (
              <Suspense fallback={<div className="h-32 rounded-lg border bg-muted/30" aria-hidden="true" />}>
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
            )}

            <Button className="w-full" size="lg" onClick={openDashboardRecord}>
              Open Full Dashboard Record
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        <footer className="mt-5 text-center text-[11px] leading-relaxed text-muted-foreground">
          <p>© {currentYear} Columbia Cloudworks LLC. All rights reserved.</p>
          <p>EquipQR™ is a trademark of Columbia Cloudworks LLC.</p>
        </footer>
      </main>
    </div>
  );
};

export default EquipmentQRScan;
