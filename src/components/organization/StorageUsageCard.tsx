/**
 * Storage Usage Card Component
 * Displays organization's storage usage with progress bar and quota information
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';
import { HardDrive, AlertCircle } from 'lucide-react';
import { MAX_STORAGE_GB } from '@/utils/storageQuota';

interface StorageUsageCardProps {
  organizationId: string;
  className?: string;
}

interface StorageStats {
  currentStorageGB: number;
  maxStorageGB: number;
  remainingGB: number;
  usagePercent: number;
  canUpload: boolean;
}

const StorageUsageCard: React.FC<StorageUsageCardProps> = ({ organizationId, className }) => {
  const { data: stats, isLoading, error } = useQuery<StorageStats>({
    queryKey: ['storage-usage', organizationId],
    queryFn: async () => {
      // Get current storage usage
      const { data: storageMB, error: storageError } = await supabase.rpc('get_organization_storage_mb', {
        org_id: organizationId
      });

      if (storageError) {
        console.error('Error fetching storage:', storageError);
        throw storageError;
      }

      const currentStorageMB = storageMB || 0;
      const currentStorageGB = currentStorageMB / 1024;
      const maxStorageGB = MAX_STORAGE_GB;
      const remainingGB = Math.max(0, maxStorageGB - currentStorageGB);
      const usagePercent = Math.min(100, (currentStorageGB / maxStorageGB) * 100);
      const canUpload = currentStorageGB < maxStorageGB;

      return {
        currentStorageGB: Math.round(currentStorageGB * 100) / 100,
        maxStorageGB,
        remainingGB: Math.round(remainingGB * 100) / 100,
        usagePercent: Math.round(usagePercent * 10) / 10,
        canUpload
      };
    },
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 15000 // Consider stale after 15 seconds
  });

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load storage information. Please refresh the page.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HardDrive className="h-5 w-5" />
            <CardTitle>Image Storage</CardTitle>
          </div>
          {stats && !stats.canUpload && (
            <div className="flex items-center gap-2 text-sm font-medium text-destructive">
              <AlertCircle className="h-4 w-4" />
              Limit Reached
            </div>
          )}
        </div>
        <CardDescription>
          Storage usage for all uploaded images
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="space-y-2">
            <div className="h-2 w-full bg-muted animate-pulse rounded" />
            <p className="text-sm text-muted-foreground">Loading storage information...</p>
          </div>
        ) : stats ? (
          <>
            {/* Storage Info */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Used</span>
                <span className="font-medium">
                  {stats.currentStorageGB} GB / {stats.maxStorageGB} GB
                </span>
              </div>
              
              {/* Progress Bar */}
              <Progress 
                value={stats.usagePercent} 
                className={`h-2 ${
                  stats.usagePercent > 90 
                    ? '[&>div]:bg-destructive' 
                    : stats.usagePercent > 75 
                    ? '[&>div]:bg-yellow-500' 
                    : ''
                }`}
              />
              
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{stats.usagePercent}% used</span>
                <span>{stats.remainingGB} GB remaining</span>
              </div>
            </div>

            {/* Warning when approaching limit */}
            {stats.usagePercent >= 90 && (
              <Alert variant={stats.canUpload ? "default" : "destructive"}>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {stats.canUpload ? (
                    <>
                      You're using {stats.usagePercent}% of your storage. 
                      Consider deleting old images to free up space.
                    </>
                  ) : (
                    <>
                      Storage limit reached! You must delete existing images before uploading new ones.
                    </>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {/* Info when under 75% */}
            {stats.usagePercent < 75 && (
              <p className="text-xs text-muted-foreground">
                You have {stats.remainingGB} GB of free storage available.
              </p>
            )}
          </>
        ) : null}
      </CardContent>
    </Card>
  );
};

export default StorageUsageCard;

