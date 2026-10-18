import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';

/**
 * Client for the dfy-provisioning Edge Function (issue #1648 review). The
 * server decides who is an operator; the UI only hides the entry point.
 */

const errorPayloadSchema = z.object({ error: z.string(), message: z.string().optional() });

export class DfyProvisioningError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'DfyProvisioningError';
    this.code = code;
  }
}

async function readErrorPayload(error: Error & { context?: unknown }) {
  if (!(error.context instanceof Response)) return null;
  const body: unknown = await error.context.clone().json().catch(() => null);
  const parsed = errorPayloadSchema.safeParse(body);
  return parsed.success ? parsed.data : null;
}

async function invoke<T>(body: Record<string, unknown>, schema: z.ZodType<T>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('dfy-provisioning', { body });
  if (error) {
    const payload = await readErrorPayload(error);
    throw new DfyProvisioningError(payload?.error ?? 'REQUEST_FAILED', payload?.message ?? payload?.error ?? error.message);
  }
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    throw new DfyProvisioningError('BAD_RESPONSE', 'Unexpected response from provisioning service');
  }
  return parsed.data;
}

export type DfyStaffRole = 'owner' | 'admin' | 'member';
export type DfyTeamRole = 'manager' | 'technician' | 'requestor' | 'viewer';

export interface DfyStaffInput {
  email: string;
  role: DfyStaffRole;
  teamRole?: DfyTeamRole | null;
}

export interface DfyEquipmentInput {
  name: string;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  location?: string;
  installationDate?: string;
  status?: 'active' | 'maintenance' | 'inactive';
  notes?: string;
  importId?: string;
}

const unclaimedOrgSchema = z.object({
  id: z.string(),
  name: z.string(),
  provisioned_at: z.string(),
  provisioned_by: z.string().nullable(),
  pending_staff: z.number(),
  equipment_count: z.number(),
});

const yardDetailSchema = z.object({
  organization: z.object({ id: z.string(), name: z.string(), provisioned_at: z.string() }),
  teams: z.array(z.object({ id: z.string(), name: z.string() })),
  staff: z.array(
    z.object({
      id: z.string(),
      email: z.string(),
      role: z.string(),
      team_role: z.string().nullable(),
      status: z.string(),
    }),
  ),
  equipment: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      manufacturer: z.string(),
      model: z.string(),
      serial_number: z.string(),
      location: z.string(),
    }),
  ),
});

export const dfyProvisioning = {
  whoami: () => invoke({ action: 'whoami' }, z.object({ isOperator: z.boolean() })),
  list: () =>
    invoke({ action: 'list' }, z.object({ organizations: z.array(unclaimedOrgSchema) })).then(
      (r) => r.organizations,
    ),
  get: (organizationId: string) => invoke({ action: 'get', organizationId }, yardDetailSchema),
  checkExisting: (emails: string[]) =>
    invoke({ action: 'check_existing', emails }, z.object({ existing: z.array(z.string()) })).then(
      (r) => r.existing,
    ),
  create: (input: {
    requestId: string;
    name: string;
    teamName?: string;
    staff: DfyStaffInput[];
    equipment: DfyEquipmentInput[];
    attachExistingEmails: string[];
  }) =>
    invoke(
      { action: 'create', ...input },
      z.object({ organization_id: z.string(), created: z.boolean() }),
    ),
  stage: (input: { organizationId: string; attachExisting: boolean } & DfyStaffInput) =>
    invoke({ action: 'stage', ...input }, z.object({ stagedMemberId: z.string() })),
  revokeStaff: (stagedMemberId: string) =>
    invoke({ action: 'revoke_staff', stagedMemberId }, z.object({ ok: z.boolean() })),
  addEquipment: (organizationId: string, equipment: DfyEquipmentInput[]) =>
    invoke({ action: 'add_equipment', organizationId, equipment }, z.object({ added: z.number() })),
  deleteEquipment: (organizationId: string, equipmentId: string) =>
    invoke({ action: 'delete_equipment', organizationId, equipmentId }, z.object({ ok: z.boolean() })),
  sendInvites: (organizationId: string) =>
    invoke(
      { action: 'send_invites', organizationId },
      z.object({ results: z.array(z.object({ email: z.string(), sent: z.boolean() })) }),
    ).then((r) => r.results),
};
