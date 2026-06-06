import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import type { UnifiedMember } from '@/features/organization/utils/buildUnifiedMembers';

type UnifiedMemberAvatarProps = {
  member: UnifiedMember;
};

export function UnifiedMemberAvatar({ member }: UnifiedMemberAvatarProps) {
  return (
    <Avatar className="h-8 w-8">
      <AvatarFallback className="text-xs">
        {member.name === 'Pending Invite' || member.name === 'Pending (Google Workspace)'
          ? '?'
          : member.name.split(' ').map((n) => n[0]).join('').slice(0, 2)
        }
      </AvatarFallback>
    </Avatar>
  );
}
