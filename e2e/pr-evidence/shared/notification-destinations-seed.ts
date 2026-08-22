import { createE2EAdminClient } from '@/e2e/user/shared/fresh-start-reset';
import { apexOrgId, seedTeams, seedWorkOrders } from '@/e2e/user/shared/seed-data';

const apexOwnerUserId = 'bb0e8400-e29b-41d4-a716-446655440001';

type NotificationDestinationEvidenceFixtures = {
  teamMemberAdded: {
    id: string;
    title: string;
    teamId: string;
  };
  workOrderAssigned: {
    id: string;
    title: string;
    workOrderId: string;
    workOrderTitle: string;
  };
};

const TEAM_NOTIFICATION_ID = 'c10e8400-e29b-41d4-a716-446655440001';
const WORK_ORDER_NOTIFICATION_ID = 'c10e8400-e29b-41d4-a716-446655440002';

async function resolveApexWorkOrder(
  admin: ReturnType<typeof createE2EAdminClient>,
): Promise<{ id: string; title: string }> {
  const preferredIds = [
    seedWorkOrders.oilChange.id,
    seedWorkOrders.completed.id,
    seedWorkOrders.hydraulicFilter.id,
  ];

  for (const id of preferredIds) {
    const { data, error } = await admin
      .from('work_orders')
      .select('id, title')
      .eq('organization_id', apexOrgId)
      .eq('id', id)
      .maybeSingle();
    if (error) {
      throw new Error(`Notification destination evidence seed failed: ${error.message}`);
    }
    if (data?.id && data.title) {
      return { id: data.id, title: data.title };
    }
  }

  const { data: fallback, error: fallbackError } = await admin
    .from('work_orders')
    .select('id, title')
    .eq('organization_id', apexOrgId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (fallbackError) {
    throw new Error(`Notification destination evidence seed failed: ${fallbackError.message}`);
  }
  if (!fallback?.id || !fallback.title) {
    throw new Error('Notification destination evidence seed failed: no Apex work order found.');
  }
  return { id: fallback.id, title: fallback.title };
}

export async function seedNotificationDestinationFixtures(): Promise<NotificationDestinationEvidenceFixtures> {
  const admin = createE2EAdminClient();
  const workOrder = await resolveApexWorkOrder(admin);
  const now = new Date();
  const teamCreatedAt = new Date(now.getTime() + 1_000).toISOString();
  const workOrderCreatedAt = now.toISOString();

  const fixtures: NotificationDestinationEvidenceFixtures = {
    teamMemberAdded: {
      id: TEAM_NOTIFICATION_ID,
      title: 'Jordan joined Heavy Equipment',
      teamId: seedTeams.apexHeavyEquipment.id,
    },
    workOrderAssigned: {
      id: WORK_ORDER_NOTIFICATION_ID,
      title: `Assigned: ${workOrder.title}`,
      workOrderId: workOrder.id,
      workOrderTitle: workOrder.title,
    },
  };

  const { error } = await admin.from('notifications').upsert(
    [
      {
        id: fixtures.teamMemberAdded.id,
        organization_id: apexOrgId,
        user_id: apexOwnerUserId,
        type: 'team_member_added',
        title: fixtures.teamMemberAdded.title,
        message: 'Jordan was added to Heavy Equipment.',
        data: { team_id: fixtures.teamMemberAdded.teamId },
        read: false,
        is_global: false,
        created_at: teamCreatedAt,
        updated_at: teamCreatedAt,
      },
      {
        id: fixtures.workOrderAssigned.id,
        organization_id: apexOrgId,
        user_id: apexOwnerUserId,
        type: 'work_order_assigned',
        title: fixtures.workOrderAssigned.title,
        message: `You were assigned ${workOrder.title}.`,
        data: { work_order_id: fixtures.workOrderAssigned.workOrderId },
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

  return fixtures;
}
