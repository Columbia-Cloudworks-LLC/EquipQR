/**
 * Audit Log Page
 * 
 * Displays organization-wide audit trail for regulatory compliance
 * and accountability tracking. Includes filtering, search, and CSV export.
 */

import React from 'react';
import { History, Shield, FileText, AlertCircle } from 'lucide-react';
import Page from '@/components/layout/Page';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AuditLogTable } from '@/components/audit';
import { useAuditStats } from '@/hooks/useAuditLog';
import { useOrganization } from '@/contexts/OrganizationContext';
import { Skeleton } from '@/components/ui/skeleton';
import { ENTITY_TYPE_LABELS, AUDIT_ENTITY_TYPES } from '@/types/audit';

/**
 * Stats cards showing audit summary
 */
function AuditStatsCards({ organizationId }: { organizationId: string }) {
  const { data: stats, isLoading } = useAuditStats(organizationId);
  
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }
  
  if (!stats) return null;
  
  // Calculate totals for each action
  const createdCount = stats.byAction?.INSERT || 0;
  const updatedCount = stats.byAction?.UPDATE || 0;
  const deletedCount = stats.byAction?.DELETE || 0;
  
  return (
    <div className="grid gap-4 md:grid-cols-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total Entries
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalEntries.toLocaleString()}</div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Records Created
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">{createdCount.toLocaleString()}</div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Records Updated
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600">{updatedCount.toLocaleString()}</div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Records Deleted
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">{deletedCount.toLocaleString()}</div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Top contributors list
 */
function TopContributors({ organizationId }: { organizationId: string }) {
  const { data: stats, isLoading } = useAuditStats(organizationId);
  
  if (isLoading || !stats?.topActors?.length) return null;
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Top Contributors</CardTitle>
        <CardDescription>Users with the most activity</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {stats.topActors.map((actor, index) => (
            <div key={actor.name} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground">
                  {index + 1}.
                </span>
                <span className="text-sm">{actor.name}</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {actor.count} actions
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Audit Log Page Component
 */
function AuditLog() {
  const { currentOrganization } = useOrganization();
  
  if (!currentOrganization) {
    return (
      <Page maxWidth="7xl" padding="responsive">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No Organization Selected</AlertTitle>
          <AlertDescription>
            Please select an organization to view the audit log.
          </AlertDescription>
        </Alert>
      </Page>
    );
  }
  
  return (
    <Page maxWidth="7xl" padding="responsive">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <History className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold">Audit Log</h1>
            </div>
            <p className="text-muted-foreground mt-2">
              Track all changes made to your organization's data for compliance and accountability.
            </p>
          </div>
        </div>
        
        {/* Compliance info banner */}
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertTitle>Regulatory Compliance</AlertTitle>
          <AlertDescription>
            This audit log helps you comply with OSHA, DOT, and other regulatory requirements 
            by maintaining a complete record of all equipment, work order, and inventory changes. 
            Records are immutable and cannot be modified or deleted.
          </AlertDescription>
        </Alert>
        
        {/* Stats */}
        <AuditStatsCards organizationId={currentOrganization.id} />
        
        {/* Main content grid */}
        <div className="grid gap-6 lg:grid-cols-4">
          {/* Main audit table */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Activity Log
                </CardTitle>
                <CardDescription>
                  Complete history of all changes in your organization
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AuditLogTable organizationId={currentOrganization.id} />
              </CardContent>
            </Card>
          </div>
          
          {/* Sidebar */}
          <div className="space-y-6">
            <TopContributors organizationId={currentOrganization.id} />
            
            <Card>
              <CardHeader>
                <CardTitle className="text-base">What's Tracked</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {Object.values(AUDIT_ENTITY_TYPES).map((type) => (
                    <li key={type} className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                      {ENTITY_TYPE_LABELS[type]}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Data Retention</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Audit records are retained indefinitely to meet regulatory requirements. 
                  Standard exports are limited to the most recent 10,000 records. 
                  Contact support if you need access to older history or larger exports.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Page>
  );
}

export default AuditLog;
