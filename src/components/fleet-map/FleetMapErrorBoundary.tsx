import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface FleetMapErrorBoundaryProps {
  error: string;
  onRetry: () => void;
  isRetrying?: boolean;
}

export const FleetMapErrorBoundary: React.FC<FleetMapErrorBoundaryProps> = ({ 
  error, 
  onRetry, 
  isRetrying = false 
}) => {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <AlertTriangle className="h-12 w-12 text-destructive" />
          </div>
          <CardTitle className="text-xl">Fleet Map Error</CardTitle>
          <CardDescription>
            There was a problem loading the fleet map
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
            <p className="text-sm text-destructive font-medium">Error Details:</p>
            <p className="text-sm text-muted-foreground mt-1">{error}</p>
          </div>
          
          <div className="text-sm text-muted-foreground">
            <p className="font-medium mb-2">Common causes:</p>
            <ul className="space-y-1 list-disc list-inside">
              <li>Missing Google Maps API key configuration</li>
              <li>Edge function deployment issues</li>
              <li>Network connectivity problems</li>
              <li>Subscription or permissions issues</li>
            </ul>
          </div>
          
          <Button 
            onClick={onRetry}
            disabled={isRetrying}
            className="w-full"
            variant="outline"
          >
            {isRetrying ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Retrying...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};