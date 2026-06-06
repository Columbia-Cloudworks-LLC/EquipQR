import type { OrganizationMemberRecord } from '@/features/organization/types/organization';

type MemberRowWithProfile = {
  id: string;
  user_id: string;
  organization_id: string;
  role: OrganizationMemberRecord['role'];
  status: OrganizationMemberRecord['status'];
  joined_date: string;
  slot_purchase_id: string | null;
  activated_slot_at: string | null;
  profiles?: { name?: string | null; email?: string | null } | null;
};

export function mapOrganizationMemberRows(
  data: MemberRowWithProfile[] | null | undefined,
): OrganizationMemberRecord[] {
  return (data ?? []).map((member) => ({
    id: member.id,
    user_id: member.user_id,
    organization_id: member.organization_id,
    role: member.role,
    status: member.status,
    joined_date: member.joined_date,
    user_name: member.profiles?.name,
    user_email: member.profiles?.email,
    slot_purchase_id: member.slot_purchase_id,
    activated_slot_at: member.activated_slot_at,
  }));
}
