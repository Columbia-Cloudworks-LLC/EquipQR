import { createE2EAdminClient } from '../../user/shared/fresh-start-reset';
import { apexOrgId, seedTeams, seedWorkOrders } from '../../user/shared/seed-data';

const apexOwnerUserId = 'bb0e8400-e29b-41d4-a716-446655440001';

export const notificationDestinationFixtures = {
  teamMemberAdded: {
    id: 'c10e8400-e29b-41d4-a716-446655440001',
    title: 'Jordan joined Heavy Equipment',
    teamId: seedTeams.apexHeavyEquipment.id,
  },
  workOrderAssigned: {
    id: 'c10e8400-e29b-41d4-a716-446655440002',
    title: 'Assigned: Pre-Rental Inspection - Skid Steer',
    workOrderId: seedWorkOrders.assigned.id,
    workOrderTitle: seedWorkOrders.assigned.title,
  },
} as const;

export async function seedNotificationDestinationFixtures(): Promise<void> {
  const admin = createE2EAdminClient();
  const now = new Date();
  const teamCreatedAt = new Date(now.getTime() + 1_000).toISOString();
  const workOrderCreatedAt = now.toISOString();

  const { error } = await admin.from('notifications').upsert(
    [
      {
        id: notificationDestinationFixtures.teamMemberAdded.id,
        organization_id: apexOrgId,
        user_id: apexOwnerUserId,
        type: 'team_member_added',
        title: notificationDestinationFixtures.teamMemberAdded.title,
        message: 'Jordan was added to Heavy Equipment.',
        data: { team_id: notificationDestinationFixtures.teamMemberAdded.teamId },
        read: false,
        is_global: false,
        created_at: teamCreatedAt,
        updated_at: teamCreatedAt,
      },
      {
        id: notificationDestinationFixtures.workOrderAssigned.id,
        organization_id: apexOrgId,
        user_id: apexOwnerUserId,
        type: 'work_order_assigned',
        title: notificationDestinationFixtures.workOrderAssigned.title,
        message: 'You were assigned Pre-Rental Inspection - Skid Steer.',
        data: { work_order_id: notificationDestinationFixtures.workOrderAssigned.workOrderId },
        read: false,
        is_global: false,
        created_at: workOrderCreatedAt,
        updated_at: workOrderCreatedAt,
      },
    ],
    { onConflict: 'id' },
  );

  if (error) {
    throw new Error(`Notification destination evidence seed failed: ${error.message}`);
  }
}
