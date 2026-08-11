import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { createTestQueryClient } from '@vitest-harness/utils/query-client-wrapper';
import { useSession } from '@/hooks/useSession';
import { useAuth } from '@/hooks/useAuth';
import { permissionEngine } from '@/services/permissions/PermissionEngine';
import { personas } from '@vitest-harness/fixtures/personas';
import {
  createMockAuthForPersona,
  createMockSessionForPersona,
} from '@vitest-harness/utils/mock-provider-values';

export const createUnifiedPermissionsWrapper = () => {
  const queryClient = createTestQueryClient();

  return ({ children }: { children: React.ReactNode }) => (
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </MemoryRouter>
  );
};

export const setupUnifiedPermissionsPersonaMocks = (personaKey: keyof typeof personas) => {
  const persona = personas[personaKey];

  vi.mocked(useAuth).mockReturnValue({
    ...createMockAuthForPersona(persona),
    signUp: vi.fn(),
    signIn: vi.fn(),
    signInWithGoogle: vi.fn(),
    signOut: vi.fn(),
  });

  vi.mocked(useSession).mockReturnValue({
    ...createMockSessionForPersona(persona),
    switchOrganization: vi.fn(),
    refreshSession: vi.fn(),
    clearSession: vi.fn(),
  });

  vi.mocked(permissionEngine.hasPermission).mockImplementation(
    (permission: string, userContext, entityContext) => {
      const role = persona.organizationRole;

      if (role === 'owner' || role === 'admin') {
        return true;
      }

      if (role === 'member') {
        const teamId = entityContext?.teamId;
        const assigneeId = entityContext?.assigneeId;

        const hasTeamAccess = persona.teamMemberships.some((tm) => tm.teamId === teamId);
        const isAssigned = assigneeId === persona.id;
        const isManager = persona.teamMemberships.some(
          (tm) => tm.teamId === teamId && tm.role === 'manager',
        );
        const canCreateForTeam = persona.teamMemberships.some(
          (tm) => tm.teamId === teamId && (tm.role === 'manager' || tm.role === 'technician'),
        );

        if (permission.startsWith('workorder.')) {
          if (permission === 'workorder.view') return hasTeamAccess || isAssigned;
          if (permission === 'workorder.edit') return isAssigned || isManager;
          if (permission === 'workorder.assign') return isManager;
          if (permission === 'workorder.changestatus') return isAssigned || isManager;
        }

        if (permission.startsWith('equipment.')) {
          if (permission === 'equipment.view') return hasTeamAccess;
          if (permission === 'equipment.edit') return isManager;
          if (permission === 'equipment.create') return canCreateForTeam;
        }

        if (permission.startsWith('team.')) {
          if (permission === 'team.view') return hasTeamAccess;
          if (permission === 'team.manage') return isManager;
        }

        return false;
      }

      if (role === 'viewer') {
        return permission.includes('.view');
      }

      return false;
    },
  );
};
