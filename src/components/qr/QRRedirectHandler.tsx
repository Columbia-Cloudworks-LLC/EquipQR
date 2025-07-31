import React from 'react';
import { Navigate } from 'react-router-dom';
import { Loader2, AlertCircle, ArrowRight, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useQRRedirectWithOrgSwitch } from '@/hooks/useQRRedirectWithOrgSwitch';

interface QRRedirectHandlerProps {
  equipmentId: string | undefined;
}

export const QRRedirectHandler: React.FC<QRRedirectHandlerProps> = ({ equipmentId }) => {
  const { state, isSwitchingOrg, handleOrgSwitch, handleProceed, retry } = useQRRedirectWithOrgSwitch({
    equipmentId,
    onComplete: (targetPath) => {
      // Navigation will be handled by the Navigate component below
    }
  });

  // Loading state
  if (state.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  Verifying equipment access...
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Direct navigation cases
  if (state.canProceed && state.targetPath) {
    return <Navigate to={state.targetPath} replace />;
  }

  if (state.needsAuth && state.targetPath) {
    return <Navigate to={state.targetPath} replace />;
  }

  if (state.error && state.targetPath && !state.needsOrgSwitch) {
    return <Navigate to={state.targetPath} replace />;
  }

  // Organization switch required
  if (state.needsOrgSwitch && state.equipmentInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center space-x-2">
              <ArrowRight className="h-5 w-5 text-primary" />
              <span>Organization Switch Required</span>
            </CardTitle>
            <CardDescription>
              This equipment belongs to a different organization
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                Equipment found in:
              </p>
              <p className="font-medium text-foreground">
                {state.equipmentInfo.organizationName}
              </p>
              <p className="text-xs text-muted-foreground">
                Your role: {state.equipmentInfo.userRole}
              </p>
            </div>

            <div className="flex flex-col space-y-2">
              <Button 
                onClick={handleOrgSwitch}
                disabled={isSwitchingOrg}
                className="w-full"
              >
                {isSwitchingOrg ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Switching...
                  </>
                ) : (
                  <>
                    <ArrowRight className="mr-2 h-4 w-4" />
                    Switch & Continue
                  </>
                )}
              </Button>
              
              <Button 
                variant="outline" 
                onClick={() => window.location.href = '/scanner'}
                className="w-full"
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state with retry option
  if (state.error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center space-x-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <span>Access Error</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {state.error}
              </AlertDescription>
            </Alert>

            <div className="flex flex-col space-y-2">
              <Button 
                onClick={retry}
                variant="outline"
                className="w-full"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again
              </Button>
              
              <Button 
                onClick={() => window.location.href = '/scanner'}
                className="w-full"
              >
                Back to Scanner
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Fallback to scanner if no other conditions match
  return <Navigate to="/scanner" replace />;
};