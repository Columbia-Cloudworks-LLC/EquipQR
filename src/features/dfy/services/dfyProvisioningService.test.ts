import { beforeEach, describe, expect, it, vi } from 'vitest';

type InvokeResult = { data: unknown; error: (Error & { context?: unknown }) | null };
const edge = vi.hoisted(() => ({
  requests: [] as { name: string; body: unknown }[],
  next: { data: null, error: null } as InvokeResult,
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: async (name: string, options: { body: unknown }) => {
        edge.requests.push({ name, body: options.body });
        return edge.next;
      },
    },
  },
}));

const { dfyProvisioning, DfyProvisioningError } = await import('./dfyProvisioningService');

function respond(data: unknown) {
  edge.next = { data, error: null };
}

function fail(message: string, context?: unknown) {
  const error: Error & { context?: unknown } = new Error(message);
  error.context = context;
  edge.next = { data: null, error };
}

async function caught(promise: Promise<unknown>) {
  try {
    await promise;
  } catch (error) {
    if (error instanceof DfyProvisioningError) return { name: error.name, code: error.code, message: error.message };
    throw error;
  }
  throw new Error('expected a DfyProvisioningError');
}

describe('dfyProvisioning', () => {
  beforeEach(() => {
    edge.requests = [];
    edge.next = { data: null, error: null };
  });

  it('calls the dfy-provisioning function with the action and returns the validated payload', async () => {
    respond({ isOperator: true });

    await expect(dfyProvisioning.whoami()).resolves.toEqual({ isOperator: true });
    expect(edge.requests).toEqual([{ name: 'dfy-provisioning', body: { action: 'whoami' } }]);
  });

  it('unwraps list, checkExisting, and sendInvites results', async () => {
    const org = {
      id: 'o1', name: 'Yard', provisioned_at: '2026-01-01', provisioned_by: null, pending_staff: 2, equipment_count: 5,
    };
    respond({ organizations: [org] });
    await expect(dfyProvisioning.list()).resolves.toEqual([org]);

    respond({ existing: ['a@x.test'] });
    await expect(dfyProvisioning.checkExisting(['a@x.test', 'b@x.test'])).resolves.toEqual(['a@x.test']);
    expect(edge.requests[1]?.body).toEqual({ action: 'check_existing', emails: ['a@x.test', 'b@x.test'] });

    respond({ results: [{ email: 'a@x.test', sent: true }] });
    await expect(dfyProvisioning.sendInvites('o1')).resolves.toEqual([{ email: 'a@x.test', sent: true }]);
  });

  it('returns yard details and mutation acknowledgements', async () => {
    const detail = {
      organization: { id: 'o1', name: 'Yard', provisioned_at: '2026-01-01' },
      teams: [{ id: 't1', name: 'Shop' }],
      staff: [{ id: 's1', email: 'a@x.test', role: 'admin', team_role: null, status: 'pending' }],
      equipment: [{ id: 'e1', name: 'Loader', manufacturer: 'Cat', model: '950', serial_number: 'S', location: 'Yard' }],
    };
    respond(detail);
    await expect(dfyProvisioning.get('o1')).resolves.toEqual(detail);

    respond({ organization_id: 'o2', created: true });
    await expect(
      dfyProvisioning.create({ requestId: 'r', name: 'New', staff: [], equipment: [], attachExistingEmails: [] }),
    ).resolves.toEqual({ organization_id: 'o2', created: true });

    respond({ stagedMemberId: 'm1' });
    await expect(
      dfyProvisioning.stage({ organizationId: 'o1', attachExisting: false, email: 'a@x.test', role: 'member' }),
    ).resolves.toEqual({ stagedMemberId: 'm1' });

    respond({ ok: true });
    await expect(dfyProvisioning.revokeStaff('m1')).resolves.toEqual({ ok: true });
    respond({ added: 3 });
    await expect(dfyProvisioning.addEquipment('o1', [{ name: 'A' }])).resolves.toEqual({ added: 3 });
    respond({ ok: true });
    await expect(dfyProvisioning.deleteEquipment('o1', 'e1')).resolves.toEqual({ ok: true });

    expect(edge.requests.map((r) => (r.body as { action: string }).action)).toEqual([
      'get', 'create', 'stage', 'revoke_staff', 'add_equipment', 'delete_equipment',
    ]);
  });

  it('rejects responses that do not match the expected shape', async () => {
    respond({ isOperator: 'yes' });

    await expect(caught(dfyProvisioning.whoami())).resolves.toEqual({
      name: 'DfyProvisioningError',
      code: 'BAD_RESPONSE',
      message: 'Unexpected response from provisioning service',
    });
  });

  describe('function errors', () => {
    it('uses the server error code and message from the response body', async () => {
      fail('Edge Function returned a non-2xx status code', Response.json({ error: 'NOT_OPERATOR', message: 'Operators only' }, { status: 403 }));

      await expect(caught(dfyProvisioning.list())).resolves.toMatchObject({ code: 'NOT_OPERATOR', message: 'Operators only' });
    });

    it('falls back to the error code as the message when none is given', async () => {
      fail('non-2xx', Response.json({ error: 'YARD_CLAIMED' }, { status: 409 }));

      await expect(caught(dfyProvisioning.get('o1'))).resolves.toMatchObject({ code: 'YARD_CLAIMED', message: 'YARD_CLAIMED' });
    });

    it.each([
      ['a non-JSON body', new Response('<html>oops</html>', { status: 500 })],
      ['a JSON body without an error code', Response.json({ detail: 'x' }, { status: 500 })],
      ['no HTTP response (network failure)', undefined],
    ])('reports REQUEST_FAILED with the client error message for %s', async (_label, context) => {
      fail('Failed to send a request to the Edge Function', context);

      await expect(caught(dfyProvisioning.whoami())).resolves.toMatchObject({
        code: 'REQUEST_FAILED',
        message: 'Failed to send a request to the Edge Function',
      });
    });
  });
});
