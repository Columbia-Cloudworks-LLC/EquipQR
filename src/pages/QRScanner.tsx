
import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { QrCode, AlertCircle, CheckCircle, ArrowLeft, Camera } from 'lucide-react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useEquipmentById } from '@/hooks/useEquipment';
import { useToast } from '@/hooks/use-toast';
import QRScannerComponent from '@/components/scanner/QRScannerComponent';
import Page from '@/components/layout/Page';

const QRScanner = () => {
  const navigate = useNavigate();
  const { currentOrganization } = useOrganization();
  const { toast } = useToast();
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scannedEquipmentId, setScannedEquipmentId] = useState<string | null>(null);

  // Use sync hook for resolved equipment
  const { data: resolvedEquipment } = useEquipmentById(
    currentOrganization?.id, 
    scannedEquipmentId || undefined
  );

  const handleScan = useCallback((result: string) => {
    if (!result || !currentOrganization) return;

    setScanResult(result);
    setError(null);

    // Extract equipment ID from QR code
    // Expected format: equipqr://equipment/{equipmentId} or just the equipment ID
    let equipmentId = result;
    if (result.startsWith('equipqr://equipment/')) {
      equipmentId = result.replace('equipqr://equipment/', '');
    }

    setScannedEquipmentId(equipmentId);
    setIsScanning(false);
  }, [currentOrganization]);

  // Handle equipment resolution
  React.useEffect(() => {
    if (scannedEquipmentId && currentOrganization) {
      if (resolvedEquipment) {
        toast({
          title: "Equipment Found",
          description: `Successfully scanned ${resolvedEquipment.name}`,
        });
      } else if (scanResult) {
        setError('Equipment not found or you do not have access to it');
        toast({
          title: "Equipment Not Found",
          description: "The scanned QR code does not match any equipment in your organization",
          variant: "destructive",
        });
      }
    }
  }, [resolvedEquipment, scannedEquipmentId, currentOrganization, scanResult, toast]);

  const handleError = useCallback((error: Error | unknown) => {
    console.error('QR Scanner error:', error);
    setError('Failed to scan QR code. Please try again.');
    setIsScanning(false);
  }, []);

  const startScanning = () => {
    setIsScanning(true);
    setScanResult(null);
    setError(null);
    setScannedEquipmentId(null);
  };

  const viewEquipment = () => {
    if (resolvedEquipment) {
      navigate(`/dashboard/equipment/${resolvedEquipment.id}`);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'maintenance':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'inactive':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (!currentOrganization) {
    return (
      <Page maxWidth="7xl" padding="responsive">
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigate('/')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <h1 className="text-3xl font-bold tracking-tight">QR Scanner</h1>
          </div>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please select an organization to use the QR scanner.
            </AlertDescription>
          </Alert>
        </div>
      </Page>
    );
  }

  return (
    <Page maxWidth="7xl" padding="responsive">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => navigate('/')}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">QR Scanner</h1>
          <p className="text-muted-foreground">
            Scan equipment QR codes to access details quickly
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Scanner Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              Scanner
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isScanning ? (
              <div className="text-center space-y-4">
                <div className="w-full h-64 bg-muted rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <Camera className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Ready to scan</p>
                  </div>
                </div>
                <Button onClick={startScanning} className="w-full">
                  <QrCode className="h-4 w-4 mr-2" />
                  Start Scanning
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <QRScannerComponent
                  onScan={handleScan}
                  onError={handleError}
                />
                <Button 
                  variant="outline" 
                  onClick={() => setIsScanning(false)}
                  className="w-full"
                >
                  Stop Scanning
                </Button>
              </div>
            )}

            {/* Instructions */}
            <div className="text-sm text-muted-foreground space-y-2">
              <p className="font-medium">Instructions:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Point your camera at an equipment QR code</li>
                <li>Hold steady until the code is detected</li>
                <li>The equipment details will appear automatically</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Results Section */}
        <Card>
          <CardHeader>
            <CardTitle>Scan Results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!scanResult && !error && (
              <div className="text-center py-8">
                <QrCode className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Scan a QR code to see equipment details
                </p>
              </div>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {resolvedEquipment && (
              <div className="space-y-4">
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Equipment successfully identified!
                  </AlertDescription>
                </Alert>

                <div className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-lg">{resolvedEquipment.name}</h3>
                      <p className="text-muted-foreground">
                        {resolvedEquipment.manufacturer} {resolvedEquipment.model}
                      </p>
                    </div>
                    <Badge className={getStatusColor(resolvedEquipment.status)}>
                      {resolvedEquipment.status}
                    </Badge>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium">Serial Number:</span>
                      <span className="ml-2 text-muted-foreground">
                        {resolvedEquipment.serial_number}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium">Location:</span>
                      <span className="ml-2 text-muted-foreground">
                        {resolvedEquipment.location}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium">Last Maintenance:</span>
                      <span className="ml-2 text-muted-foreground">
                        {resolvedEquipment.last_maintenance ? 
                          new Date(resolvedEquipment.last_maintenance).toLocaleDateString() : 
                          'Not recorded'
                        }
                      </span>
                    </div>
                  </div>

                  <Button onClick={viewEquipment} className="w-full">
                    View Full Details
                  </Button>
                </div>
              </div>
            )}

            {scanResult && !resolvedEquipment && !error && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Scanned Data:</p>
                <p className="text-sm text-muted-foreground font-mono bg-muted p-2 rounded">
                  {scanResult}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      </div>
    </Page>
  );
};

export default QRScanner;
