import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  Database, 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  Trash2,
  Clock,
  AlertCircle
} from 'lucide-react';
import { useCacheManagerContext } from './CacheManagerProvider';

// PHASE 3: Cache status indicator component
interface CacheStats {
  totalQueries: number;
  activeQueries: number;
  staleQueries: number;
  fetchingQueries: number;
  errorQueries: number;
}

interface SyncStatus {
  isOnline: boolean;
  queuedItems: number;
  reconnectAttempts: number;
  activeSubscriptions: number;
}

export const CacheStatusIndicator = () => {
  const { getCacheStats, clearCache, getSyncStatus } = useCacheManagerContext();
  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
  const updateStats = () => {
      setCacheStats(getCacheStats() as CacheStats);
      setSyncStatus(getSyncStatus() as SyncStatus);
    };

    updateStats();
    const interval = setInterval(updateStats, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, [getCacheStats, getSyncStatus]);

  if (!cacheStats || !syncStatus) return null;

  const handleClearCache = () => {
    clearCache();
    setCacheStats(getCacheStats() as CacheStats);
  };

  const getStatusColor = () => {
    if (!syncStatus?.isOnline) return 'destructive';
    if ((syncStatus?.queuedItems ?? 0) > 0) return 'secondary';
    return 'default';
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Database className="h-4 w-4" />
            Cache Status
          </CardTitle>
          <div className="flex items-center gap-2">
            {syncStatus?.isOnline ? (
              <Wifi className="h-4 w-4 text-green-600" />
            ) : (
              <WifiOff className="h-4 w-4 text-red-600" />
            )}
            <Badge variant={getStatusColor()}>
              {syncStatus?.isOnline ? 'Online' : 'Offline'}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">
              {cacheStats?.totalQueries ?? 0}
            </div>
            <div className="text-xs text-muted-foreground">Total Queries</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {cacheStats?.activeQueries ?? 0}
            </div>
            <div className="text-xs text-muted-foreground">Active</div>
          </div>
        </div>

        {/* Sync Status */}
        {(syncStatus?.queuedItems ?? 0) > 0 && (
          <div className="flex items-center gap-2 p-2 bg-secondary/50 rounded-lg">
            <Clock className="h-4 w-4 text-orange-600" />
            <span className="text-sm">
              {syncStatus?.queuedItems} items queued for sync
            </span>
          </div>
        )}

        {(syncStatus?.reconnectAttempts ?? 0) > 0 && (
          <div className="flex items-center gap-2 p-2 bg-destructive/10 rounded-lg">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <span className="text-sm">
              Reconnection attempts: {syncStatus?.reconnectAttempts}
            </span>
          </div>
        )}

        {/* Expandable Details */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full"
        >
          {isExpanded ? 'Hide Details' : 'Show Details'}
        </Button>

        {isExpanded && (
          <>
            <Separator />
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Stale:</span>
                  <span>{cacheStats?.staleQueries ?? 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fetching:</span>
                  <span>{cacheStats?.fetchingQueries ?? 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Errors:</span>
                  <span className="text-destructive">{cacheStats?.errorQueries ?? 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subscriptions:</span>
                  <span>{syncStatus?.activeSubscriptions ?? 0}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearCache}
                  className="flex-1"
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Clear Cache
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.location.reload()}
                  className="flex-1"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Refresh
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};