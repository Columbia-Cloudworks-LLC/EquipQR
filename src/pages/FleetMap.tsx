
import React, { useState, useEffect, useMemo } from 'react';
import { GoogleMap, LoadScript, MarkerF, InfoWindowF } from '@react-google-maps/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Search, MapPin } from 'lucide-react';
import { useSimpleOrganization } from '@/hooks/useSimpleOrganization';
import { useFleetMapSubscription } from '@/hooks/useFleetMapSubscription';
import { FleetMapUpsell } from '@/components/fleet-map/FleetMapUpsell';
import { FleetMapErrorBoundary } from '@/components/fleet-map/FleetMapErrorBoundary';
import { useGoogleMapsKey } from '@/hooks/useGoogleMapsKey';
import { parseLatLng } from '@/utils/geoUtils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface EquipmentLocation {
  id: string;
  name: string;
  manufacturer: string;
  model: string;
  serial_number: string;
  lat: number;
  lng: number;
  source: 'equipment' | 'geocoded' | 'scan';
  formatted_address?: string;
}


const mapContainerStyle = {
  width: '100%',
  height: '600px'
};

const defaultCenter = {
  lat: 39.8283,
  lng: -98.5795 // Center of USA
};

const FleetMap: React.FC = () => {
  const { currentOrganization } = useSimpleOrganization();
  const { data: subscription, isLoading: subscriptionLoading } = useFleetMapSubscription(currentOrganization?.id);
  const { googleMapsKey, isLoading: mapsKeyLoading, error: mapsKeyError, retry: retryMapsKey } = useGoogleMapsKey();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMarker, setSelectedMarker] = useState<EquipmentLocation | null>(null);
  const [equipmentLocations, setEquipmentLocations] = useState<EquipmentLocation[]>([]);
  const [skippedCount, setSkippedCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const isSubscriptionActive = !!subscription?.active;


  // Load equipment locations
  useEffect(() => {
    if (!isSubscriptionActive || subscriptionLoading) return;

    const loadEquipmentLocations = async () => {
      if (!currentOrganization?.id || !googleMapsKey) return;

      console.log('[FleetMap] Loading equipment locations...', {
        organizationId: currentOrganization.id,
        hasGoogleMapsKey: !!googleMapsKey
      });

      setIsLoading(true);
      try {
        const locations = await getEquipmentLocations(currentOrganization.id);
        setEquipmentLocations(locations);
        setSkippedCount(await getSkippedEquipmentCount(currentOrganization.id, locations.length));
        
        console.log('[FleetMap] Successfully loaded equipment locations:', {
          locatedCount: locations.length,
          skippedCount: await getSkippedEquipmentCount(currentOrganization.id, locations.length)
        });
      } catch (error) {
        console.error('[FleetMap] Failed to load equipment locations:', error);
        toast.error('Failed to load equipment locations', {
          description: error instanceof Error ? error.message : 'Unknown error occurred'
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadEquipmentLocations();
  }, [currentOrganization?.id, googleMapsKey, isSubscriptionActive, subscriptionLoading]);

  // Get equipment locations with precedence logic
  const getEquipmentLocations = async (organizationId: string): Promise<EquipmentLocation[]> => {
    // Fetch all equipment for the organization
    const { data: equipment, error: equipmentError } = await supabase
      .from('equipment')
      .select('id, name, manufacturer, model, serial_number, location')
      .eq('organization_id', organizationId);

    if (equipmentError) throw equipmentError;
    if (!equipment) return [];

    const locations: EquipmentLocation[] = [];

    for (const item of equipment) {
      let coords: { lat: number; lng: number } | null = null;
      let source: 'equipment' | 'geocoded' | 'scan' = 'equipment';
      let formatted_address: string | undefined;

      // A. Try to parse equipment.location as "lat, lng"
      if (item.location) {
        coords = parseLatLng(item.location);
        if (coords) {
          source = 'equipment';
        }
      }

      // B. If not parseable and non-empty, try geocoding
      if (!coords && item.location?.trim()) {
        try {
          const { data: geocodeResult, error: geocodeError } = await supabase.functions.invoke('geocode-location', {
            body: {
              organizationId,
              input: item.location
            }
          });

          if (!geocodeError && geocodeResult?.lat && geocodeResult?.lng) {
            coords = { lat: geocodeResult.lat, lng: geocodeResult.lng };
            source = 'geocoded';
            formatted_address = geocodeResult.formatted_address;
          }
        } catch (error) {
          console.warn(`Geocoding failed for equipment ${item.id}:`, error);
        }
      }

      // C. If still no coords, try latest scan with geo-tag
      if (!coords) {
        try {
          const { data: scans, error: scansError } = await supabase
            .from('scans')
            .select('location')
            .eq('equipment_id', item.id)
            .not('location', 'is', null)
            .order('scanned_at', { ascending: false })
            .limit(1);

          if (!scansError && scans && scans.length > 0 && scans[0].location) {
            coords = parseLatLng(scans[0].location);
            if (coords) {
              source = 'scan';
            }
          }
        } catch (error) {
          console.warn(`Failed to fetch scans for equipment ${item.id}:`, error);
        }
      }

      // If we have coordinates, add to locations
      if (coords) {
        locations.push({
          id: item.id,
          name: item.name,
          manufacturer: item.manufacturer,
          model: item.model,
          serial_number: item.serial_number,
          lat: coords.lat,
          lng: coords.lng,
          source,
          formatted_address
        });
      }
    }

    return locations;
  };

  // Get count of equipment that couldn't be located
  const getSkippedEquipmentCount = async (organizationId: string, locatedCount: number): Promise<number> => {
    const { count, error } = await supabase
      .from('equipment')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId);

    if (error) {
      console.error('Failed to count total equipment:', error);
      return 0;
    }

    return (count || 0) - locatedCount;
  };

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

  // Handle subscription loading
  if (subscriptionLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Fleet Map</h1>
          <p className="text-muted-foreground">Checking subscription status...</p>
        </div>
      </div>
    );
  }

  // Handle subscription not active
  if (!isSubscriptionActive) {
    const handleEnableFleetMap = async () => {
      if (!currentOrganization?.id) return;
      
      try {
        setIsLoading(true);
        const { data, error } = await supabase.functions.invoke('create-fleetmap-checkout', {
          body: { organizationId: currentOrganization.id }
        });
        
        if (error) throw error;
        if (data?.url) {
          window.open(data.url, '_blank');
        }
      } catch (error) {
        console.error('Fleet Map checkout error:', error);
        toast.error('Failed to start Fleet Map subscription', {
          description: error instanceof Error ? error.message : 'Please try again later'
        });
      } finally {
        setIsLoading(false);
      }
    };

    return <FleetMapUpsell onEnableFleetMap={handleEnableFleetMap} isLoading={isLoading} />;
  }

  // Handle Google Maps key error
  if (mapsKeyError) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Fleet Map</h1>
        </div>
        <FleetMapErrorBoundary 
          error={mapsKeyError} 
          onRetry={retryMapsKey}
          isRetrying={mapsKeyLoading}
        />
      </div>
    );
  }

  // Handle loading states
  if (mapsKeyLoading || isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Fleet Map</h1>
          <p className="text-muted-foreground">
            {mapsKeyLoading ? 'Loading map configuration...' : 'Loading equipment locations...'}
          </p>
        </div>
      </div>
    );
  }

  // Handle missing Google Maps key
  if (!googleMapsKey) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Fleet Map</h1>
        </div>
        <FleetMapErrorBoundary 
          error="Google Maps API key not available. Please check the VITE_GOOGLE_MAPS_BROWSER_KEY secret configuration."
          onRetry={retryMapsKey}
          isRetrying={mapsKeyLoading}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Fleet Map</h1>
          <p className="text-sm text-muted-foreground">
            Source order: Equipment location → Geocoded address → Latest scan. 
            Skipped: {skippedCount}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-4 w-4" />
                Search Equipment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Input
                placeholder="Search by name, manufacturer, model, or serial..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Fleet Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Total Equipment:</span>
                <Badge variant="secondary">{equipmentLocations.length + skippedCount}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Plotted:</span>
                <Badge variant="default">{filteredLocations.length}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Skipped:</span>
                <Badge variant="destructive">{skippedCount}</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Equipment List */}
          <Card>
            <CardHeader>
              <CardTitle>Equipment List</CardTitle>
            </CardHeader>
            <CardContent className="max-h-64 overflow-y-auto">
              <div className="space-y-2">
                {filteredLocations.map((location) => (
                  <div
                    key={location.id}
                    className="p-2 border rounded cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedMarker(location)}
                  >
                    <div className="font-medium text-sm">{location.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {location.manufacturer} {location.model}
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      <MapPin className="h-3 w-3" />
                      <span className="text-xs capitalize">{location.source}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Map */}
        <div className="lg:col-span-3">
          <Card>
            <CardContent className="p-0">
              <LoadScript googleMapsApiKey={googleMapsKey}>
                <GoogleMap
                  mapContainerStyle={mapContainerStyle}
                  center={filteredLocations.length > 0 ? {
                    lat: filteredLocations[0].lat,
                    lng: filteredLocations[0].lng
                  } : defaultCenter}
                  zoom={filteredLocations.length > 0 ? 10 : 4}
                  options={{
                    zoomControl: true,
                    streetViewControl: false,
                    mapTypeControl: true,
                    fullscreenControl: true,
                  }}
                >
                  {filteredLocations.map((location) => (
                    <MarkerF
                      key={location.id}
                      position={{ lat: location.lat, lng: location.lng }}
                      onClick={() => setSelectedMarker(location)}
                    />
                  ))}

                  {selectedMarker && (
                    <InfoWindowF
                      position={{ lat: selectedMarker.lat, lng: selectedMarker.lng }}
                      onCloseClick={() => setSelectedMarker(null)}
                    >
                      <div className="p-2 min-w-[200px]">
                        <h3 className="font-semibold">{selectedMarker.name}</h3>
                        <p className="text-sm text-gray-600">
                          {selectedMarker.manufacturer} {selectedMarker.model}
                        </p>
                        <p className="text-xs text-gray-500">
                          Serial: {selectedMarker.serial_number}
                        </p>
                        <Separator className="my-2" />
                        <div className="flex items-center gap-1 text-xs">
                          <MapPin className="h-3 w-3" />
                          <span className="capitalize">
                            From {selectedMarker.source}
                            {selectedMarker.source === 'equipment' ? ' location' : 
                             selectedMarker.source === 'geocoded' ? ' address' : 
                             ' scan'}
                          </span>
                        </div>
                        {selectedMarker.formatted_address && (
                          <p className="text-xs text-gray-500 mt-1">
                            {selectedMarker.formatted_address}
                          </p>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full mt-2"
                          onClick={() => {
                            window.location.href = `/dashboard/equipment?search=${encodeURIComponent(selectedMarker.name)}`;
                          }}
                        >
                          View Details
                        </Button>
                      </div>
                    </InfoWindowF>
                  )}
                </GoogleMap>
              </LoadScript>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default FleetMap;
