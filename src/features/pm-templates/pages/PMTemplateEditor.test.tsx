import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import PMTemplateEditor from '@/features/pm-templates/pages/PMTemplateEditor';
import { TestProviders } from '@vitest-harness/utils/TestProviders';

const { mockNavigate, mockSave, mockRequestCancel, mockHasUnsavedChanges } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockSave: vi.fn().mockResolvedValue('saved-template-id'),
  mockRequestCancel: vi.fn(),
  mockHasUnsavedChanges: vi.fn().mockReturnValue(false),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ templateId: undefined }),
  };
});

vi.mock('@/features/organization/components/ChecklistTemplateEditor', async () => {
  const React = await import('react');
  const MockEditor = React.forwardRef<
    { save: () => Promise<string | undefined>; requestCancel: () => void; hasUnsavedChanges: () => boolean },
    { onSave: (templateId?: string) => void; onCancel: () => void }
  >(function MockEditor({ onSave }, ref) {
    React.useImperativeHandle(ref, () => ({
      save: async () => {
        const id = await mockSave();
        onSave(id);
        return id;
      },
      requestCancel: mockRequestCancel,
      hasUnsavedChanges: mockHasUnsavedChanges,
    }));
    return React.createElement('div', { 'data-testid': 'page-editor' }, 'Editor content');
  });
  MockEditor.displayName = 'MockChecklistTemplateEditor';
  return { ChecklistTemplateEditor: MockEditor };
});

vi.mock('@/contexts/OrganizationContext', () => ({
  useOrganization: () => ({
    currentOrganization: { id: 'org-1', name: 'Test Org' },
  }),
}));

vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: () => ({
    hasRole: () => true,
  }),
}));

vi.mock('@/features/organization/hooks/useSimplifiedOrganizationRestrictions', () => ({
  useSimplifiedOrganizationRestrictions: () => ({
    restrictions: { canCreateCustomPMTemplates: true },
  }),
}));

vi.mock('@/features/pm-templates/hooks/usePMTemplates', () => ({
  usePMTemplate: () => ({ data: null, isLoading: false }),
}));

describe('PMTemplateEditor page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSave.mockResolvedValue('saved-template-id');
    mockHasUnsavedChanges.mockReturnValue(false);
  });

  it('renders create page with save and cancel actions', () => {
    render(
      <TestProviders>
        <PMTemplateEditor />
      </TestProviders>
    );

    expect(screen.getByText('Create PM Template')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create template/i })).toBeInTheDocument();
    expect(screen.getByTestId('page-editor')).toBeInTheDocument();
  });

  it('navigates to view page after save', async () => {
    render(
      <TestProviders>
        <PMTemplateEditor />
      </TestProviders>
    );

    fireEvent.click(screen.getByRole('button', { name: /create template/i }));

    await waitFor(() => {
      expect(mockSave).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard/pm-templates/saved-template-id');
    });
  });

  it('delegates cancel to the editor handle', () => {
    render(
      <TestProviders>
        <PMTemplateEditor />
      </TestProviders>
    );

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(mockRequestCancel).toHaveBeenCalled();
  });
});
