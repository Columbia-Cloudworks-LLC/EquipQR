
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Loader2 } from 'lucide-react';

interface FleetMapUpsellProps {
  onEnableFleetMap: () => void;
  isLoading?: boolean;
}

export const FleetMapUpsell: React.FC<FleetMapUpsellProps> = ({ 
  onEnableFleetMap, 
  isLoading = false 
}) => {
  return (
    <div className="flex items-center justify-center min-h-[600px]">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <MapPin className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-2xl">Fleet Map</CardTitle>
          <CardDescription>
            Visualize your entire fleet on a live map. $10/month per organization.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground">
            <ul className="space-y-2">
              <li>• Real-time equipment location tracking</li>
              <li>• Marker clustering for performance</li>
              <li>• Detailed equipment information</li>
              <li>• Search and filter capabilities</li>
            </ul>
          </div>
          <Button 
            onClick={onEnableFleetMap}
            disabled={isLoading}
            className="w-full"
            size="lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Setting up...
              </>
            ) : (
              'Enable Fleet Map – $10/mo'
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
