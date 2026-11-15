import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import type { SimpleOrganization } from '@/contexts/SimpleOrganizationContext';
import type { WorkspaceMergeRequest } from '@/features/organization/types/workspacePersonalOrgMerge';
import { OrganizationSubnav } from '@/features/organization/components/OrganizationSubnav';
import RestrictedOrganizationAccess from '@/features/organization/components/RestrictedOrganizationAccess';
import { WorkspaceMergeRequestsCard } from '@/features/organization/components/WorkspaceMergeRequestsCard';
import Page from '@/components/layout/Page';

interface OrganizationHubPageProps {
  organization: SimpleOrganization | null;
  isLoading: boolean;
  title: string;
  icon: LucideIcon;
  description: (organizationName: string) => string;
  /** Whether the current user may see this page's content. */
  hasAccess: boolean;
  /**
   * Incoming personal-org merge requests. When given, they are shown above the
   * content, and users without access can still review them.
   */
  incomingMergeRequests?: WorkspaceMergeRequest[];
  children: (organization: SimpleOrganization) => ReactNode;
}

/** Shared shell for the organization hub pages (settings, members, integrations). */
export const OrganizationHubPage = ({
  organization,
  isLoading,
  title,
  icon: Icon,
  description,
  hasAccess,
  incomingMergeRequests = [],
  children,
}: OrganizationHubPageProps) => {
  if (isLoading || !organization) {
    return (
      <Page maxWidth="7xl" padding="responsive">
        <div className="space-y-4 sm:space-y-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{title}</h1>
            <p className="text-sm sm:text-base text-muted-foreground">Loading...</p>
          </div>
        </div>
      </Page>
    );
  }

  const mergeRequestsCard =
    incomingMergeRequests.length > 0 ? (
      <WorkspaceMergeRequestsCard workspaceOrgId={organization.id} requests={incomingMergeRequests} />
    ) : null;

  if (!hasAccess) {
    if (mergeRequestsCard) {
      return (
        <Page maxWidth="7xl" padding="responsive">
          <div className="space-y-4 sm:space-y-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Personal Organization Merge</h1>
              <p className="text-sm sm:text-base text-muted-foreground mt-1">
                Review a request to merge your personal data into {organization.name}.
              </p>
            </div>
            {mergeRequestsCard}
          </div>
        </Page>
      );
    }

    return (
      <Page maxWidth="7xl" padding="responsive">
        <RestrictedOrganizationAccess currentOrganizationName={organization.name} />
      </Page>
    );
  }

  return (
    <Page maxWidth="7xl" padding="responsive">
      <div className="space-y-4 sm:space-y-6">
        <OrganizationSubnav />

        {mergeRequestsCard}

        <div className="pb-1 sm:pb-4 border-b">
          <div className="flex items-start gap-3">
            <div className="rounded-lg border bg-muted/40 p-2.5 shrink-0">
              <Icon className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">{title}</h1>
              <p className="text-sm text-muted-foreground mt-1">{description(organization.name)}</p>
            </div>
          </div>
        </div>

        {children(organization)}
      </div>
    </Page>
  );
};
