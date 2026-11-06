import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import userEvent from '@testing-library/user-event';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PartAlternateGroup } from '@/features/inventory/types/inventory';

type Payload = { organizationId: string; groupId?: string; data: Record<string, unknown> };
const env = vi.hoisted(() => ({
  organization: { id: 'org-1', name: 'Org' } as { id: string; name: string } | null,
  createPending: false,
  updatePending: false,
  created: [] as Payload[],
  updated: [] as Payload[],
  fail: null as Error | null,
}));

vi.mock('@/contexts/OrganizationContext', () => ({
  useOrganization: () => ({ currentOrganization: env.organization }),
}));
vi.mock('@/features/inventory/hooks/useAlternateGroups', () => ({
  useCreateAlternateGroup: () => ({
    isPending: env.createPending,
    mutateAsync: async (payload: Payload) => {
      if (env.fail) throw env.fail;
      env.created.push(payload);
    },
  }),
  useUpdateAlternateGroup: () => ({
    isPending: env.updatePending,
    mutateAsync: async (payload: Payload) => {
      if (env.fail) throw env.fail;
      env.updated.push(payload);
    },
  }),
}));

const { AlternateGroupForm } = await import('./AlternateGroupForm');

const group: PartAlternateGroup = {
  id: 'grp-1',
  organization_id: 'org-1',
  name: 'Oil filters',
  description: 'Spin-on filters',
  status: 'verified',
  notes: 'Dealer cross-reference',
  evidence_url: 'https://example.com/xref',
  created_by: 'user-1',
  verified_by: null,
  verified_at: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

function setup(props: { group?: PartAlternateGroup } = {}) {
  const onSuccess = vi.fn();
  const onCancel = vi.fn();
  const user = userEvent.setup();
  render(<AlternateGroupForm {...props} onSuccess={onSuccess} onCancel={onCancel} />);
  return { user, onSuccess, onCancel };
}

describe('AlternateGroupForm', () => {
  beforeAll(() => {
    // jsdom lacks pointer capture, which Radix Select calls when opening.
    Object.defineProperty(Element.prototype, 'hasPointerCapture', { configurable: true, value: () => false });
    Object.defineProperty(Element.prototype, 'releasePointerCapture', { configurable: true, value: () => undefined });
  });

  beforeEach(() => {
    env.organization = { id: 'org-1', name: 'Org' };
    env.createPending = false;
    env.updatePending = false;
    env.created = [];
    env.updated = [];
    env.fail = null;
  });

  it('creates an unverified group, sending only the fields that were filled in', async () => {
    const { user, onSuccess } = setup();
    expect(screen.getByText(/Groups start as Unverified/)).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toHaveTextContent('Unverified');

    await user.type(screen.getByLabelText(/^Name/), 'Air filters');
    await user.click(screen.getByRole('button', { name: 'Create Group' }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    expect(env.created).toEqual([
      {
        organizationId: 'org-1',
        data: { name: 'Air filters', description: undefined, status: 'unverified', notes: undefined, evidence_url: undefined },
      },
    ]);
  });

  it('creates a group with every field and a chosen status', async () => {
    const { user, onSuccess } = setup();

    await user.type(screen.getByLabelText(/^Name/), 'Belts');
    await user.type(screen.getByLabelText('Description'), 'Drive belts');
    await user.type(screen.getByLabelText('Verification Notes'), 'From catalog');
    await user.type(screen.getByLabelText('Evidence URL'), 'https://example.com/belts');
    await user.click(screen.getByRole('combobox'));
    await user.click(await screen.findByRole('option', { name: 'Deprecated' }));
    await user.click(screen.getByRole('button', { name: 'Create Group' }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(env.created[0]?.data).toEqual({
      name: 'Belts',
      description: 'Drive belts',
      status: 'deprecated',
      notes: 'From catalog',
      evidence_url: 'https://example.com/belts',
    });
  });

  it('edits an existing group, prefilled from the record', async () => {
    const { user, onSuccess } = setup({ group });
    expect(screen.getByLabelText(/^Name/)).toHaveValue('Oil filters');
    expect(screen.getByLabelText('Evidence URL')).toHaveValue('https://example.com/xref');
    expect(screen.getByText(/Verified groups are shown with higher priority/)).toBeInTheDocument();

    await user.clear(screen.getByLabelText('Description'));
    await user.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(env.updated).toEqual([
      {
        organizationId: 'org-1',
        groupId: 'grp-1',
        data: {
          name: 'Oil filters',
          description: undefined,
          status: 'verified',
          notes: 'Dealer cross-reference',
          evidence_url: 'https://example.com/xref',
        },
      },
    ]);
  });

  it('clears notes and evidence on edit by sending them as undefined', async () => {
    const { user, onSuccess } = setup({ group });

    await user.clear(screen.getByLabelText('Verification Notes'));
    await user.clear(screen.getByLabelText('Evidence URL'));
    await user.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(env.updated[0]?.data).toMatchObject({ description: 'Spin-on filters', notes: undefined, evidence_url: undefined });
  });

  it('prefills blanks and the unverified status when the record has empty fields', () => {
    // Records come from the database as JSON; an unset status arrives as an empty string.
    const blank: PartAlternateGroup = {
      ...group,
      name: '',
      description: null,
      notes: null,
      evidence_url: null,
      ...JSON.parse('{"status": ""}'),
    };
    setup({ group: blank });
    expect(screen.getByLabelText(/^Name/)).toHaveValue('');
    expect(screen.getByRole('combobox')).toHaveTextContent('Unverified');
  });

  it('shows validation messages and does not save', async () => {
    const { user, onSuccess } = setup();

    await user.click(screen.getByLabelText('Description'));
    await user.paste('x'.repeat(1001));
    await user.click(screen.getByLabelText('Verification Notes'));
    await user.paste('y'.repeat(2001));
    await user.click(screen.getByRole('button', { name: 'Create Group' }));

    expect(await screen.findByText('Name is required')).toBeInTheDocument();
    expect(screen.getByText('Description is too long')).toBeInTheDocument();
    expect(screen.getByText('Notes are too long')).toBeInTheDocument();
    expect(env.created).toEqual([]);
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('rejects an evidence link that is not a URL', async () => {
    const { user } = setup();
    await user.type(screen.getByLabelText(/^Name/), 'Belts');
    await user.type(screen.getByLabelText('Evidence URL'), 'not a url');

    // Browsers block this natively (type="url"); submit directly to exercise the schema message.
    fireEvent.submit(screen.getByRole('button', { name: 'Create Group' }).closest('form')!);

    expect(await screen.findByText('Must be a valid URL')).toBeInTheDocument();
    expect(env.created).toEqual([]);
  });

  it('rejects names over 200 characters', async () => {
    const { user } = setup();
    await user.click(screen.getByLabelText(/^Name/));
    await user.paste('n'.repeat(201));
    await user.click(screen.getByRole('button', { name: 'Create Group' }));

    expect(await screen.findByText('Name is too long')).toBeInTheDocument();
  });

  it('does nothing without a selected organization', async () => {
    env.organization = null;
    const { user, onSuccess } = setup({ group });

    await user.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() => expect(env.updated).toEqual([]));
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('stays open when saving fails (the mutation reports the error)', async () => {
    env.fail = new Error('duplicate name');
    const { user, onSuccess } = setup({ group });

    await user.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() => expect(screen.getByRole('button', { name: 'Save Changes' })).toBeEnabled());
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it.each([
    ['creating', { createPending: true, updatePending: false }],
    ['updating', { createPending: false, updatePending: true }],
  ])('disables the form while %s', (_label, pending) => {
    env.createPending = pending.createPending;
    env.updatePending = pending.updatePending;
    setup();

    expect(screen.getByRole('button', { name: 'Saving...' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    expect(screen.getByLabelText(/^Name/)).toBeDisabled();
  });

  it('cancels without saving', async () => {
    const { user, onCancel } = setup();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(env.created).toEqual([]);
  });
});
