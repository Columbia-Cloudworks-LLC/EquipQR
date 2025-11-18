
import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, QrCode } from 'lucide-react';
import { FleetMapErrorBoundary } from '@/components/fleet-map/FleetMapErrorBoundary';
import { useGoogleMapsKey } from '@/hooks/useGoogleMapsKey';  
import { useTeamFleetData } from '@/hooks/useTeamFleetData';
import { Skeleton } from '@/components/ui/skeleton';
import { MapView } from '@/components/fleet-map/MapView';
import { TeamSelector } from '@/components/fleet-map/TeamSelector';
import { FleetSearchBox } from '@/components/fleet-map/FleetSearchBox';
import { FleetSummary } from '@/components/fleet-map/FleetSummary';
import { logger } from '@/utils/logger';




const FleetMap: React.FC = () => {
  const { googleMapsKey, isLoading: mapsKeyLoading, error: mapsKeyError, retry: retryMapsKey } = useGoogleMapsKey();
  const { data: teamFleetData, isLoading: teamFleetLoading, error: teamFleetError } = useTeamFleetData();
  
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');



  // Set default team selection when data loads
  useEffect(() => {
    if (teamFleetData?.teams.length > 0 && !selectedTeamId) {
      const firstTeamWithData = teamFleetData.teams.find(team => team.hasLocationData);
      if (firstTeamWithData) {
        setSelectedTeamId(firstTeamWithData.id);
      } else if (teamFleetData.teams.length > 1) {
        // If no team has location data but there are multiple teams, show "All Teams"
        setSelectedTeamId('all');
      }
    }
  }, [teamFleetData, selectedTeamId]);

  // Get selected team data
  const selectedTeam = useMemo(() => {
    if (!teamFleetData || !selectedTeamId || selectedTeamId === 'all') return null;
    return teamFleetData.teams.find(team => team.id === selectedTeamId) || null;
  }, [teamFleetData, selectedTeamId]);

  // Get equipment locations for selected team
  const equipmentLocations = useMemo(() => {
    if (!teamFleetData) return [];
    
    if (selectedTeamId === 'all') {
      // Return all equipment from all teams
      return teamFleetData.teamEquipmentData.flatMap(team => team.equipment);
    } else {
      // Return equipment from selected team
      const teamData = teamFleetData.teamEquipmentData.find(team => team.teamId === selectedTeamId);
      return teamData?.equipment || [];
    }
  }, [teamFleetData, selectedTeamId]);

  // Filter equipment based on search term
  const filteredLocations = useMemo(() => {
    if (!searchTerm.trim()) return equipmentLocations;
    
    const lowerSearch = searchTerm.toLowerCase();
    return equipmentLocations.filter(location =>
      location.name.toLowerCase().includes(lowerSearch) ||
      location.manufacturer.toLowerCase().includes(lowerSearch) ||
      location.model.toLowerCase().includes(lowerSearch) ||
      location.serial_number.toLowerCase().includes(lowerSearch)
    );
  }, [equipmentLocations, searchTerm]);

  // Check if we have sufficient location data
  const hasLocationData = teamFleetData?.hasLocationData || false;
  const isLoading = teamFleetLoading || mapsKeyLoading;
  const error = teamFleetError || mapsKeyError;


  // Handle errors (only if error message is non-empty)
  if (error) {
    logger.error('[FleetMap] Error', error);
    // Extract error message from Error object or use string directly
    const errorMessage = typeof error === 'string' 
      ? error 
      : error instanceof Error 
        ? error.message 
        : 'Failed to load fleet data';
    
    // Only show error if message is non-empty
    if (errorMessage && errorMessage.trim()) {
      return (
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Fleet Map</h1>
          </div>
          <FleetMapErrorBoundary 
            error={errorMessage} 
            onRetry={() => window.location.reload()}
            isRetrying={false}
          />
        </div>
      );
    }
  }

  // Handle loading states
  if (isLoading) {
    // Loading state
    logger.debug('[FleetMap] Loading state', {
      mapsKeyLoading,
      hasGoogleMapsKey: !!googleMapsKey,
      hasLocationData
    });
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Fleet Map</h1>
          <p className="text-muted-foreground">
            {teamFleetLoading ? 'Loading team fleet data...' : 'Loading map configuration...'}
          </p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1 space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
          <div className="lg:col-span-3">
            <Skeleton className="h-[600px] w-full" />
          </div>
        </div>
      </div>
    );
  }

  // Handle case where no equipment has sufficient location data for mapping
  if (!hasLocationData && !isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Fleet Map</h1>
          <p className="text-muted-foreground">
            {teamFleetData?.totalLocatedCount === 0 
              ? 'No equipment with location data found' 
              : `Insufficient location data for mapping (${teamFleetData?.totalLocatedCount || 0} of ${teamFleetData?.totalEquipmentCount || 0} equipment items have location data)`
            }
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-4">
            <FleetSummary
              selectedTeam={null}
              selectedTeamId={null}
              equipmentLocations={[]}
              totalEquipmentCount={teamFleetData?.totalEquipmentCount || 0}
              totalLocatedCount={teamFleetData?.totalLocatedCount || 0}
            />

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <QrCode className="h-4 w-4" />
                  Get Started
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  To view your equipment on the fleet map, you need to add location data first.
                </p>
                <div className="space-y-2">
                  <p className="text-sm font-medium">How to add locations:</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Scan QR codes to capture GPS coordinates</li>
                    <li>• Add coordinates manually in equipment settings</li>
                    <li>• Enter addresses for geocoding</li>
                  </ul>
                </div>
                <Button 
                  onClick={() => window.location.href = '/dashboard/scanner'}
                  className="w-full"
                >
                  <QrCode className="h-4 w-4 mr-2" />
                  Scan QR Code
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Map placeholder */}
          <div className="lg:col-span-3">
            <Card>
              <CardContent className="p-0">
                <div className="h-[600px] w-full bg-muted/50 border-2 border-dashed border-muted-foreground/25 rounded-lg flex items-center justify-center">
                  <div className="text-center space-y-4">
                    <MapPin className="h-12 w-12 text-muted-foreground/50 mx-auto" />
                    <div>
                      <h3 className="text-lg font-semibold text-muted-foreground">No Location Data</h3>
                      <p className="text-sm text-muted-foreground">
                        Scan QR codes or add location data to see your equipment on the map
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Handle missing Google Maps key
  if (!googleMapsKey && !mapsKeyLoading) {
    logger.error('[FleetMap] Missing Google Maps API key', { mapsKeyError });
    const errorMessage = mapsKeyError || "Google Maps API key not available. Please check the VITE_GOOGLE_MAPS_BROWSER_KEY secret configuration.";
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Fleet Map</h1>
        </div>
        <FleetMapErrorBoundary 
          error={errorMessage}
          onRetry={retryMapsKey}
          isRetrying={mapsKeyLoading}
        />
      </div>
    );
  }

  // Only render the full map interface if we have location data
  if (hasLocationData) {
    // Check if selected team/filter has location data
    const selectedTeamHasLocationData = equipmentLocations.length > 0;
    const filteredHasLocationData = filteredLocations.length > 0;
    
    // If selected team has no location data, show helpful message
    if (!selectedTeamHasLocationData && selectedTeamId && selectedTeamId !== 'all') {
      const teamName = selectedTeam?.name || 'this team';
      return (
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Fleet Map</h1>
            <p className="text-sm text-muted-foreground">
              Showing equipment from accessible teams with location data
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Sidebar */}
            <div className="lg:col-span-1 space-y-4">
              <TeamSelector
                teams={teamFleetData?.teams || []}
                selectedTeamId={selectedTeamId}
                onTeamChange={setSelectedTeamId}
                isLoading={teamFleetLoading}
              />

              <FleetSearchBox
                value={searchTerm}
                onChange={setSearchTerm}
                disabled={!selectedTeamId}
              />

              <FleetSummary
                selectedTeam={selectedTeam}
                selectedTeamId={selectedTeamId}
                equipmentLocations={filteredLocations}
                totalEquipmentCount={teamFleetData?.totalEquipmentCount || 0}
                totalLocatedCount={teamFleetData?.totalLocatedCount || 0}
              />

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <QrCode className="h-4 w-4" />
                    Add Location Data
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {teamName} has no equipment with location data yet. Scan QR codes on equipment belonging to this team to generate map data.
                  </p>
                  <Button 
                    onClick={() => window.location.href = '/dashboard/scanner'}
                    className="w-full"
                  >
                    <QrCode className="h-4 w-4 mr-2" />
                    Scan QR Code
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Map placeholder */}
            <div className="lg:col-span-3">
              <Card>
                <CardContent className="p-0">
                  <div className="h-[600px] w-full bg-muted/50 border-2 border-dashed border-muted-foreground/25 rounded-lg flex items-center justify-center">
                    <div className="text-center space-y-4">
                      <MapPin className="h-12 w-12 text-muted-foreground/50 mx-auto" />
                      <div>
                        <h3 className="text-lg font-semibold text-muted-foreground">No Location Data for {teamName}</h3>
                        <p className="text-sm text-muted-foreground">
                          Scan QR codes on equipment belonging to this team to see them on the map
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      );
    }

    // If search filter has no results but team has data, show message
    if (!filteredHasLocationData && selectedTeamHasLocationData && searchTerm.trim()) {
      return (
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Fleet Map</h1>
            <p className="text-sm text-muted-foreground">
              Showing equipment from accessible teams with location data
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Sidebar */}
            <div className="lg:col-span-1 space-y-4">
              <TeamSelector
                teams={teamFleetData?.teams || []}
                selectedTeamId={selectedTeamId}
                onTeamChange={setSelectedTeamId}
                isLoading={teamFleetLoading}
              />

              <FleetSearchBox
                value={searchTerm}
                onChange={setSearchTerm}
                disabled={!selectedTeamId}
              />

              <FleetSummary
                selectedTeam={selectedTeam}
                selectedTeamId={selectedTeamId}
                equipmentLocations={filteredLocations}
                totalEquipmentCount={teamFleetData?.totalEquipmentCount || 0}
                totalLocatedCount={teamFleetData?.totalLocatedCount || 0}
              />
            </div>

            {/* Map placeholder */}
            <div className="lg:col-span-3">
              <Card>
                <CardContent className="p-0">
                  <div className="h-[600px] w-full bg-muted/50 border-2 border-dashed border-muted-foreground/25 rounded-lg flex items-center justify-center">
                    <div className="text-center space-y-4">
                      <MapPin className="h-12 w-12 text-muted-foreground/50 mx-auto" />
                      <div>
                        <h3 className="text-lg font-semibold text-muted-foreground">No Results</h3>
                        <p className="text-sm text-muted-foreground">
                          No equipment matches your search criteria. Try adjusting your search terms.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      );
    }

    // Render map with location data
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Fleet Map</h1>
          <p className="text-sm text-muted-foreground">
            Showing equipment from accessible teams with location data
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-4">
            <TeamSelector
              teams={teamFleetData?.teams || []}
              selectedTeamId={selectedTeamId}
              onTeamChange={setSelectedTeamId}
              isLoading={teamFleetLoading}
            />

            <FleetSearchBox
              value={searchTerm}
              onChange={setSearchTerm}
              disabled={!selectedTeamId}
            />

            <FleetSummary
              selectedTeam={selectedTeam}
              selectedTeamId={selectedTeamId}
              equipmentLocations={filteredLocations}
              totalEquipmentCount={teamFleetData?.totalEquipmentCount || 0}
              totalLocatedCount={teamFleetData?.totalLocatedCount || 0}
            />
          </div>

          {/* Map */}
          <div className="lg:col-span-3">
            {googleMapsKey && filteredHasLocationData ? (
              <MapView
                googleMapsKey={googleMapsKey}
                equipmentLocations={equipmentLocations}
                filteredLocations={filteredLocations}
              />
            ) : (
              <Card>
                <CardContent className="p-0">
                  <div className="h-[600px] w-full bg-muted/50 border-2 border-dashed border-muted-foreground/25 rounded-lg flex items-center justify-center">
                    <div className="text-center space-y-4">
                      <MapPin className="h-12 w-12 text-muted-foreground/50 mx-auto" />
                      <div>
                        <h3 className="text-lg font-semibold text-muted-foreground">Loading Map...</h3>
                        <p className="text-sm text-muted-foreground">
                          Preparing to display equipment locations
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    );
  }

  // This should not be reached due to the conditions above, but just in case
  return null;
};

export default FleetMap;
