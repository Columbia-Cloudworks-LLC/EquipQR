import { renderHook, waitFor, act } from '@testing-library/react';
import { vi, beforeEach, describe, it, expect } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import {
  usePMTemplates,
  usePMTemplate,
  useCreatePMTemplate,
  useUpdatePMTemplate,
  useDeletePMTemplate,
  useClonePMTemplate
} from '@/features/pm-templates/hooks/usePMTemplates';

// Mock services and dependencies
vi.mock('@/contexts/OrganizationContext');
vi.mock('@/hooks/useAuth');
vi.mock('@/features/pm-templates/services/pmChecklistTemplatesService');
vi.mock('sonner');

const mockTemplates = [
  {
    id: 'template-1',
    organization_id: null,
    name: 'Global Template',
    description: 'Global template description',
    is_protected: true,
    template_data: [
      { id: 'item-1', section: 'Engine', title: 'Check oil', description: '', condition: null, notes: '', required: true }
    ],
    created_by: 'user-1',
    updated_by: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    id: 'template-2',
    organization_id: 'org-1',
    name: 'Org Template',
    description: 'Organization template',
    is_protected: false,
    template_data: [
      { id: 'item-2', section: 'Safety', title: 'Check brakes', description: '', condition: null, notes: '', required: true }
    ],
    created_by: 'user-1',
    updated_by: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  }
];

const mockTemplateSummaries = [
  {
    id: 'template-1',
    name: 'Global Template',
    description: 'Global template description',
    is_protected: true,
    organization_id: null,
    sections: [{ name: 'Engine', count: 1 }],
    itemCount: 1
  },
  {
    id: 'template-2',
    name: 'Org Template',
    description: 'Organization template',
    is_protected: false,
    organization_id: 'org-1',
    sections: [{ name: 'Safety', count: 1 }],
    itemCount: 1
  }
];

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};

describe('usePMTemplates', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Apply mocks to modules
    const { useOrganization } = await import('@/contexts/OrganizationContext');
    const { useAuth } = await import('@/hooks/useAuth');
    const { pmChecklistTemplatesService, templateToSummary } = await import('@/features/pm-templates/services/pmChecklistTemplatesService');
    const { toast } = await import('sonner');
    
    vi.mocked(useOrganization).mockReturnValue({
      currentOrganization: { 
        id: 'org-1', 
        name: 'Test Org',
        plan: 'premium' as const,
        memberCount: 5,
        maxMembers: 10,
        features: ['advanced-analytics'],
        userRole: 'admin' as const,
        userStatus: 'active' as const
      },
      setCurrentOrganization: vi.fn(),
      userOrganizations: [],
      organizations: [],
      switchOrganization: vi.fn(),
      error: null,
      refetch: vi.fn(),
      isLoading: false
    });
    
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'user-1', email: 'test@example.com' },
      loading: false,
      signOut: vi.fn(),
      refreshUser: vi.fn()
    } as unknown as ReturnType<typeof useAuth>);
    
    vi.mocked(pmChecklistTemplatesService.listTemplates).mockResolvedValue(mockTemplates);
    vi.mocked(pmChecklistTemplatesService.getTemplate).mockResolvedValue(mockTemplates[0]);
    vi.mocked(pmChecklistTemplatesService.createTemplate).mockResolvedValue(mockTemplates[0]);
    vi.mocked(pmChecklistTemplatesService.updateTemplate).mockResolvedValue(mockTemplates[0]);
    vi.mocked(pmChecklistTemplatesService.deleteTemplate).mockResolvedValue(undefined);
    vi.mocked(pmChecklistTemplatesService.cloneTemplate).mockResolvedValue(mockTemplates[1]);
    vi.mocked(templateToSummary).mockImplementation((template: typeof mockTemplates[0]) => 
      mockTemplateSummaries.find(s => s.id === template.id)!
    );
    vi.mocked(toast.success).mockImplementation(() => '1');
    vi.mocked(toast.error).mockImplementation(() => '1');
  });

  describe('usePMTemplates', () => {
    it('fetches and transforms template list', async () => {
      const { result } = renderHook(() => usePMTemplates(), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockTemplateSummaries);
    });

    it('is disabled when no organization is selected', async () => {
      const { useOrganization } = await import('@/contexts/OrganizationContext');
      vi.mocked(useOrganization).mockReturnValue({
        currentOrganization: null,
        setCurrentOrganization: vi.fn(),
        userOrganizations: [],
        organizations: [],
        switchOrganization: vi.fn(),
        error: null,
        refetch: vi.fn(),
        isLoading: false
      });

      const { result } = renderHook(() => usePMTemplates(), { wrapper });

      expect(result.current.fetchStatus).toBe('idle');
    });

    it('handles loading state', async () => {
      const { pmChecklistTemplatesService } = await import('@/features/pm-templates/services/pmChecklistTemplatesService');
      vi.mocked(pmChecklistTemplatesService.listTemplates).mockImplementation(() => new Promise(() => {}));

      const { result } = renderHook(() => usePMTemplates(), { wrapper });

      expect(result.current.isLoading).toBe(true);
    });

    it('handles error state', async () => {
      const { pmChecklistTemplatesService } = await import('@/features/pm-templates/services/pmChecklistTemplatesService');
      vi.mocked(pmChecklistTemplatesService.listTemplates).mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => usePMTemplates(), { wrapper });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(new Error('Network error'));
    });
  });

  describe('usePMTemplate', () => {
    it('fetches single template by ID', async () => {
      const { result } = renderHook(() => usePMTemplate('template-1'), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockTemplates[0]);
    });

    it('is disabled when no template ID provided', () => {
      const { result } = renderHook(() => usePMTemplate(''), { wrapper });
      expect(result.current.fetchStatus).toBe('idle');
    });
  });

  describe('useCreatePMTemplate', () => {
    it('creates new template successfully', async () => {
      const { result } = renderHook(() => useCreatePMTemplate(), { wrapper });

      const templateData = {
        name: 'New Template',
        description: 'Test description',
        template_data: [
          { id: 'item-1', section: 'Test', title: 'Test item', description: '', condition: null, notes: '', required: true }
        ]
      };

      await result.current.mutateAsync(templateData);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
    });

    it('handles creation error with permission message', async () => {
      const { pmChecklistTemplatesService } = await import('@/features/pm-templates/services/pmChecklistTemplatesService');
      vi.mocked(pmChecklistTemplatesService.createTemplate).mockRejectedValue(
        new Error('insufficient privileges')
      );

      const { result } = renderHook(() => useCreatePMTemplate(), { wrapper });

      try {
        await result.current.mutateAsync({
          name: 'Test',
          template_data: []
        });
        expect.fail('Should have thrown an error');
      } catch (error) {
        // Mutation should reject and set error state
        expect(error).toBeDefined();
        await waitFor(() => {
          expect(result.current.isError).toBe(true);
        });
      }
    });

    it('handles general creation error', async () => {
      const { pmChecklistTemplatesService } = await import('@/features/pm-templates/services/pmChecklistTemplatesService');
      vi.mocked(pmChecklistTemplatesService.createTemplate).mockRejectedValue(
        new Error('Network error')
      );

      const { result } = renderHook(() => useCreatePMTemplate(), { wrapper });

      try {
        await result.current.mutateAsync({
          name: 'Test',
          template_data: []
        });
        expect.fail('Should have thrown an error');
      } catch (error) {
        // Mutation should reject and set error state
        expect(error).toBeDefined();
        await waitFor(() => {
          expect(result.current.isError).toBe(true);
        });
      }
    });

    it('throws error when organization or user not found', async () => {
      const { useOrganization } = await import('@/contexts/OrganizationContext');
      vi.mocked(useOrganization).mockReturnValue({
        currentOrganization: null,
        setCurrentOrganization: vi.fn(),
        userOrganizations: [],
        organizations: [],
        switchOrganization: vi.fn(),
        error: null,
        refetch: vi.fn(),
        isLoading: false
      });

      const { result } = renderHook(() => useCreatePMTemplate(), { wrapper });

      await expect(
        result.current.mutateAsync({
          name: 'Test',
          template_data: []
        })
      ).rejects.toThrow('Organization or user not found');
    });
  });

  describe('useUpdatePMTemplate', () => {
    it('updates template successfully', async () => {
      const { result } = renderHook(() => useUpdatePMTemplate(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({
          templateId: 'template-1',
          updates: {
            name: 'Updated Template',
            description: 'Updated description'
          }
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
    });

    it('handles update permission error', async () => {
      const { pmChecklistTemplatesService } = await import('@/features/pm-templates/services/pmChecklistTemplatesService');
      vi.mocked(pmChecklistTemplatesService.updateTemplate).mockRejectedValue(
        new Error('insufficient privileges')
      );

      const { result } = renderHook(() => useUpdatePMTemplate(), { wrapper });

      try {
        await result.current.mutateAsync({
          templateId: 'template-1',
          updates: { name: 'Test' }
        });
        expect.fail('Should have thrown an error');
      } catch (error) {
        // Mutation should reject and set error state
        expect(error).toBeDefined();
        await waitFor(() => {
          expect(result.current.isError).toBe(true);
        });
      }
    });
  });

  describe('useDeletePMTemplate', () => {
    it('deletes template successfully', async () => {
      const { result } = renderHook(() => useDeletePMTemplate(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync('template-1');
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
    });

    it('handles protected template deletion error', async () => {
      const { pmChecklistTemplatesService } = await import('@/features/pm-templates/services/pmChecklistTemplatesService');
      vi.mocked(pmChecklistTemplatesService.deleteTemplate).mockRejectedValue(
        new Error('Cannot delete protected template')
      );

      const { result } = renderHook(() => useDeletePMTemplate(), { wrapper });

      try {
        await result.current.mutateAsync('template-1');
        expect.fail('Should have thrown an error');
      } catch (error) {
        // Mutation should reject and set error state
        expect(error).toBeDefined();
        await waitFor(() => {
          expect(result.current.isError).toBe(true);
        });
      }
    });
  });

  describe('useClonePMTemplate', () => {
    it('clones template successfully', async () => {
      const { result } = renderHook(() => useClonePMTemplate(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({
          sourceId: 'template-1',
          newName: 'Cloned Template'
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
    });

    it('handles clone permission error', async () => {
      const { pmChecklistTemplatesService } = await import('@/features/pm-templates/services/pmChecklistTemplatesService');
      vi.mocked(pmChecklistTemplatesService.cloneTemplate).mockRejectedValue(
        new Error('insufficient privileges')
      );

      const { result } = renderHook(() => useClonePMTemplate(), { wrapper });

      try {
        await result.current.mutateAsync({
          sourceId: 'template-1'
        });
        expect.fail('Should have thrown an error');
      } catch (error) {
        // Mutation should reject and set error state
        expect(error).toBeDefined();
        await waitFor(() => {
          expect(result.current.isError).toBe(true);
        });
      }
    });

    it('throws error when organization not found', async () => {
      const { useOrganization } = await import('@/contexts/OrganizationContext');
      vi.mocked(useOrganization).mockReturnValue({
        currentOrganization: null,
        setCurrentOrganization: vi.fn(),
        userOrganizations: [],
        organizations: [],
        switchOrganization: vi.fn(),
        error: null,
        refetch: vi.fn(),
        isLoading: false
      });

      const { result } = renderHook(() => useClonePMTemplate(), { wrapper });

      await expect(
        result.current.mutateAsync({
          sourceId: 'template-1'
        })
      ).rejects.toThrow('Organization not found');
    });
  });
});