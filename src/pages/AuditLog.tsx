/**
 * Audit Log Page
 *
 * Dedicated, organization-scoped audit surface buried under Organization
 * settings (issue #1122). Owner/admin only — audit data is sensitive
 * high-privilege information and is never mixed with operational pages or
 * general data exports. Uses the Logflare-style explorer (issue #641):
 * timeline histogram on top, dense severity-tagged list below, persistent
 * detail panel on the right, with a dedicated CSV / JSON export path.
 */

import React, { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { History, Shield, AlertCircle, ShieldAlert } from 'lucide-react';
import Page from '@/components/layout/Page';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useOrganization } from '@/contexts/OrganizationContext';
import { AuditExplorer } from '@/components/audit/explorer';
import { OrganizationSubnav } from '@/features/organization/components/OrganizationSubnav';
import { AUDIT_ENTITY_TYPES, type AuditEntityType, type AuditLogFilters } from '@/types/audit';

/**
 * Audit Log Page Component
 */
function AuditLog() {
  const { currentOrganization } = useOrganization();
  const [searchParams] = useSearchParams();

  // Deep links from detail pages, e.g. ?entityType=work_order&entityId=<uuid>.
  const initialFilters = useMemo<Omit<AuditLogFilters, 'dateFrom' | 'dateTo'>>(() => {
    const entityTypeParam = searchParams.get('entityType');
    const entityId = searchParams.get('entityId') ?? undefined;
    const entityType = (Object.values(AUDIT_ENTITY_TYPES) as string[]).includes(
      entityTypeParam ?? '',
    )
      ? (entityTypeParam as AuditEntityType)
      : undefined;
    return { entityType, entityId };
  }, [searchParams]);

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

  const isAdmin =
    currentOrganization.userRole === 'owner' || currentOrganization.userRole === 'admin';

  if (!isAdmin) {
    return (
      <Page maxWidth="7xl" padding="responsive">
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            The audit log contains sensitive, high-privilege information and is only available to
            organization owners and administrators.
          </AlertDescription>
        </Alert>
      </Page>
    );
  }

  return (
    <Page maxWidth="full" padding="responsive">
      <OrganizationSubnav />
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center gap-2">
          <History className="h-7 w-7 text-primary shrink-0" />
          <div>
            <h1 className="text-2xl font-bold leading-tight">Audit Log</h1>
            <p className="text-sm text-muted-foreground">
              Track all changes made to your organization's data for compliance and accountability.{' '}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="inline-flex items-center gap-0.5 text-muted-foreground hover:text-foreground underline decoration-dotted underline-offset-2 text-sm">
                    <Shield className="h-3 w-3" />
                    Regulatory compliance
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs text-xs">
                  This audit log helps you comply with OSHA, DOT, and other regulatory requirements
                  by maintaining a complete record of all equipment, work order, and inventory changes.
                  Records are immutable and cannot be modified or deleted.
                </TooltipContent>
              </Tooltip>
            </p>
          </div>
        </div>

        {/* Customizable dashboard: key metrics, timeline, and events (#1166) */}
        <AuditExplorer organizationId={currentOrganization.id} initialFilters={initialFilters} />
      </div>
    </Page>
  );
}

export default AuditLog;
