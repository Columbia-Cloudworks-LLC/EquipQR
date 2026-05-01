import React, { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { AlertCircle, ArrowRight, Clock, Forklift, MapPin } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import EquipQRIcon from '@/components/ui/EquipQRIcon';
import { useAuth } from '@/hooks/useAuth';
import { saveOrganizationPreference } from '@/utils/sessionPersistence';
import type { Database } from '@/integrations/supabase/types';
import type { Role } from '@/types/permissions';
import QrPageLoadingShell from '@/features/equipment/components/qr/QrPageLoadingShell';
import {
  fetchEquipmentQRPayload,
  userLimitsSensitivePi,
  insertScan,
  type EquipmentQRPayload,
} from '@/features/equipment/services/equipmentQRPermissions';

type EquipmentStatus = Database['public']['Enums']['equipment_status'];

const PRODUCTION_URL = 'https://equipqr.app';
/** Matches SimpleOrganizationProvider — ensures dashboard loads the scanned org after full-document navigation. */
const DASHBOARD_CURRENT_ORG_STORAGE_KEY = 'equipqr_current_organization';
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
  const orgId = searchParams.get('org') ?? undefined;
  const { user, isLoading: authLoading } = useAuth();
  const [payload, setPayload] = useState<EquipmentQRPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scanStatus, setScanStatus] = useState<ScanStatus>('idle');
  const [showQuickActions, setShowQuickActions] = useState(false);
  const scanStartedRef = useRef(false);

  useEffect(() => {
    if (authLoading) return;
    if (user || !equipmentId) return;

    const orgParam = orgId ? `&org=${orgId}` : '';
    sessionStorage.setItem('pendingRedirect', `/qr/equipment/${equipmentId}?qr=true${orgParam}`);
    window.location.replace('/auth?tab=signin');
  }, [authLoading, equipmentId, user]);

  useEffect(() => {
    if (authLoading || !user || !equipmentId) return;

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    fetchEquipmentQRPayload(equipmentId, orgId)
      .then(result => {
        if (!cancelled) setPayload(result);
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
  }, [authLoading, equipmentId, user]);

  useEffect(() => {
    if (!payload || !user || scanStartedRef.current) return;

    scanStartedRef.current = true;
    setScanStatus('logging');

    const logWithoutLocation = (notes: string) =>
      insertScan(payload.equipment.id, null, notes);

    const logScan = async () => {
      const orgAllowsLocation = payload.organization.scan_location_collection_enabled;
      const userLimitedPi = await userLimitsSensitivePi(user.id);

      if (!orgAllowsLocation || userLimitedPi || !('geolocation' in navigator)) {
        await logWithoutLocation('QR code scan');
        return;
      }

      await new Promise<void>((resolve, reject) => {
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
      .then(() => setScanStatus('logged'))
      .catch(() => setScanStatus('failed'));
  }, [payload, user]);

  useEffect(() => {
    if (!payload) return;

    const frameId = window.requestAnimationFrame(() => setShowQuickActions(true));
    return () => window.cancelAnimationFrame(frameId);
  }, [payload]);

  const openDashboardRecord = useCallback(async () => {
    if (!payload) return;
    saveOrganizationPreference(payload.organization.id);
    try {
      localStorage.setItem(DASHBOARD_CURRENT_ORG_STORAGE_KEY, payload.organization.id);
    } catch {
      // ignore storage failures (private mode, quota)
    }
    window.location.assign(`/dashboard/equipment/${payload.equipment.id}`);
  }, [payload]);

  if (authLoading || isLoading) {
    return <QrPageLoadingShell />;
  }

  if (error || !payload) {
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
              <AlertDescription>{error || 'Equipment not found'}</AlertDescription>
            </Alert>
            <Button className="w-full" onClick={() => window.location.assign('/dashboard')}>
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { equipment, organization } = payload;
  const currentYear = new Date().getFullYear();

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
            {equipment.imageUrl ? (
              <img
                src={equipment.imageUrl}
                alt={equipment.name}
                className="h-full w-full object-cover"
                decoding="async"
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
