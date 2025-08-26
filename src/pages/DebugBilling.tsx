import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RefreshCw, Copy, Eye, EyeOff, ExternalLink } from 'lucide-react';
import { useSimpleOrganization } from '@/hooks/useSimpleOrganization';
import { useLocalBillingCalculation } from '@/hooks/useLocalBillingCalculation';
import { useBillingSnapshot } from '@/hooks/useBillingSnapshot';
import { deepDiff } from '@/utils/jsonDiff';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import type { SimpleOrganization } from '@/contexts/SimpleOrganizationContext';

const DebugBillingContent: React.FC<{ currentOrganization: SimpleOrganization | null }> = ({ currentOrganization }) => {
  const [prettyView, setPrettyView] = useState(true);
  const organizationId = currentOrganization?.id;

  const localBilling = useLocalBillingCalculation({ memberCount: 0, storageUsedGB: 0 });

  const {
    data: snapshotData,
    isLoading: snapshotLoading,
    error: snapshotError,
    refetch: refetchSnapshot,
  } = useBillingSnapshot(organizationId);

  const handleRefreshAll = () => {
    refetchSnapshot();
    toast.success('Refreshed snapshot');
  };

  const copyToClipboard = (data: unknown, label: string) => {
    const text = prettyView ? JSON.stringify(data, null, 2) : JSON.stringify(data);
    navigator.clipboard.writeText(text);
    toast.success(`Copied ${label} to clipboard`);
  };

  const differences = localBilling && snapshotData ? deepDiff(localBilling, snapshotData) : [];

  const isAdmin = currentOrganization?.userRole === 'owner' || currentOrganization?.userRole === 'admin';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Billing Debug</h1>
          <p className="text-muted-foreground">
            Compare local billing calculation vs cached Supabase/Stripe data
          </p>
        </div>
        {isAdmin && (
          <Badge variant="secondary" className="ml-2">
            Admin View
          </Badge>
        )}
      </div>

      {/* Organization Info */}
      {currentOrganization && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Organization: {currentOrganization.name}</CardTitle>
            <CardDescription>
              Plan: {currentOrganization.plan} | Role: {currentOrganization.userRole}
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={handleRefreshAll} disabled={snapshotLoading} size="sm">
          <RefreshCw className={`h-4 w-4 mr-2 ${snapshotLoading ? 'animate-spin' : ''}`} />
          Refresh All
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setPrettyView(!prettyView)}
        >
          {prettyView ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
          {prettyView ? 'Raw View' : 'Pretty View'}
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link to="/dashboard/billing">
            <ExternalLink className="h-4 w-4 mr-2" />
            Live Billing Page
          </Link>
        </Button>
      </div>

      {/* Diff Summary */}
      {differences.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-destructive">
              Differences Found ({differences.length})
            </CardTitle>
            <CardDescription>
              Mismatches between local calculation and cached data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-32">
              <div className="space-y-2">
                {differences.map((diff, index) => (
                  <div key={index} className="text-sm font-mono">
                    <span className="text-muted-foreground">{diff.path}:</span>{' '}
                    <span className="text-destructive">{JSON.stringify(diff.oldValue)}</span>{' '}
                    <span className="text-muted-foreground">→</span>{' '}
                    <span className="text-green-600">{JSON.stringify(diff.newValue)}</span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Side by Side Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Local Calculation */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Local Calculation</CardTitle>
                <CardDescription>Live calculation from current data</CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(localBilling, 'local calculation')}
                disabled={!localBilling}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96">
              {localBilling ? (
                <pre className="text-xs">
                  {prettyView ? JSON.stringify(localBilling, null, 2) : JSON.stringify(localBilling)}
                </pre>
              ) : (
                <div className="text-muted-foreground text-sm">No data available</div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Cached Snapshot */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Stripe/Supabase Snapshot</CardTitle>
                <CardDescription>Cached data from database</CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(snapshotData, 'snapshot data')}
                disabled={!snapshotData}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96">
              {snapshotLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : snapshotError ? (
                <div className="text-destructive text-sm">
                  Error: {snapshotError.message}
                </div>
              ) : snapshotData ? (
                <pre className="text-xs">
                  {prettyView ? JSON.stringify(snapshotData, null, 2) : JSON.stringify(snapshotData)}
                </pre>
              ) : (
                <div className="text-muted-foreground text-sm">No data available</div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* No Organization Selected */}
      {!organizationId && (
        <Card>
          <CardHeader>
            <CardTitle>No Organization Selected</CardTitle>
            <CardDescription>
              Please select an organization to view billing debug information.
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
};

const DebugBilling: React.FC = () => {
  const { currentOrganization } = useSimpleOrganization();

  if (!import.meta.env.DEV) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle>Development Only</CardTitle>
            <CardDescription>
              This page is only available in development mode.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link to="/dashboard">Back to Dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <DebugBillingContent currentOrganization={currentOrganization} />;
};

export default DebugBilling;