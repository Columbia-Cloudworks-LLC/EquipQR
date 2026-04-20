
import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, PanelLeftOpen, PanelLeftClose, Forklift } from 'lucide-react';
import { FleetMapErrorBoundary } from '@/features/fleet-map/components/FleetMapErrorBoundary';
// IMPORTANT: FleetMap uses useGoogleMapsKey (key/mapId only), NOT
// useGoogleMapsLoader. The MapView wraps the map in <APIProvider> from
// @vis.gl/react-google-maps which loads the Maps script itself with the
// correct options (libraries=['places','marker'], proper async handshake,
// Map ID-aware renderer init). If we ALSO injected the script via
// useGoogleMapsLoader the two loaders race: the legacy script tag wins,
// js-api-loader emits "No options were set before calling importLibrary",
// the WebGL tile renderer never bootstraps, and the basemap stays blank
// while only DOM-overlay markers render. See issue #617 follow-up.
import { useGoogleMapsKey } from '@/hooks/useGoogleMapsKey';
import { useTeamFleetData } from '@/features/teams/hooks/useTeamFleetData';
import { Skeleton } from '@/components/ui/skeleton';
import { MapView } from '@/features/fleet-map/components/MapView';
import type { TeamHQLocation } from '@/features/fleet-map/components/MapView';
import EquipmentPanel from '@/features/fleet-map/components/EquipmentPanel';
import type { UnlocatedEquipment } from '@/features/fleet-map/components/EquipmentPanel';
import Page from '@/components/layout/Page';
import PageHeader from '@/components/layout/PageHeader';
import { useIsMobile } from '@/hooks/use-mobile';
import { useSelectedTeam } from '@/hooks/useSelectedTeam';
import { UNASSIGNED_TEAM_ID } from '@/contexts/selected-team-context';

const FleetMap: React.FC = () => {
  const {
    googleMapsKey,
    mapId: googleMapsMapId,
    isLoading: mapsKeyLoading,
    error: mapsKeyError,
    retry: retryMapsKey,
  } = useGoogleMapsKey();
  const { data: teamFleetData, isLoading: teamFleetLoading, error: teamFleetError } = useTeamFleetData();
  const isMobile = useIsMobile();
  const { selectedTeamId } = useSelectedTeam();

  const [panelOpen, setPanelOpen] = useState(false);
  const [focusEquipmentId, setFocusEquipmentId] = useState<string | null>(null);

  // Translate the global selection into the sentinel the existing service
  // payload uses: `null` (= "All teams") becomes `'all'`; `UNASSIGNED_TEAM_ID`
  // is passed through as `'unassigned'` (which `teamFleetService` already
  // buckets under that key).
  const fleetTeamKey: string =
    selectedTeamId === null
      ? 'all'
      : selectedTeamId === UNASSIGNED_TEAM_ID
        ? 'unassigned'
        : selectedTeamId;

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
    if (fleetTeamKey === 'all') {
      return teamFleetData.teamEquipmentData.flatMap(team => team.equipment);
    }
    const teamData = teamFleetData.teamEquipmentData.find(team => team.teamId === fleetTeamKey);
    return teamData?.equipment || [];
  }, [teamFleetData, fleetTeamKey]);

  // Build unlocated equipment list
  const unlocatedEquipment: UnlocatedEquipment[] = useMemo(() => {
    if (!teamFleetData) return [];
    // Unlocated = total equipment count minus located
    // We don't have full unlocated data from the service, so we compute from the difference
    // For now, return an empty array -- the service would need to also return unlocated items
    // This is a display enhancement we can add later
    return [];
  }, [teamFleetData]);

  // Build team HQ locations for star markers (filtered by selected team).
  // The 'unassigned' bucket is filtered out — there is no team HQ for it.
  const teamHQLocations: TeamHQLocation[] = useMemo(() => {
    if (!teamFleetData?.teams) return [];

    const formatAddr = (t: (typeof teamFleetData.teams)[number]): string | undefined => {
      const parts = [t.location_address, t.location_city, t.location_state, t.location_country].filter(Boolean);
      return parts.length > 0 ? parts.join(', ') : undefined;
    };

    const teamsWithHQ = teamFleetData.teams.filter(
      (t) => t.location_lat != null && t.location_lng != null && t.id !== 'unassigned',
    );

    if (fleetTeamKey === 'unassigned') {
      return [];
    }

    if (fleetTeamKey !== 'all') {
      const team = teamsWithHQ.find((t) => t.id === fleetTeamKey);
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
  }, [teamFleetData, fleetTeamKey]);

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
              </p>
              <Button variant="outline" onClick={() => window.location.href = '/dashboard/equipment'}>
                <Forklift className="h-4 w-4 mr-2" />
                Manage Equipment
              </Button>
            </CardContent>
          </Card>
        </div>
      </Page>
    );
  }

  // ── Main fleet map view ──
  // Team scope is owned by the global TopBar `useSelectedTeam` — there is no
  // per-page team selector on this toolbar by design.
  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Toolbar — left: panel toggle | right: status summary */}
      <div className="flex items-center px-4 py-2 bg-background border-b shadow-sm z-10 flex-shrink-0">
        {/* Left controls group */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPanelOpen(!panelOpen)}
            className="gap-1.5 h-8 bg-background"
          >
            {panelOpen ? <PanelLeftClose className="h-3.5 w-3.5" /> : <PanelLeftOpen className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">{panelOpen ? 'Hide Panel' : 'Equipment'}</span>
          </Button>
        </div>

        <div className="flex-1" />

        {/* Right status group */}
        <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
          <div className="w-px h-4 bg-border/40" />
          <MapPin className="h-3.5 w-3.5" />
          <span>
            <span className="font-semibold text-foreground">{equipmentLocations.length}</span>
            {' of '}
            <span className="font-semibold text-foreground">{totalEquipmentCount}</span>
            {' located'}
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

        {/* Full-width Map. We render <MapView> as soon as we have an API key —
            the new vis.gl <APIProvider> inside MapView handles the script
            load (with loading=async) and shows its own progressive UI. */}
        <div className="h-full w-full">
          {googleMapsKey ? (
            // The class-based <FleetMapErrorBoundary> catches render-time
            // crashes inside <MapView> (notably the marker.js TypeError that
            // surfaces when Google Maps rejects the API key referrer mid-init,
            // see issue #617) so the rest of the app stays mounted instead of
            // bubbling to the global "Something went wrong" page.
            <FleetMapErrorBoundary>
              <MapView
                googleMapsKey={googleMapsKey}
                mapId={googleMapsMapId}
                equipmentLocations={equipmentLocations}
                filteredLocations={equipmentLocations}
                teamHQLocations={teamHQLocations}
                focusEquipmentId={focusEquipmentId}
                onMarkerClick={(id) => setFocusEquipmentId(id)}
              />
            </FleetMapErrorBoundary>
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
