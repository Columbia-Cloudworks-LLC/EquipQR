import React from 'react';
import ExternalContactsList from '@/features/teams/components/ExternalContactsList';
import type { TeamWithMembers } from '@/features/teams/services/teamService';

interface TeamExternalContactsSectionProps {
  team: Pick<TeamWithMembers, 'organization_id' | 'customer_id' | 'members'>;
  canManage: boolean;
}

/**
 * Team-scoped wrapper for customer external contacts.
 * Manual contact CRUD is authorized by migrations 20260707125008 (RPCs) and
 * 20260707160000 (team-manager RLS replacing 20260406000003 admin-only policies).
 */
const TeamExternalContactsSection: React.FC<TeamExternalContactsSectionProps> = ({
  team,
  canManage,
}) => {
  if (!team.customer_id) {
    return null;
  }

  return (
    <ExternalContactsList
      organizationId={team.organization_id}
      customerId={team.customer_id}
      canManage={canManage}
      teamMembers={team.members}
    />
  );
};

export default TeamExternalContactsSection;
