import React, { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AlertCircle, ArrowRight, Clock, Forklift, MapPin } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import EquipQRIcon from '@/components/ui/EquipQRIcon';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { Database } from '@/integrations/supabase/types';
import type { Role } from '@/types/permissions';
import QrPageLoadingShell from '@/features/equipment/components/qr/QrPageLoadingShell';

type EquipmentStatus = Database['public']['Enums']['equipment_status'];

const PRODUCTION_URL = 'https://equipqr.app';
const EquipmentQRQuickActions = lazy(() => import('@/features/equipment/components/qr/EquipmentQRQuickActions'));

interface OrganizationRelation {
  id: string;
  name: string;
  scan_location_collection_enabled: boolean;
}

interface TeamRelation {
  id: string;
  name: string;
}

interface EquipmentQRRow {
  id: string;
  organization_id: string;
  name: string;
  manufacturer: string;
  model: string;
  serial_number: string;
  status: EquipmentStatus;
  location: string | null;
  working_hours: number | null;
  image_url: string | null;
  default_pm_template_id: string | null;
  team: TeamRelation | TeamRelation[] | null;
  organizations: OrganizationRelation | OrganizationRelation[];
}

interface OrganizationMembershipRow {
  organization_id: string;
  role: string;
}

interface EquipmentQRPayload {
  equipment: {
    id: string;
    name: string;
    manufacturer: string;
    model: string;
    serialNumber: string;
    status: EquipmentStatus;
    location: string | null;
    workingHours: number | null;
    imageUrl: string | null;
    defaultPmTemplateId: string | null;
    team: TeamRelation | null;
  };
  organization: OrganizationRelation;
  userRole: string;
}

type ScanStatus = 'idle' | 'logging' | 'logged' | 'failed';

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

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

async function fetchEquipmentQRPayload(
  equipmentId: string,
  userId: string
): Promise<EquipmentQRPayload> {
  const { data: memberships, error: membershipError } = await supabase
    .from('organization_members')
    .select('organization_id, role')
    .eq('user_id', userId)
    .eq('status', 'active');

  if (membershipError) throw new Error(membershipError.message);
  if (!memberships || memberships.length === 0) {
    throw new Error('You do not have access to this equipment');
  }

  const membershipByOrganizationId = new Map(
    (memberships as OrganizationMembershipRow[]).map((membership) => [membership.organization_id, membership.role])
  );
  const scopedOrganizationIds = [...membershipByOrganizationId.keys()];

  const { data, error } = await supabase
    .from('equipment')
    .select(`
      id,
      organization_id,
      name,
      manufacturer,
      model,
      serial_number,
      status,
      location,
      working_hours,
      image_url,
      default_pm_template_id,
      team:team_id(id, name),
      organizations!inner(id, name, scan_location_collection_enabled)
    `)
    .in('organization_id', scopedOrganizationIds)
    .eq('id', equipmentId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error('Equipment not found');

  const row = data as unknown as EquipmentQRRow;
  const organization = firstRelation(row.organizations);
  if (!organization) throw new Error('Equipment organization not found');

  const scopedRole = membershipByOrganizationId.get(row.organization_id);
  if (!scopedRole) throw new Error('You do not have access to this equipment');

  return {
    equipment: {
      id: row.id,
      name: row.name,
      manufacturer: row.manufacturer,
      model: row.model,
      serialNumber: row.serial_number,
      status: row.status,
      location: row.location,
      workingHours: row.working_hours,
      imageUrl: row.image_url,
      defaultPmTemplateId: row.default_pm_template_id,
      team: firstRelation(row.team),
    },
    organization,
    userRole: scopedRole,
  };
}

async function userLimitsSensitivePi(userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('profiles')
    .select('limit_sensitive_pi')
    .eq('id', userId)
    .maybeSingle();

  return data?.limit_sensitive_pi === true;
}

async function insertScan(
  equipmentId: string,
  userId: string,
  location: string | null,
  notes: string
): Promise<void> {
  const { error } = await supabase.from('scans').insert({
    equipment_id: equipmentId,
    scanned_by: userId,
    location,
    notes,
  });

  if (error) throw new Error(error.message);
}

const EquipmentQRScan = () => {
  const { equipmentId } = useParams<{ equipmentId: string }>();
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

    sessionStorage.setItem('pendingRedirect', `/qr/equipment/${equipmentId}?qr=true`);
    window.location.replace('/auth?tab=signin');
  }, [authLoading, equipmentId, user]);

  useEffect(() => {
    if (authLoading || !user || !equipmentId) return;

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    fetchEquipmentQRPayload(equipmentId, user.id)
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
      insertScan(payload.equipment.id, user.id, null, notes);

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
            insertScan(payload.equipment.id, user.id, location, 'QR code scan with location')
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
    window.location.assign(`/dashboard/equipment/${payload.equipment.id}?qr=true`);
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
