/**
 * PartsAccessSheet Component Tests
 *
 * The sheet manages both inventory grants from the Inventory page (issue
 * #1152): Parts Managers (edit) and Parts Consumers (view + part lookup).
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@vitest-harness/utils/test-utils';
import { within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PartsAccessSheet } from './PartsAccessSheet';
import { personas } from '@vitest-harness/fixtures/personas';
import { organizations } from '@vitest-harness/fixtures/entities';

vi.mock('@/contexts/OrganizationContext', () => ({
  useOrganization: vi.fn(),
}));

vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: vi.fn(),
}));

vi.mock('@/features/organization/hooks/useOrganizationMembers', () => ({
  useOrganizationMembers: vi.fn(),
}));

vi.mock('@/features/inventory/hooks/usePartsManagers', () => ({
  usePartsManagers: vi.fn(),
  useAddPartsManager: vi.fn(),
  useRemovePartsManager: vi.fn(),
}));

vi.mock('@/features/inventory/hooks/usePartsConsumers', () => ({
  usePartsConsumers: vi.fn(),
  useAddPartsConsumer: vi.fn(),
  useRemovePartsConsumer: vi.fn(),
}));

import { useOrganization } from '@/contexts/OrganizationContext';
import { usePermissions } from '@/hooks/usePermissions';
import { useOrganizationMembers } from '@/features/organization/hooks/useOrganizationMembers';
import {
  usePartsManagers,
  useAddPartsManager,
  useRemovePartsManager,
} from '@/features/inventory/hooks/usePartsManagers';
import {
  usePartsConsumers,
  useAddPartsConsumer,
  useRemovePartsConsumer,
} from '@/features/inventory/hooks/usePartsConsumers';

const managerRecord = {
  organization_id: organizations.acme.id,
  user_id: personas.teamManager.id,
  assigned_by: personas.admin.id,
  assigned_at: '2024-01-15T10:00:00Z',
  userName: personas.teamManager.name,
  userEmail: personas.teamManager.email,
  assignedByName: personas.admin.name,
};

const consumerRecord = {
  organization_id: organizations.acme.id,
  user_id: personas.multiTeamTechnician.id,
  assigned_by: personas.admin.id,
  assigned_at: '2024-02-20T10:00:00Z',
  userName: personas.multiTeamTechnician.name,
  userEmail: personas.multiTeamTechnician.email,
  assignedByName: personas.admin.name,
};

const mockMembers = [
  {
    id: personas.technician.id,
    name: personas.technician.name,
    email: personas.technician.email,
    role: 'member',
    status: 'active',
  },
  {
    id: personas.teamManager.id,
    name: personas.teamManager.name,
    email: personas.teamManager.email,
    role: 'member',
    status: 'active',
  },
  {
    id: personas.multiTeamTechnician.id,
    name: personas.multiTeamTechnician.name,
    email: personas.multiTeamTechnician.email,
    role: 'member',
    status: 'active',
  },
  {
    id: personas.admin.id,
    name: personas.admin.name,
    email: personas.admin.email,
    role: 'admin',
    status: 'active',
  },
];

const setupMocks = (
  options: {
    canManage?: boolean;
    managers?: (typeof managerRecord)[];
    consumers?: (typeof consumerRecord)[];
  } = {},
) => {
  const { canManage = true, managers = [managerRecord], consumers = [consumerRecord] } = options;

  vi.mocked(useOrganization).mockReturnValue({
    currentOrganization: { id: organizations.acme.id, name: organizations.acme.name },
  } as ReturnType<typeof useOrganization>);

  vi.mocked(usePermissions).mockReturnValue({
    canManagePartsManagers: () => canManage,
    canManagePartsConsumers: () => canManage,
  } as unknown as ReturnType<typeof usePermissions>);

  vi.mocked(usePartsManagers).mockReturnValue({
    data: managers,
    isLoading: false,
  } as unknown as ReturnType<typeof usePartsManagers>);

  vi.mocked(usePartsConsumers).mockReturnValue({
    data: consumers,
    isLoading: false,
  } as unknown as ReturnType<typeof usePartsConsumers>);

  vi.mocked(useOrganizationMembers).mockReturnValue({
    data: mockMembers,
    isLoading: false,
  } as unknown as ReturnType<typeof useOrganizationMembers>);

  const addManager = vi.fn().mockResolvedValue({});
  vi.mocked(useAddPartsManager).mockReturnValue({
    mutateAsync: addManager,
    isPending: false,
  } as unknown as ReturnType<typeof useAddPartsManager>);

  const removeManager = vi.fn().mockResolvedValue(undefined);
  vi.mocked(useRemovePartsManager).mockReturnValue({
    mutateAsync: removeManager,
    isPending: false,
  } as unknown as ReturnType<typeof useRemovePartsManager>);

  const addConsumer = vi.fn().mockResolvedValue({});
  vi.mocked(useAddPartsConsumer).mockReturnValue({
    mutateAsync: addConsumer,
    isPending: false,
  } as unknown as ReturnType<typeof useAddPartsConsumer>);

  const removeConsumer = vi.fn().mockResolvedValue(undefined);
  vi.mocked(useRemovePartsConsumer).mockReturnValue({
    mutateAsync: removeConsumer,
    isPending: false,
  } as unknown as ReturnType<typeof useRemovePartsConsumer>);

  return { addManager, removeManager, addConsumer, removeConsumer };
};

const renderSheet = () => render(<PartsAccessSheet open={true} onOpenChange={vi.fn()} />);

describe('PartsAccessSheet', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders both role sections with current assignees', () => {
    setupMocks();
    renderSheet();

    expect(screen.getByRole('heading', { name: /parts access/i })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Parts Managers' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Parts Consumers' })).toBeInTheDocument();
    expect(screen.getByText(personas.teamManager.name)).toBeInTheDocument();
    expect(screen.getByText(personas.multiTeamTechnician.name)).toBeInTheDocument();
  });

  it('shows access denied for non-admins', () => {
    setupMocks({ canManage: false });
    renderSheet();

    expect(screen.getByText('Access Denied')).toBeInTheDocument();
    expect(
      screen.getByText(/Only organization owners and admins can manage parts access/),
    ).toBeInTheDocument();
  });

  it('adds selected members as parts managers', async () => {
    const { addManager } = setupMocks();
    renderSheet();

    const managersSection = screen.getByRole('region', { name: 'Parts Managers' });
    fireEvent.click(within(managersSection).getByRole('button', { name: /add/i }));

    await waitFor(() => {
      expect(screen.getByText(`Add Parts Managers`)).toBeInTheDocument();
    });

    // Existing manager is excluded; technician + multiTeamTechnician eligible.
    expect(screen.getByText(personas.technician.name)).toBeInTheDocument();

    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);

    fireEvent.click(screen.getByRole('button', { name: /add 1 member/i }));

    await waitFor(() => {
      expect(addManager).toHaveBeenCalledWith({
        organizationId: organizations.acme.id,
        userId: expect.any(String),
      });
    });
  });

  it('adds selected members as parts consumers', async () => {
    const { addConsumer } = setupMocks();
    renderSheet();

    const consumersSection = screen.getByRole('region', { name: 'Parts Consumers' });
    fireEvent.click(within(consumersSection).getByRole('button', { name: /add/i }));

    await waitFor(() => {
      expect(screen.getByText(`Add Parts Consumers`)).toBeInTheDocument();
    });

    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);

    fireEvent.click(screen.getByRole('button', { name: /add 1 member/i }));

    await waitFor(() => {
      expect(addConsumer).toHaveBeenCalledWith({
        organizationId: organizations.acme.id,
        userId: expect.any(String),
      });
    });
  });

  it('removes a parts consumer after confirmation', async () => {
    const { removeConsumer } = setupMocks();
    renderSheet();

    fireEvent.click(
      screen.getByRole('button', {
        name: `Remove ${personas.multiTeamTechnician.name} from Parts Consumers`,
      }),
    );

    await waitFor(() => {
      expect(screen.getByText('Remove Parts Consumer?')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /^remove$/i }));

    await waitFor(() => {
      expect(removeConsumer).toHaveBeenCalledWith({
        organizationId: organizations.acme.id,
        userId: personas.multiTeamTechnician.id,
      });
    });
  });

  it('removes a parts manager after confirmation', async () => {
    const { removeManager } = setupMocks();
    renderSheet();

    fireEvent.click(
      screen.getByRole('button', {
        name: `Remove ${personas.teamManager.name} from Parts Managers`,
      }),
    );

    await waitFor(() => {
      expect(screen.getByText('Remove Parts Manager?')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /^remove$/i }));

    await waitFor(() => {
      expect(removeManager).toHaveBeenCalledWith({
        organizationId: organizations.acme.id,
        userId: personas.teamManager.id,
      });
    });
  });

  it('documents all four permission tiers in the info panel', () => {
    setupMocks();
    renderSheet();

    expect(screen.getByText('About Permissions')).toBeInTheDocument();
    expect(screen.getByText(/can always view and manage inventory/)).toBeInTheDocument();
    expect(screen.getAllByText(/can create, edit, and delete/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/can view inventory and use part lookup/).length).toBeGreaterThan(0);
    expect(screen.getByText(/cannot access inventory at all/)).toBeInTheDocument();
  });
});
