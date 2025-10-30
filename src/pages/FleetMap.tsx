
import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, RefreshCw } from 'lucide-react';
import { useSimpleOrganization } from '@/hooks/useSimpleOrganization';
import { useFleetMapSubscription } from '@/hooks/useFleetMapSubscription';
import { FleetMapUpsell } from '@/components/fleet-map/FleetMapUpsell';
import { FleetMapErrorBoundary } from '@/components/fleet-map/FleetMapErrorBoundary';
import { useGoogleMapsKey } from '@/hooks/useGoogleMapsKey';
import { parseLatLng } from '@/utils/geoUtils';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { MapView } from '@/components/fleet-map/MapView';

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



const FleetMap: React.FC = () => {
  const { currentOrganization, switchOrganization } = useSimpleOrganization();
  const { data: subscription, isLoading: subscriptionLoading, refetch: refetchSubscription } = useFleetMapSubscription(currentOrganization?.id);
  const { googleMapsKey, isLoading: mapsKeyLoading, error: mapsKeyError, retry: retryMapsKey } = useGoogleMapsKey();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [equipmentLocations, setEquipmentLocations] = useState<EquipmentLocation[]>([]);
  const [skippedCount, setSkippedCount] = useState(0);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);
  const [isRefreshingSubscription, setIsRefreshingSubscription] = useState(false);
  const queryClient = useQueryClient();
  const isSubscriptionActive = !!subscription?.active;


  // Handle post-checkout activation
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const activated = urlParams.get('activated');
    const organizationId = urlParams.get('organizationId');
    const cancelled = urlParams.get('cancelled');
    
    if (activated === 'true' && organizationId) {
      // Switch to the correct organization if needed
      if (currentOrganization?.id !== organizationId) {
        switchOrganization(organizationId);
      }
      
      // Refresh subscription status
      handleRefreshSubscription(organizationId);
      
      // Clean up URL parameters
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    } else if (cancelled === 'true') {
      toast.info('Fleet Map subscription was cancelled');
      // Clean up URL parameters
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, [currentOrganization?.id, switchOrganization]);

  // Refresh subscription function
  const handleRefreshSubscription = async (orgId?: string) => {
    const targetOrgId = orgId || currentOrganization?.id;
    if (!targetOrgId) return;

    try {
      setIsRefreshingSubscription(true);
      
      const { data, error } = await supabase.functions.invoke('refresh-fleetmap-subscription', {
        body: { organizationId: targetOrgId }
      });

      if (error) throw error;

      if (data?.success) {
        // Invalidate and refetch subscription data
        queryClient.invalidateQueries({ queryKey: ['fleet-map-subscription', targetOrgId] });
        await refetchSubscription();
        
        toast.success('Fleet Map activated successfully!', {
          description: 'Your subscription is now active and ready to use.'
        });
      } else {
        toast.error('Fleet Map activation failed', {
          description: data?.message || 'Please ensure you have an active subscription.'
        });
      }
    } catch (error) {
      console.error('Refresh subscription error:', error);
      toast.error('Failed to refresh subscription status', {
        description: error instanceof Error ? error.message : 'Please try again later'
      });
    } finally {
      setIsRefreshingSubscription(false);
    }
  };

  // Load equipment locations
  useEffect(() => {
    if (!isSubscriptionActive || subscriptionLoading) return;

    const loadEquipmentLocations = async () => {
      if (!currentOrganization?.id || !googleMapsKey) return;

      console.log('[FleetMap] Loading equipment locations...', {
        organizationId: currentOrganization.id,
        hasGoogleMapsKey: !!googleMapsKey
      });

      setIsDataLoading(true);
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
        setIsDataLoading(false);
      }
    };

    loadEquipmentLocations();
  }, [currentOrganization?.id, googleMapsKey, isSubscriptionActive, subscriptionLoading]);

  // Get equipment locations with precedence logic
  const getEquipmentLocations = async (organizationId: string): Promise<EquipmentLocation[]> => {
    // Fetch all equipment for the organization
    const { data: equipment, error: equipmentError } = await supabase
      .from('equipment')
      .select('id, name, manufacturer, model, serial_number, location, working_hours, last_maintenance, image_url, updated_at')
      .eq('organization_id', organizationId);

    if (equipmentError) throw equipmentError;
    if (!equipment) return [];

    const locations: EquipmentLocation[] = [];

    for (const item of equipment) {
      let coords: { lat: number; lng: number } | null = null;
      let source: 'equipment' | 'geocoded' | 'scan' = 'equipment';
      let formatted_address: string | undefined;
      let location_updated_at: string | undefined;

      // A. Try to parse equipment.location as "lat, lng"
      if (item.location) {
        coords = parseLatLng(item.location);
        if (coords) {
          source = 'equipment';
          location_updated_at = item.updated_at;
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
            // Try to get geocoded location timestamp
            try {
              const { data: geocodedLocation } = await supabase
                .from('geocoded_locations')
                .select('updated_at')
                .eq('organization_id', organizationId)
                .eq('input_text', item.location)
                .order('updated_at', { ascending: false })
                .limit(1)
                .single();
              location_updated_at = geocodedLocation?.updated_at;
            } catch (error) {
              // Fallback to equipment updated_at
              location_updated_at = item.updated_at;
            }
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
            .select('location, scanned_at')
            .eq('equipment_id', item.id)
            .not('location', 'is', null)
            .order('scanned_at', { ascending: false })
            .limit(1);

          if (!scansError && scans && scans.length > 0 && scans[0].location) {
            coords = parseLatLng(scans[0].location);
            if (coords) {
              source = 'scan';
              location_updated_at = scans[0].scanned_at;
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
          formatted_address,
          working_hours: item.working_hours,
          last_maintenance: item.last_maintenance,
          image_url: item.image_url,
          location_updated_at
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
    const isOwner = currentOrganization?.userRole === 'owner';
    
    const handleEnableFleetMap = async () => {
      if (!currentOrganization?.id) return;
      
      if (!isOwner) {
        toast.error('Only organization owners can purchase features for this organization');
        return;
      }
      
      try {
        setIsCheckoutLoading(true);
        const { data, error } = await supabase.functions.invoke('create-fleetmap-checkout', {
          body: { organizationId: currentOrganization.id }
        });
        
        if (error) {
          if (error.message?.includes('403') || error.message?.includes('owner')) {
            throw new Error('Only organization owners can purchase features for this organization');
          }
          throw error;
        }
        if (data?.url) {
          window.open(data.url, '_blank');
        }
      } catch (error) {
        console.error('Fleet Map checkout error:', error);
        toast.error('Failed to start Fleet Map subscription', {
          description: error instanceof Error ? error.message : 'Please try again later'
        });
      } finally {
        setIsCheckoutLoading(false);
      }
    };

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Fleet Map</h1>
            <p className="text-muted-foreground">Fleet Map subscription required</p>
          </div>
          <Button 
            onClick={() => handleRefreshSubscription()} 
            disabled={isRefreshingSubscription}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshingSubscription ? 'animate-spin' : ''}`} />
            Refresh Status
          </Button>
        </div>
        <FleetMapUpsell 
          onEnableFleetMap={handleEnableFleetMap} 
          isLoading={isCheckoutLoading}
          canPurchase={isOwner}
          helperText={isOwner ? undefined : 'Only organization owners can purchase Fleet Map'}
        />
      </div>
    );
  }

  // Handle Google Maps API key loading error
  if (mapsKeyError) {
    console.error('[FleetMap] Google Maps key error:', mapsKeyError);
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Fleet Map</h1>
        </div>
        <FleetMapErrorBoundary 
          error={mapsKeyError || 'Failed to load Google Maps API key'} 
          onRetry={retryMapsKey}
          isRetrying={mapsKeyLoading}
        />
      </div>
    );
  }

  // Handle loading states
  if (mapsKeyLoading || isDataLoading) {
    console.log('[FleetMap] Loading state:', { 
      mapsKeyLoading, 
      isDataLoading, 
      hasGoogleMapsKey: !!googleMapsKey 
    });
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Fleet Map</h1>
          <p className="text-muted-foreground">
            {mapsKeyLoading ? 'Loading map configuration...' : 'Loading equipment locations...'}
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

  // Handle missing Google Maps key
  if (!googleMapsKey) {
    console.error('[FleetMap] Missing Google Maps API key');
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
        <Button 
          onClick={() => handleRefreshSubscription()} 
          disabled={isRefreshingSubscription}
          variant="outline"
          size="sm"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshingSubscription ? 'animate-spin' : ''}`} />
          Refresh Status
        </Button>
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
                  >
                    <div className="font-medium text-sm">{location.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {location.manufacturer} {location.model}
                    </div>
                    <div className="flex items-center gap-1 mt-1">
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
              <MapView
                googleMapsKey={googleMapsKey}
                equipmentLocations={equipmentLocations}
                filteredLocations={filteredLocations}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default FleetMap;
