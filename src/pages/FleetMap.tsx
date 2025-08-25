
import React, { useState, useEffect, useMemo } from 'react';
import { useSimpleOrganization } from '@/hooks/useSimpleOrganization';
import { useFleetMapSubscription } from '@/hooks/useFleetMapSubscription';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { GoogleMap, LoadScript, MarkerClusterer, Marker, InfoWindow } from '@react-google-maps/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Search, Package, Navigation, ExternalLink } from 'lucide-react';
import { FleetMapUpsell } from '@/components/fleet-map/FleetMapUpsell';
import { parseLatLng, normalizeAddress } from '@/utils/geoUtils';
import { showErrorToast } from '@/utils/errorHandling';
import { Link } from 'react-router-dom';

interface EquipmentLocation {
  id: string;
  name: string;
  manufacturer: string;
  model: string;
  serial_number: string;
  status: string;
  coordinates: { lat: number; lng: number };
  source: 'equipment' | 'geocoded' | 'scan';
  formatted_address?: string;
}

const mapContainerStyle = {
  width: '100%',
  height: '600px'
};

const defaultCenter = {
  lat: 39.8283, // Center of USA
  lng: -98.5795
};

const FleetMap = () => {
  const { currentOrganization } = useSimpleOrganization();
  const { data: subscription, isLoading: subscriptionLoading } = useFleetMapSubscription(currentOrganization?.id || '');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMarker, setSelectedMarker] = useState<EquipmentLocation | null>(null);
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);
  const [googleMapsKey, setGoogleMapsKey] = useState<string | null>(null);

  // Get Google Maps browser key
  useEffect(() => {
    const fetchGoogleMapsKey = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('public-google-maps-key');
        if (error) throw error;
        setGoogleMapsKey(data.key);
      } catch (error) {
        console.error('Failed to fetch Google Maps key:', error);
        showErrorToast(error, 'Loading Maps');
      }
    };
    fetchGoogleMapsKey();
  }, []);

  // Fetch equipment data
  const { data: equipment = [], isLoading: equipmentLoading } = useQuery({
    queryKey: ['equipment', currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization?.id) return [];
      
      const { data, error } = await supabase
        .from('equipment')
        .select('*')
        .eq('organization_id', currentOrganization.id);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentOrganization?.id && subscription?.active,
  });

  // Fetch scans data
  const { data: scans = [] } = useQuery({
    queryKey: ['scans', currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization?.id) return [];
      
      const { data, error } = await supabase
        .from('scans')
        .select('equipment_id, location, scanned_at')
        .eq('organization_id', currentOrganization.id)
        .not('location', 'is', null)
        .order('scanned_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentOrganization?.id && subscription?.active,
  });

  // Process equipment locations with precedence logic
  const equipmentLocations = useMemo(async () => {
    if (!equipment.length) return [];
    
    const locations: EquipmentLocation[] = [];
    
    for (const item of equipment) {
      let coordinates: { lat: number; lng: number } | null = null;
      let source: 'equipment' | 'geocoded' | 'scan' = 'equipment';
      let formatted_address: string | undefined;

      // A. Try parsing equipment.location as "lat, lng"
      if (item.location) {
        coordinates = parseLatLng(item.location);
        if (coordinates) {
          source = 'equipment';
        }
      }

      // B. If not coordinates yet, try geocoding the location text
      if (!coordinates && item.location && item.location.trim()) {
        try {
          const { data: geocodeResult, error } = await supabase.functions.invoke('geocode-location', {
            body: {
              organizationId: currentOrganization?.id,
              input: item.location
            }
          });
          
          if (!error && geocodeResult?.lat && geocodeResult?.lng) {
            coordinates = { lat: geocodeResult.lat, lng: geocodeResult.lng };
            source = 'geocoded';
            formatted_address = geocodeResult.formatted_address;
          }
        } catch (error) {
          console.warn(`Geocoding failed for equipment ${item.id}:`, error);
        }
      }

      // C. If still no coordinates, try latest scan with geo-tag
      if (!coordinates) {
        const equipmentScans = scans.filter(scan => scan.equipment_id === item.id);
        for (const scan of equipmentScans) {
          if (scan.location) {
            const scanCoords = parseLatLng(scan.location);
            if (scanCoords) {
              coordinates = scanCoords;
              source = 'scan';
              break; // Use the latest one (already ordered by scanned_at desc)
            }
          }
        }
      }

      // D. If we have coordinates, add to locations
      if (coordinates) {
        locations.push({
          id: item.id,
          name: item.name,
          manufacturer: item.manufacturer,
          model: item.model,
          serial_number: item.serial_number,
          status: item.status,
          coordinates,
          source,
          formatted_address
        });
      }
    }
    
    return locations;
  }, [equipment, scans, currentOrganization?.id]);

  // Filter locations based on search term
  const filteredLocations = useMemo(() => {
    if (!searchTerm) return equipmentLocations;
    
    const term = searchTerm.toLowerCase();
    return equipmentLocations.filter(location =>
      location.name.toLowerCase().includes(term) ||
      location.manufacturer.toLowerCase().includes(term) ||
      location.model.toLowerCase().includes(term) ||
      location.serial_number.toLowerCase().includes(term)
    );
  }, [equipmentLocations, searchTerm]);

  const handleEnableFleetMap = async () => {
    if (!currentOrganization?.id) return;
    
    setIsCheckoutLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-fleetmap-checkout', {
        body: { organizationId: currentOrganization.id }
      });
      
      if (error) throw error;
      
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      showErrorToast(error, 'Fleet Map Setup');
    } finally {
      setIsCheckoutLoading(false);
    }
  };

  if (subscriptionLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Fleet Map</h1>
          <p className="text-muted-foreground">Loading subscription status...</p>
        </div>
      </div>
    );
  }

  if (!subscription?.active) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Fleet Map</h1>
          <p className="text-muted-foreground">Track the real-time location of your equipment</p>
        </div>
        <FleetMapUpsell 
          onEnableFleetMap={handleEnableFleetMap}
          isLoading={isCheckoutLoading}
        />
      </div>
    );
  }

  if (!googleMapsKey) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Fleet Map</h1>
          <p className="text-muted-foreground">Loading map...</p>
        </div>
      </div>
    );
  }

  const skippedCount = equipment.length - equipmentLocations.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Fleet Map</h1>
        <p className="text-muted-foreground">
          Source order: Equipment location → Geocoded address → Latest scan. 
          {skippedCount > 0 && ` Skipped: ${skippedCount}.`}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Map */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Fleet Location Map
              </CardTitle>
              <CardDescription>
                Real-time equipment tracking and location monitoring
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LoadScript googleMapsApiKey={googleMapsKey}>
                <GoogleMap
                  mapContainerStyle={mapContainerStyle}
                  zoom={4}
                  center={defaultCenter}
                >
                  <MarkerClusterer>
                    {(clusterer) =>
                      filteredLocations.map((location) => (
                        <Marker
                          key={location.id}
                          position={location.coordinates}
                          clusterer={clusterer}
                          onClick={() => setSelectedMarker(location)}
                        />
                      ))
                    }
                  </MarkerClusterer>
                  
                  {selectedMarker && (
                    <InfoWindow
                      position={selectedMarker.coordinates}
                      onCloseClick={() => setSelectedMarker(null)}
                    >
                      <div className="p-2 max-w-sm">
                        <h3 className="font-semibold">{selectedMarker.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {selectedMarker.manufacturer} {selectedMarker.model}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Serial: {selectedMarker.serial_number}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant={selectedMarker.status === 'active' ? 'default' : 'secondary'}>
                            {selectedMarker.status}
                          </Badge>
                          <Badge variant="outline">
                            {selectedMarker.source === 'equipment' ? 'Equipment location' :
                             selectedMarker.source === 'geocoded' ? 'Geocoded address' : 'Latest scan'}
                          </Badge>
                        </div>
                        {selectedMarker.formatted_address && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {selectedMarker.formatted_address}
                          </p>
                        )}
                        <Link 
                          to={`/dashboard/equipment/${selectedMarker.id}`}
                          className="inline-flex items-center gap-1 text-sm text-primary hover:underline mt-2"
                        >
                          View details <ExternalLink className="h-3 w-3" />
                        </Link>
                      </div>
                    </InfoWindow>
                  )}
                </GoogleMap>
              </LoadScript>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Search */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Search Equipment</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, manufacturer..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </CardContent>
          </Card>

          {/* Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Statistics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Total Equipment</span>
                <Badge variant="outline">{equipment.length}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Plotted</span>
                <Badge variant="outline">{equipmentLocations.length}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Skipped</span>
                <Badge variant="outline">{skippedCount}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Showing</span>
                <Badge variant="outline">{filteredLocations.length}</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Legend */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Legend</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-sm">Equipment location</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span className="text-sm">Geocoded address</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                <span className="text-sm">Latest scan</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default FleetMap;
