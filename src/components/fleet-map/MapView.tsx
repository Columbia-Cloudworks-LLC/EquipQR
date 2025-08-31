import React, { useState, useMemo } from 'react';
import { GoogleMap, MarkerF, InfoWindowF, useJsApiLoader } from '@react-google-maps/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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

interface MapViewProps {
  googleMapsKey: string;
  equipmentLocations: EquipmentLocation[];
  filteredLocations: EquipmentLocation[];
}

const mapContainerStyle = {
  width: '100%',
  height: '600px'
};

const defaultCenter = {
  lat: 39.8283,
  lng: -98.5795 // Center of USA
};

// Stabilize libraries prop to prevent re-initialization
const GOOGLE_MAPS_LIBRARIES: ("places")[] = ["places"];

export const MapView: React.FC<MapViewProps> = ({ 
  googleMapsKey, 
  equipmentLocations, 
  filteredLocations 
}) => {
  const navigate = useNavigate();
  const [selectedMarker, setSelectedMarker] = useState<EquipmentLocation | null>(null);

  // Load Google Maps API - only called when googleMapsKey is available
  const { isLoaded: isMapsLoaded, loadError: mapsLoadError } = useJsApiLoader({
    id: 'google-maps-script',
    googleMapsApiKey: googleMapsKey,
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  console.log('[MapView] Component rendered:', {
    hasGoogleMapsKey: !!googleMapsKey,
    googleMapsKeyLength: googleMapsKey?.length || 0,
    isMapsLoaded,
    mapsLoadError: mapsLoadError?.message,
    filteredLocationsCount: filteredLocations.length
  });

  // Calculate map center based on equipment locations
  const mapCenter = useMemo(() => {
    if (filteredLocations.length === 0) return defaultCenter;
    
    const avgLat = filteredLocations.reduce((sum, loc) => sum + loc.lat, 0) / filteredLocations.length;
    const avgLng = filteredLocations.reduce((sum, loc) => sum + loc.lng, 0) / filteredLocations.length;
    
    return { lat: avgLat, lng: avgLng };
  }, [filteredLocations]);

  // Handle loading states
  if (!isMapsLoaded) {
    return (
      <div className="h-[600px] w-full bg-muted animate-pulse rounded-lg flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Loading Google Maps...</p>
        </div>
      </div>
    );
  }

  // Handle load error
  if (mapsLoadError) {
    console.error('[MapView] Google Maps load error:', mapsLoadError);
    return (
      <div className="h-[600px] w-full bg-destructive/10 border border-destructive/20 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive font-medium">Failed to load Google Maps</p>
          <p className="text-sm text-muted-foreground mt-1">{mapsLoadError.message}</p>
        </div>
      </div>
    );
  }

  return (
    <GoogleMap
      mapContainerStyle={mapContainerStyle}
      center={mapCenter}
      zoom={filteredLocations.length > 0 ? 6 : 4}
      options={{
        disableDefaultUI: false,
        zoomControl: true,
        streetViewControl: false,
        mapTypeControl: true,
        fullscreenControl: true,
      }}
    >
      {/* Equipment Markers */}
      {filteredLocations.map((location) => (
        <MarkerF
          key={location.id}
          position={{ lat: location.lat, lng: location.lng }}
          onClick={() => setSelectedMarker(location)}
          icon={{
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" fill="#3B82F6" stroke="#1E40AF" stroke-width="2"/>
                <circle cx="12" cy="10" r="3" fill="white"/>
              </svg>
            `),
            scaledSize: new window.google.maps.Size(32, 32),
            anchor: new window.google.maps.Point(16, 32)
          }}
        />
      ))}

      {/* Info Window */}
      {selectedMarker && (
        <InfoWindowF
          position={{ lat: selectedMarker.lat, lng: selectedMarker.lng }}
          onCloseClick={() => setSelectedMarker(null)}
        >
          <div className="p-2 min-w-[250px]">
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-semibold text-base">{selectedMarker.name}</h3>
              <Badge 
                variant={
                  selectedMarker.source === 'equipment' ? 'default' :
                  selectedMarker.source === 'geocoded' ? 'secondary' : 'outline'
                }
                className="ml-2 text-xs"
              >
                {selectedMarker.source}
              </Badge>
            </div>
            
            <div className="space-y-1 text-sm mb-3">
              <p><strong>Manufacturer:</strong> {selectedMarker.manufacturer}</p>
              <p><strong>Model:</strong> {selectedMarker.model}</p>
              <p><strong>Serial:</strong> {selectedMarker.serial_number}</p>
              {selectedMarker.formatted_address && (
                <p className="text-muted-foreground flex items-start gap-1">
                  <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0" />
                  <span className="text-xs">{selectedMarker.formatted_address}</span>
                </p>
              )}
            </div>
            
            <Button 
              size="sm" 
              onClick={() => navigate(`/equipment/${selectedMarker.id}`)}
              className="w-full"
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              View Details
            </Button>
          </div>
        </InfoWindowF>
      )}
    </GoogleMap>
  );
};