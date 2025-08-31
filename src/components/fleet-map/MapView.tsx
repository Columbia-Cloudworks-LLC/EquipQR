import React, { useState, useMemo } from 'react';
import { GoogleMap, MarkerF, InfoWindowF, useJsApiLoader } from '@react-google-maps/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, ExternalLink, Clock, Wrench } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatDate, getRelativeTime } from '@/utils/basicDateFormatter';

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
  working_hours?: number;
  last_maintenance?: string;
  image_url?: string;
  location_updated_at?: string;
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
          <div className="p-3 min-w-[280px] max-w-[350px]">
            {/* Header with image */}
            <div className="flex gap-3 mb-3">
              {selectedMarker.image_url && (
                <div className="flex-shrink-0">
                  <img 
                    src={selectedMarker.image_url} 
                    alt={selectedMarker.name}
                    className="w-16 h-16 object-cover rounded-lg border"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                    }}
                  />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between mb-1">
                  <h3 className="font-semibold text-base truncate">{selectedMarker.name}</h3>
                  <Badge 
                    variant={
                      selectedMarker.source === 'equipment' ? 'default' :
                      selectedMarker.source === 'geocoded' ? 'secondary' : 'outline'
                    }
                    className="ml-2 text-xs flex-shrink-0"
                  >
                    {selectedMarker.source}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {selectedMarker.manufacturer} {selectedMarker.model}
                </p>
              </div>
            </div>
            
            {/* Equipment details */}
            <div className="space-y-2 text-sm mb-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="font-medium">Serial:</span>
                  <p className="text-muted-foreground truncate">{selectedMarker.serial_number}</p>
                </div>
                {selectedMarker.working_hours !== undefined && (
                  <div>
                    <span className="font-medium flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Hours:
                    </span>
                    <p className="text-muted-foreground">{selectedMarker.working_hours?.toLocaleString() || '0'}</p>
                  </div>
                )}
              </div>
              
              {selectedMarker.last_maintenance && (
                <div>
                  <span className="font-medium flex items-center gap-1">
                    <Wrench className="h-3 w-3" />
                    Last Maintenance:
                  </span>
                  <p className="text-muted-foreground">{formatDate(selectedMarker.last_maintenance)}</p>
                </div>
              )}
              
              {selectedMarker.formatted_address && (
                <div>
                  <span className="font-medium flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    Address:
                  </span>
                  <p className="text-xs text-muted-foreground">{selectedMarker.formatted_address}</p>
                </div>
              )}
              
              {selectedMarker.location_updated_at && (
                <div>
                  <span className="font-medium">Location Updated:</span>
                  <p className="text-xs text-muted-foreground">
                    {getRelativeTime(selectedMarker.location_updated_at)}
                  </p>
                </div>
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