import { CheckCircle, Clock, CloudCog } from 'lucide-react';
import type { UnifiedMember } from '@/features/organization/utils/buildUnifiedMembers';

export function getStatusIcon(status: UnifiedMember['status']) {
  switch (status) {
    case 'active':
      return <CheckCircle className="h-4 w-4 text-success" />;
    case 'pending_invite':
      return <Clock className="h-4 w-4 text-warning" />;
    case 'pending_gws':
      return <CloudCog className="h-4 w-4 text-info" />;
  }
}

export function getUnifiedMemberStatusBadgeVariant(status: UnifiedMember['status']) {
  switch (status) {
    case 'active':
      return 'default' as const;
    case 'pending_invite':
      return 'secondary' as const;
    case 'pending_gws':
      return 'outline' as const;
  }
}

export function getStatusLabel(status: UnifiedMember['status']) {
  switch (status) {
    case 'active':
      return 'Active';
    case 'pending_invite':
      return 'Pending Invite';
    case 'pending_gws':
      return 'Awaiting Sign-up';
  }
}
