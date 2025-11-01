
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { HardDrive, AlertTriangle, Info } from 'lucide-react';
import { useOrganizationStorageUsage } from '@/hooks/useOrganizationStorageUsage';

interface ImageStorageQuotaProps {
  organizationId?: string;
}

const ImageStorageQuota: React.FC<ImageStorageQuotaProps> = ({ organizationId }) => {
  const { data: storageUsage, isLoading, error } = useOrganizationStorageUsage(organizationId);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="h-48 bg-muted animate-pulse rounded" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm">Failed to load storage usage data</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!storageUsage) return null;

  const usagePercentage = Math.min((storageUsage.totalSizeMB / storageUsage.freeQuotaMB) * 100, 100);
  const isOverQuota = storageUsage.overageMB > 0;
  const isNearQuota = usagePercentage > 80 && !isOverQuota;

  const formatSize = (sizeMB: number, sizeGB: number) => {
    if (sizeGB < 1) {
      return `${sizeMB.toFixed(2)}MB`;
    }
    return `${sizeGB.toFixed(1)}GB`;
  };

  const formatSizeFromMB = (sizeMB: number) => {
    const sizeGB = sizeMB / 1024;
    return formatSize(sizeMB, sizeGB);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <HardDrive className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="text-lg sm:text-xl">Image Storage Usage</span>
              {isOverQuota && <Badge variant="destructive">Over Quota</Badge>}
              {isNearQuota && <Badge variant="secondary">Near Quota</Badge>}
            </div>
            <div className="text-left sm:text-right">
              <div className="text-sm text-muted-foreground">Monthly Cost</div>
              <div className="text-lg font-bold">${storageUsage.overageCost.toFixed(2)}</div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Storage Used</span>
                <span className="text-right">
                  {formatSizeFromMB(storageUsage.totalSizeMB)} / {formatSize(storageUsage.freeQuotaMB, storageUsage.freeQuotaGB)} free
                </span>
              </div>
              <Progress 
                value={usagePercentage} 
                className={`h-2 ${isOverQuota ? 'progress-destructive' : isNearQuota ? 'progress-warning' : ''}`}
              />
              {isOverQuota && (
                <div className="text-xs text-muted-foreground">
                  + {formatSizeFromMB(storageUsage.overageMB)} overage
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className="p-3 bg-muted rounded-lg text-center">
                <div className="text-base sm:text-lg font-bold">{formatSizeFromMB(storageUsage.totalSizeMB)}</div>
                <div className="text-xs sm:text-sm text-muted-foreground">Total Used</div>
              </div>
              <div className="p-3 bg-muted rounded-lg text-center">
                <div className="text-base sm:text-lg font-bold">{storageUsage.itemCount}</div>
                <div className="text-xs sm:text-sm text-muted-foreground">Images</div>
              </div>
              <div className="p-3 bg-muted rounded-lg text-center">
                <div className="text-base sm:text-lg font-bold">${storageUsage.costPerGB.toFixed(2)}</div>
                <div className="text-xs sm:text-sm text-muted-foreground">Per GB</div>
              </div>
              <div className="p-3 bg-muted rounded-lg text-center">
                <div className="text-base sm:text-lg font-bold">{formatSize(storageUsage.freeQuotaMB, storageUsage.freeQuotaGB)}</div>
                <div className="text-xs sm:text-sm text-muted-foreground">Free Quota</div>
              </div>
            </div>

            <div className="bg-muted p-4 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium text-sm sm:text-base">Storage Breakdown</span>
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Equipment images</span>
                  <span>Included in total usage</span>
                </div>
                <div className="flex justify-between">
                  <span>Work order images</span>
                  <span>Included in total usage</span>
                </div>
                <div className="border-t pt-1 mt-2 flex justify-between font-medium">
                  <span>Overage charge</span>
                  <span>${storageUsage.overageCost.toFixed(2)}/month</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Storage alerts */}
      {isOverQuota && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            You're using {formatSizeFromMB(storageUsage.overageMB)} over your free quota. 
            You'll be charged ${storageUsage.overageCost.toFixed(2)}/month for the overage.
          </AlertDescription>
        </Alert>
      )}

      {isNearQuota && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription className="text-sm">
            You're approaching your free storage quota. Consider managing your images to avoid overage charges.
          </AlertDescription>
        </Alert>
      )}

      {!isOverQuota && !isNearQuota && (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-green-800">
              <Image className="h-4 w-4" />
              <span className="text-sm font-medium">
                Storage Status: Good
              </span>
            </div>
            <div className="text-sm text-green-700 mt-1">
              You're using {formatSizeFromMB(storageUsage.totalSizeMB)} of your {formatSize(storageUsage.freeQuotaMB, storageUsage.freeQuotaGB)} free quota. 
              Overage is charged at $0.10/GB.
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ImageStorageQuota;
