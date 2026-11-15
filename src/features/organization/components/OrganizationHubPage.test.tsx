import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { Users } from 'lucide-react';
import { customRender } from '@vitest-harness/utils/renderUtils';
import type { SimpleOrganization } from '@/contexts/SimpleOrganizationContext';
import type { WorkspaceMergeRequest } from '@/features/organization/types/workspacePersonalOrgMerge';
import { OrganizationHubPage } from './OrganizationHubPage';

vi.mock('@/features/organization/components/OrganizationSubnav', () => ({
  OrganizationSubnav: () => <nav aria-label="Organization sections">Organization Subnav</nav>,
}));

vi.mock('@/features/organization/components/RestrictedOrganizationAccess', () => ({
  default: ({ currentOrganizationName }: { currentOrganizationName: string }) => (
    <div role="alert">Restricted Access to {currentOrganizationName}</div>
  ),
}));

vi.mock('@/features/organization/components/WorkspaceMergeRequestsCard', () => ({
  WorkspaceMergeRequestsCard: ({
    workspaceOrgId,
    requests,
  }: {
    workspaceOrgId: string;
    requests: WorkspaceMergeRequest[];
  }) => (
    <div data-testid="merge-requests-card">
      {workspaceOrgId}:{requests.length}
    </div>
  ),
}));

const organization: SimpleOrganization = {
  id: 'org-1',
  name: 'Acme Fleet',
  plan: 'free',
  memberCount: 3,
  maxMembers: 10,
  features: [],
  scanLocationCollectionEnabled: false,
  userRole: 'admin',
  userStatus: 'active',
};

const mergeRequest: WorkspaceMergeRequest = {
  id: 'merge-1',
  workspace_org_id: 'org-1',
  workspace_org_name: 'Acme Fleet',
  requested_by_user_id: 'user-a',
  requested_by_name: 'Owner',
  requested_for_user_id: 'user-b',
  requested_for_name: 'Member',
  request_reason: null,
  created_at: '2026-11-01T00:00:00Z',
  expires_at: '2026-11-30T00:00:00Z',
  is_incoming: true,
};

type HubProps = Parameters<typeof OrganizationHubPage>[0];

const renderHub = (overrides: Partial<HubProps> = {}) =>
  customRender(
    <OrganizationHubPage
      organization={organization}
      isLoading={false}
      title="Members"
      icon={Users}
      description={(name) => `Manage people in ${name}.`}
      hasAccess
      {...overrides}
    >
      {(org) => <div data-testid="hub-content">content for {org.id}</div>}
    </OrganizationHubPage>,
  );

describe('OrganizationHubPage', () => {
  it('shows only the page title while the organization is loading', () => {
    renderHub({ isLoading: true });

    expect(screen.getByRole('heading', { level: 1, name: 'Members' })).toBeInTheDocument();
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.queryByTestId('hub-content')).not.toBeInTheDocument();
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  });

  it('treats a missing organization as loading', () => {
    renderHub({ organization: null });

    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.queryByTestId('hub-content')).not.toBeInTheDocument();
  });

  it('renders the subnav, header and content with the organization when the user has access', () => {
    renderHub();

    expect(screen.getByRole('navigation', { name: 'Organization sections' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Members' })).toBeInTheDocument();
    expect(screen.getByText('Manage people in Acme Fleet.')).toBeInTheDocument();
    expect(screen.getByTestId('hub-content')).toHaveTextContent('content for org-1');
    expect(screen.queryByTestId('merge-requests-card')).not.toBeInTheDocument();
  });

  it('shows incoming merge requests above the content when the user has access', () => {
    renderHub({ incomingMergeRequests: [mergeRequest] });

    expect(screen.getByTestId('merge-requests-card')).toHaveTextContent('org-1:1');
    expect(screen.getByTestId('hub-content')).toBeInTheDocument();
  });

  it('shows the restricted view without content when the user lacks access', () => {
    renderHub({ hasAccess: false });

    expect(screen.getByRole('alert')).toHaveTextContent('Restricted Access to Acme Fleet');
    expect(screen.queryByTestId('hub-content')).not.toBeInTheDocument();
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  });

  it('lets a user without access review incoming merge requests instead of the restricted view', () => {
    renderHub({ hasAccess: false, incomingMergeRequests: [mergeRequest] });

    expect(
      screen.getByRole('heading', { level: 1, name: 'Personal Organization Merge' }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('merge-requests-card')).toHaveTextContent('org-1:1');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByTestId('hub-content')).not.toBeInTheDocument();
  });
});
