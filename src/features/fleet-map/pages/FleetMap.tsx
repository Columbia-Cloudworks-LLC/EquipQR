
import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, PanelLeftOpen, PanelLeftClose, Forklift } from 'lucide-react';
import { FleetMapErrorBoundary } from '@/features/fleet-map/components/FleetMapErrorBoundary';
import { useGoogleMapsLoader } from '@/hooks/useGoogleMapsLoader';
import { useTeamFleetData } from '@/features/teams/hooks/useTeamFleetData';
import { Skeleton } from '@/components/ui/skeleton';
import { MapView } from '@/features/fleet-map/components/MapView';
import type { TeamHQLocation } from '@/features/fleet-map/components/MapView';
import EquipmentPanel from '@/features/fleet-map/components/EquipmentPanel';
import type { UnlocatedEquipment } from '@/features/fleet-map/components/EquipmentPanel';
import { logger } from '@/utils/logger';
import Page from '@/components/layout/Page';
import PageHeader from '@/components/layout/PageHeader';
import { useIsMobile } from '@/hooks/use-mobile';

const FleetMap: React.FC = () => {
  const { googleMapsKey, isLoaded: isMapsLoaded, loadError: mapsLoadError, isKeyLoading: mapsKeyLoading, keyError: mapsKeyError, retry: retryMapsKey } = useGoogleMapsLoader();
  const { data: teamFleetData, isLoading: teamFleetLoading, error: teamFleetError } = useTeamFleetData();
  const isMobile = useIsMobile();

  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [focusEquipmentId, setFocusEquipmentId] = useState<string | null>(null);

  // Default to "all" teams when data loads
  useEffect(() => {
    if (teamFleetData?.teams && teamFleetData.teams.length > 0 && !selectedTeamId) {
      setSelectedTeamId('all');
    }
  }, [teamFleetData, selectedTeamId]);

  // Open panel by default on desktop once data is available
  useEffect(() => {
    if (!isMobile && teamFleetData?.hasLocationData && !panelOpen) {
      setPanelOpen(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMobile, teamFleetData?.hasLocationData]);

  // Get equipment locations for selected team
  const equipmentLocations = useMemo(() => {
    if (!teamFleetData) return [];
    if (selectedTeamId === 'all') {
      return teamFleetData.teamEquipmentData.flatMap(team => team.equipment);
    }
    const teamData = teamFleetData.teamEquipmentData.find(team => team.teamId === selectedTeamId);
    return teamData?.equipment || [];
  }, [teamFleetData, selectedTeamId]);

  // Build unlocated equipment list
  const unlocatedEquipment: UnlocatedEquipment[] = useMemo(() => {
    if (!teamFleetData) return [];
    // Unlocated = total equipment count minus located
    // We don't have full unlocated data from the service, so we compute from the difference
    // For now, return an empty array -- the service would need to also return unlocated items
    // This is a display enhancement we can add later
    return [];
  }, [teamFleetData]);

  // Build team HQ locations for star markers (filtered by selected team)
  const teamHQLocations: TeamHQLocation[] = useMemo(() => {
    if (!teamFleetData?.teams) return [];

    const formatAddr = (t: (typeof teamFleetData.teams)[number]): string | undefined => {
      const parts = [t.location_address, t.location_city, t.location_state, t.location_country].filter(Boolean);
      return parts.length > 0 ? parts.join(', ') : undefined;
    };

    const teamsWithHQ = teamFleetData.teams.filter(
      (t) => t.location_lat != null && t.location_lng != null && t.id !== 'unassigned',
    );

    if (selectedTeamId && selectedTeamId !== 'all') {
      const team = teamsWithHQ.find((t) => t.id === selectedTeamId);
      return team
        ? [{ id: team.id, name: team.name, lat: team.location_lat!, lng: team.location_lng!, formatted_address: formatAddr(team) }]
        : [];
    }

    return teamsWithHQ.map((t) => ({
      id: t.id,
      name: t.name,
      lat: t.location_lat!,
      lng: t.location_lng!,
      formatted_address: formatAddr(t),
    }));
  }, [teamFleetData, selectedTeamId]);

  const totalEquipmentCount = teamFleetData?.totalEquipmentCount || 0;
  const hasLocationData = teamFleetData?.hasLocationData || false;
  const isLoading = teamFleetLoading || mapsKeyLoading;
  const error = teamFleetError || mapsKeyError;

  // Handle equipment select from panel
  const handleEquipmentSelect = (id: string) => {
    setFocusEquipmentId(id);
    // Reset after a tick to allow re-focus on same item
    setTimeout(() => setFocusEquipmentId(null), 100);
    // On mobile, close panel to show the map
    if (isMobile) {
      setPanelOpen(false);
    }
  };

  // ── Error state ──
  if (error) {
    const errorMessage = typeof error === 'string'
      ? error
      : error instanceof Error
        ? error.message
        : 'Failed to load fleet data';

    if (errorMessage?.trim()) {
      return (
        <Page maxWidth="7xl" padding="responsive">
          <div className="space-y-4">
            <PageHeader title="Fleet Map" description="Unable to load fleet map data" />
            <FleetMapErrorBoundary error={errorMessage} onRetry={() => window.location.reload()} isRetrying={false} />
          </div>
        </Page>
      );
    }
  }

  // ── Loading state ──
  if (isLoading) {
    return (
      <Page maxWidth="7xl" padding="responsive">
        <div className="space-y-4">
          <PageHeader
            title="Fleet Map"
            description={teamFleetLoading ? 'Loading fleet data...' : 'Loading map...'}
          />
          <Skeleton className="h-[600px] w-full rounded-lg" />
        </div>
      </Page>
    );
  }

  // ── No API key ──
  if (!googleMapsKey && !mapsKeyLoading) {
    const errorMessage = mapsKeyError || 'Google Maps API key not available.';
    return (
      <Page maxWidth="7xl" padding="responsive">
        <div className="space-y-4">
          <PageHeader title="Fleet Map" description={errorMessage} />
          <FleetMapErrorBoundary error={errorMessage} onRetry={retryMapsKey} isRetrying={mapsKeyLoading} />
        </div>
      </Page>
    );
  }

  // ── Empty state: no location data at all ──
  if (!hasLocationData && !isLoading) {
    return (
      <Page maxWidth="7xl" padding="responsive">
        <div className="space-y-4">
          <PageHeader title="Fleet Map" description="No equipment with location data found" />
          <Card>
            <CardContent className="py-16 flex flex-col items-center text-center">
              <div className="p-4 rounded-full bg-muted mb-4">
                <MapPin className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No Locations Yet</h3>
              <p className="text-sm text-muted-foreground max-w-md mb-4">
                Add addresses to your equipment or teams to see them on the fleet map.
                You can also scan QR codes to capture GPS coordinates.
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => window.location.href = '/dashboard/equipment'}>
                  <Forklift className="h-4 w-4 mr-2" />
                  Manage Equipment
                </Button>
                <Button onClick={() => window.location.href = '/dashboard/scanner'}>
                  <MapPin className="h-4 w-4 mr-2" />
                  Scan QR Code
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </Page>
    );
  }

  // ── Main fleet map view ──
  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Floating control bar */}
      <div className="flex items-center gap-2 px-4 py-2 bg-background border-b z-10 flex-shrink-0">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPanelOpen(!panelOpen)}
          className="gap-1.5 h-8"
        >
          {panelOpen ? <PanelLeftClose className="h-3.5 w-3.5" /> : <PanelLeftOpen className="h-3.5 w-3.5" />}
          <span className="hidden sm:inline">{panelOpen ? 'Hide Panel' : 'Equipment'}</span>
        </Button>

        <Select
          value={selectedTeamId || 'all'}
          onValueChange={(value) => setSelectedTeamId(value)}
        >
          <SelectTrigger className="w-[200px] h-8 text-xs">
            <SelectValue placeholder="All Teams" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              <span className="flex items-center gap-1.5">All Teams</span>
            </SelectItem>
            {(teamFleetData?.teams || []).map((team) => (
              <SelectItem key={team.id} value={team.id}>
                <span className="flex items-center gap-1.5">
                  {team.name}
                  {team.hasLocationData && (
                    <span className="text-[10px] text-muted-foreground">({team.equipmentCount})</span>
                  )}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex-1" />

        <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
          <MapPin className="h-3.5 w-3.5" />
          <span>
            <span className="font-semibold text-foreground">{equipmentLocations.length}</span> located
          </span>
        </div>
      </div>

      {/* Map + Panel container */}
      <div className="flex-1 relative overflow-hidden">
        {/* Equipment Panel (slides over map) */}
        <EquipmentPanel
          isOpen={panelOpen}
          onClose={() => setPanelOpen(false)}
          locatedEquipment={equipmentLocations}
          unlocatedEquipment={unlocatedEquipment}
          totalEquipmentCount={totalEquipmentCount}
          selectedEquipmentId={focusEquipmentId}
          onEquipmentSelect={handleEquipmentSelect}
        />

        {/* Full-width Map */}
        <div className="h-full w-full">
          {isMapsLoaded ? (
            <MapView
              googleMapsKey={googleMapsKey}
              equipmentLocations={equipmentLocations}
              filteredLocations={equipmentLocations}
              teamHQLocations={teamHQLocations}
              isMapsLoaded={isMapsLoaded}
              mapsLoadError={mapsLoadError}
              focusEquipmentId={focusEquipmentId}
              onMarkerClick={(id) => setFocusEquipmentId(id)}
            />
          ) : (
            <div className="h-full w-full bg-muted/50 flex items-center justify-center">
              <div className="text-center">
                <MapPin className="h-8 w-8 text-muted-foreground/50 mx-auto animate-pulse mb-2" />
                <p className="text-sm text-muted-foreground">Loading map...</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FleetMap;
