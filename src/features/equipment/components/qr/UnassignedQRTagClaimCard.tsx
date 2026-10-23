import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  CopyPlus,
  Forklift,
  Link2,
  PlusCircle,
  QrCode,
  Search,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { EquipmentService, type EquipmentWithTeam } from '@/features/equipment/services/EquipmentService';
import {
  claimQRTagForEquipment,
  type UnassignedQRTagContext,
} from '@/features/equipment/services/equipmentQRTagService';
import { generateEquipmentName } from '@/features/equipment/types/equipment';
import { buildEquipmentCloneDefaultValues } from '@/features/equipment/utils/equipmentFormMappers';

interface UnassignedQRTagClaimCardProps {
  context: UnassignedQRTagContext;
  onClaimed: (equipmentId: string) => void;
}

type ClaimMode = 'create' | 'attach';

interface TeamOption {
  id: string;
  name: string;
}

const NO_CLONE_VALUE = '__none__';
const UNASSIGNED_TEAM_VALUE = '__unassigned__';

export const UnassignedQRTagClaimCard: React.FC<UnassignedQRTagClaimCardProps> = ({
  context,
  onClaimed,
}) => {
  const { tag, organization, userRole } = context;
  const canClaim = userRole === 'owner' || userRole === 'admin' || userRole === 'member';

  const [mode, setMode] = useState<ClaimMode>('create');
  const [existingEquipment, setExistingEquipment] = useState<EquipmentWithTeam[]>([]);
  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Create / Clone form state
  const [cloneSourceId, setCloneSourceId] = useState<string>(NO_CLONE_VALUE);
  const [manufacturer, setManufacturer] = useState('');
  const [model, setModel] = useState('');
  const [name, setName] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [location, setLocation] = useState('');
  const [teamId, setTeamId] = useState<string>(UNASSIGNED_TEAM_VALUE);
  const [defaultPmTemplateId, setDefaultPmTemplateId] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState<string | null>(null);

  // Attach to existing state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedExistingId, setSelectedExistingId] = useState<string | null>(null);

  const serialInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoadingCatalog(true);

    const loadCatalog = async () => {
      try {
        const [equipmentRes, teamsRes] = await Promise.all([
          EquipmentService.getAll(organization.id),
          supabase
            .from('teams')
            .select('id, name')
            .eq('organization_id', organization.id)
            .order('name', { ascending: true }),
        ]);

        if (cancelled) return;
        if (equipmentRes.success && equipmentRes.data) {
          setExistingEquipment(equipmentRes.data);
        }
        if (teamsRes.data) {
          setTeams(teamsRes.data);
        }
      } catch {
        // Non-fatal: technician can still enter new machine specs manually
      } finally {
        if (!cancelled) {
          setIsLoadingCatalog(false);
        }
      }
    };

    void loadCatalog();
    return () => {
      cancelled = true;
    };
  }, [organization.id]);

  const handleCloneSelection = (value: string) => {
    setCloneSourceId(value);
    if (value === NO_CLONE_VALUE) {
      setDefaultPmTemplateId(null);
      setCustomerId(null);
      return;
    }

    const source = existingEquipment.find((item) => item.id === value);
    if (!source) return;

    const clonedDefaults = buildEquipmentCloneDefaultValues({
      ...source,
      warranty_expiration: source.warranty_expiration ?? undefined,
      last_maintenance: source.last_maintenance ?? undefined,
      notes: source.notes ?? undefined,
      image_url: source.image_url ?? undefined,
      team_id: source.team_id ?? undefined,
      default_pm_template_id: source.default_pm_template_id ?? undefined,
      customer_id: source.customer_id ?? undefined,
      custom_attributes:
        source.custom_attributes &&
        typeof source.custom_attributes === 'object' &&
        !Array.isArray(source.custom_attributes)
          ? (source.custom_attributes as Record<string, string>)
          : undefined,
      last_known_location: undefined,
      assigned_location_street: source.assigned_location_street ?? undefined,
      assigned_location_city: source.assigned_location_city ?? undefined,
      assigned_location_state: source.assigned_location_state ?? undefined,
      assigned_location_country: source.assigned_location_country ?? undefined,
      assigned_location_lat: source.assigned_location_lat ?? undefined,
      assigned_location_lng: source.assigned_location_lng ?? undefined,
    });

    setManufacturer(clonedDefaults.manufacturer);
    setModel(clonedDefaults.model);
    setName(clonedDefaults.name);
    setLocation(clonedDefaults.location);
    setTeamId(clonedDefaults.team_id || UNASSIGNED_TEAM_VALUE);
    setDefaultPmTemplateId(source.default_pm_template_id ?? null);
    setCustomerId(source.customer_id ?? null);
    setSerialNumber('');

    window.requestAnimationFrame(() => {
      serialInputRef.current?.focus();
    });
  };

  const filteredEquipment = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return existingEquipment.slice(0, 20);
    return existingEquipment
      .filter((item) => {
        const haystack = [
          item.name,
          item.manufacturer,
          item.model,
          item.serial_number,
          item.location,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(query);
      })
      .slice(0, 20);
  }, [existingEquipment, searchQuery]);

  const handleCreateAndClaim = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitError(null);

    const trimmedMake = manufacturer.trim();
    const trimmedModel = model.trim();
    const trimmedSerial = serialNumber.trim();
    const resolvedName = name.trim() || generateEquipmentName(trimmedMake, trimmedModel);

    if (!trimmedMake || !trimmedModel || !trimmedSerial) {
      setSubmitError('Manufacturer, Model, and Serial Number are required to activate this tag.');
      return;
    }

    setIsSubmitting(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const createRes = await EquipmentService.create(organization.id, {
        name: resolvedName,
        manufacturer: trimmedMake,
        model: trimmedModel,
        serial_number: trimmedSerial,
        status: 'active',
        location: location.trim() || 'Shop Yard',
        installation_date: today,
        warranty_expiration: null,
        last_maintenance: null,
        notes: `Activated via pre-printed QR tag ${tag.shortCode}`,
        custom_attributes: { qr_tag_code: tag.shortCode },
        image_url: null,
        last_known_location: null,
        team_id: teamId === UNASSIGNED_TEAM_VALUE ? null : teamId,
        default_pm_template_id: defaultPmTemplateId,
        customer_id: customerId,
        working_hours: 0,
        import_id: null,
        assigned_location_street: null,
        assigned_location_city: null,
        assigned_location_state: null,
        assigned_location_country: null,
        assigned_location_lat: null,
        assigned_location_lng: null,
      });

      if (!createRes.success || !createRes.data) {
        throw new Error(createRes.error || 'Failed to create equipment record');
      }

      await claimQRTagForEquipment(tag.id, createRes.data.id);
      toast.success(`QR tag ${tag.shortCode} linked to ${createRes.data.name}`);
      onClaimed(createRes.data.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to claim QR tag';
      setSubmitError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAttachExisting = async () => {
    if (!selectedExistingId) {
      setSubmitError('Select an existing piece of equipment to attach this QR tag.');
      return;
    }

    setSubmitError(null);
    setIsSubmitting(true);
    try {
      await claimQRTagForEquipment(tag.id, selectedExistingId);
      const matched = existingEquipment.find((item) => item.id === selectedExistingId);
      toast.success(
        `QR tag ${tag.shortCode} attached to ${matched?.name ?? 'selected equipment'}`,
      );
      onClaimed(selectedExistingId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to attach QR tag';
      setSubmitError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="overflow-hidden border-primary/30 shadow-sm">
      <div className="bg-primary/10 px-6 py-4 border-b border-primary/20">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <QrCode className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                New / Unassigned Tag Detected
              </p>
              <p className="text-sm font-medium text-foreground">
                {organization.name} • <span className="font-mono">{tag.shortCode}</span>
              </p>
            </div>
          </div>
          <Badge variant="secondary" className="font-mono text-xs">
            {tag.labelBatchName ? `${tag.labelBatchName} • Unassigned` : 'Unassigned Tag'}
          </Badge>
        </div>
      </div>

      <CardHeader className="space-y-2">
        <CardTitle className="text-xl">Claim / Adopt This Equipment</CardTitle>
        <CardDescription>
          This pre-printed EquipQR tag has not been assigned to a machine yet. Create a new
          equipment record or attach this tag to an existing unit in your fleet.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        {!canClaim ? (
          <Alert>
            <AlertTitle>Read-only access</AlertTitle>
            <AlertDescription>
              Ask an organization owner, admin, or team technician in {organization.name} to scan
              and activate this tag.
            </AlertDescription>
          </Alert>
        ) : (
          <>
            <div
              className="grid grid-cols-1 gap-2 sm:grid-cols-2"
              role="tablist"
              aria-label="Tag activation mode"
            >
              <Button
                type="button"
                variant={mode === 'create' ? 'default' : 'outline'}
                className="justify-start gap-2"
                onClick={() => {
                  setMode('create');
                  setSubmitError(null);
                }}
              >
                <PlusCircle className="h-4 w-4" />
                Create New Machine
              </Button>
              <Button
                type="button"
                variant={mode === 'attach' ? 'default' : 'outline'}
                className="justify-start gap-2"
                onClick={() => {
                  setMode('attach');
                  setSubmitError(null);
                }}
              >
                <Link2 className="h-4 w-4" />
                Search & Attach to Existing
              </Button>
            </div>

            {submitError && (
              <Alert variant="destructive">
                <AlertDescription>{submitError}</AlertDescription>
              </Alert>
            )}

            {mode === 'create' ? (
              <form onSubmit={handleCreateAndClaim} className="space-y-4">
                {existingEquipment.length > 0 && (
                  <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
                    <Label htmlFor="qr-claim-clone-source" className="flex items-center gap-1.5 text-xs font-medium">
                      <CopyPlus className="h-3.5 w-3.5 text-primary" />
                      Clone Similar (Optional — Copy make, model, team & PM template)
                    </Label>
                    <Select value={cloneSourceId} onValueChange={handleCloneSelection}>
                      <SelectTrigger id="qr-claim-clone-source">
                        <SelectValue placeholder="Start from scratch or copy an existing unit..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NO_CLONE_VALUE}>Start from scratch</SelectItem>
                        {existingEquipment.map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.name} ({item.manufacturer} {item.model})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="qr-claim-manufacturer">Manufacturer *</Label>
                    <Input
                      id="qr-claim-manufacturer"
                      placeholder="e.g. Caterpillar"
                      value={manufacturer}
                      onChange={(e) => setManufacturer(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="qr-claim-model">Model *</Label>
                    <Input
                      id="qr-claim-model"
                      placeholder="e.g. 320 GC"
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="qr-claim-serial">Serial Number *</Label>
                    <Input
                      ref={serialInputRef}
                      id="qr-claim-serial"
                      placeholder="Enter machine serial / VIN"
                      value={serialNumber}
                      onChange={(e) => setSerialNumber(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="qr-claim-name">Equipment Name</Label>
                    <Input
                      id="qr-claim-name"
                      placeholder={
                        manufacturer && model
                          ? generateEquipmentName(manufacturer, model)
                          : 'Auto-filled from Make & Model'
                      }
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="qr-claim-location">Location / Yard Bay</Label>
                    <Input
                      id="qr-claim-location"
                      placeholder="e.g. Intake Bay 2"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="qr-claim-team">Assigned Team</Label>
                    <Select value={teamId} onValueChange={setTeamId}>
                      <SelectTrigger id="qr-claim-team">
                        <SelectValue placeholder="Select team" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={UNASSIGNED_TEAM_VALUE}>Unassigned</SelectItem>
                        {teams.map((team) => (
                          <SelectItem key={team.id} value={team.id}>
                            {team.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
                  <Sparkles className="mr-2 h-4 w-4" />
                  {isSubmitting
                    ? 'Activating Tag...'
                    : `Create Machine & Activate ${tag.shortCode}`}
                </Button>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="qr-claim-search">Search Existing Equipment</Label>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="qr-claim-search"
                      className="pl-9"
                      placeholder="Search by name, make, model, or serial number..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>

                <div
                  className="max-h-64 overflow-y-auto rounded-lg border divide-y"
                  role="listbox"
                  aria-label="Existing equipment list"
                >
                  {isLoadingCatalog ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      Loading equipment...
                    </div>
                  ) : filteredEquipment.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      No matching equipment found in {organization.name}.
                    </div>
                  ) : (
                    filteredEquipment.map((item) => {
                      const isSelected = selectedExistingId === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          role="option"
                          aria-selected={isSelected}
                          onClick={() => setSelectedExistingId(item.id)}
                          className={`flex w-full items-center justify-between gap-3 p-3 text-left transition-colors hover:bg-muted/60 ${
                            isSelected ? 'bg-primary/10' : ''
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <Forklift className="h-5 w-5 shrink-0 text-muted-foreground" />
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-foreground">
                                {item.name}
                              </p>
                              <p className="truncate text-xs text-muted-foreground">
                                {item.manufacturer} {item.model} • S/N: {item.serial_number}
                              </p>
                            </div>
                          </div>
                          {isSelected && (
                            <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />
                          )}
                        </button>
                      );
                    })
                  )}
                </div>

                <Button
                  type="button"
                  className="w-full"
                  size="lg"
                  disabled={!selectedExistingId || isSubmitting}
                  onClick={() => void handleAttachExisting()}
                >
                  <Link2 className="mr-2 h-4 w-4" />
                  {isSubmitting
                    ? 'Attaching Tag...'
                    : `Attach ${tag.shortCode} to Selected Equipment`}
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

