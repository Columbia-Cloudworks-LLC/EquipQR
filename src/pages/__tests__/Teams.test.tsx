import React from 'react';
import { render, screen, fireEvent } from '@/test/utils/test-utils';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import Teams from '../Teams';
import type { UseQueryResult } from '@tanstack/react-query';
import type { OptimizedTeam } from '@/hooks/useOptimizedTeams';

vi.mock('@/components/teams/CreateTeamDialog', () => ({
  default: ({ open, onClose }: { open: boolean; onClose: () => void }) =>
    open ? (
      <div data-testid="team-form-modal">
        <button onClick={onClose}>Close Form</button>
      </div>
    ) : null
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('@/hooks/useOptimizedTeams', () => ({
  useOptimizedTeams: vi.fn()
}));

vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: vi.fn()
}));

vi.mock('@/hooks/useSimpleOrganization', () => ({
  useSimpleOrganization: vi.fn()
}));

import { useOptimizedTeams } from '@/hooks/useOptimizedTeams';
import { usePermissions } from '@/hooks/usePermissions';
import { useSimpleOrganization } from '@/hooks/useSimpleOrganization';

const mockUseOptimizedTeams = vi.mocked(useOptimizedTeams);
const mockUsePermissions = vi.mocked(usePermissions);
const mockUseSimpleOrganization = vi.mocked(useSimpleOrganization);

const mockTeam: OptimizedTeam = {
  id: 'team-1',
  name: 'Engineering Team',
  description: 'Dev team',
  organization_id: 'org-1',
  created_at: '',
  updated_at: '',
  members: [
    {
      id: 'member-1',
      user_id: 'user-1',
      team_id: 'team-1',
      role: 'manager',
      joined_date: '',
      profiles: { id: 'user-1', name: 'John Doe', email: 'john@example.com' }
    }
  ],
  member_count: 1
};

const renderTeamsPage = () => render(<Teams />);

beforeEach(() => {
  vi.clearAllMocks();
  mockUseSimpleOrganization.mockReturnValue({ currentOrganization: { id: 'org-1' } });
  mockUsePermissions.mockReturnValue({ canCreateTeam: () => true });
  mockUseOptimizedTeams.mockReturnValue({ data: [], isLoading: false } as unknown as UseQueryResult<OptimizedTeam[], Error>);
});

describe('Teams Page', () => {
  it('shows loading state with skeleton cards', () => {
    mockUseOptimizedTeams.mockReturnValue({ data: undefined, isLoading: true } as unknown as UseQueryResult<OptimizedTeam[], Error>);
    renderTeamsPage();
    expect(screen.getByTestId('teams-loading')).toBeInTheDocument();
  });

  it('displays empty state when no teams exist', () => {
    renderTeamsPage();
    expect(screen.getByText('No teams yet')).toBeInTheDocument();
  });

  it('renders team information when teams exist', () => {
    mockUseOptimizedTeams.mockReturnValue({ data: [mockTeam], isLoading: false } as unknown as UseQueryResult<OptimizedTeam[], Error>);
    renderTeamsPage();
    expect(screen.getByText('Engineering Team')).toBeInTheDocument();
    expect(screen.getByText('Dev team')).toBeInTheDocument();
  });

  it('opens team form modal when create button is clicked', () => {
    renderTeamsPage();
    const createButton = screen.getByRole('button', { name: /create team/i });
    fireEvent.click(createButton);
    expect(screen.getByTestId('team-form-modal')).toBeInTheDocument();
  });

  it('navigates to team details when manage team button is clicked', () => {
    mockUseOptimizedTeams.mockReturnValue({ data: [mockTeam], isLoading: false } as unknown as UseQueryResult<OptimizedTeam[], Error>);
    renderTeamsPage();
    const manageButton = screen.getByRole('button', { name: /manage team/i });
    fireEvent.click(manageButton);
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard/teams/team-1');
  });
});

