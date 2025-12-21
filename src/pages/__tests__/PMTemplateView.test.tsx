import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Route, Routes } from 'react-router-dom';
import PMTemplateView from '@/features/pm-templates/pages/PMTemplateView';
import { TestProviders } from '@/test/utils/TestProviders';
import { usePMTemplate } from '@/hooks/usePMTemplates';

vi.mock('@/hooks/usePMTemplates', () => ({
  usePMTemplate: vi.fn(),
  useClonePMTemplate: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
  })),
}));

describe('PMTemplateView', () => {
  it('renders template name and sections', async () => {
    vi.mocked(usePMTemplate).mockReturnValue({
      data: {
        id: 't1',
        name: 'Forklift PM',
        description: 'Standard PM',
        organization_id: null,
        is_protected: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        template_data: [
          { id: 'a', title: 'Oil/Coolant Leaks', section: 'Visual Inspection', condition: null, required: true },
          { id: 'b', title: 'Check Headlights', section: 'Electrical Inspection', condition: null, required: true },
        ]
      },
      isLoading: false
    } as unknown as ReturnType<typeof usePMTemplate>);

    render(
      <TestProviders initialEntries={[`/dashboard/pm-templates/t1`]}>
        <Routes>
          <Route path="/dashboard/pm-templates/:templateId" element={<PMTemplateView />} />
        </Routes>
      </TestProviders>
    );

    expect(await screen.findByRole('heading', { name: 'Forklift PM' })).toBeInTheDocument();
    expect(screen.getByText('Table of Contents')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Visual Inspection/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Electrical Inspection/ })).toBeInTheDocument();
  });
});



