import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import PMTemplateView from '@/pages/PMTemplateView';
import { TestProviders } from '@/test/utils/TestProviders';
import { usePMTemplate } from '@/hooks/usePMTemplates';

vi.mock('@/hooks/usePMTemplates', () => ({
  usePMTemplate: vi.fn()
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
      <TestProviders>
        <MemoryRouter initialEntries={[`/dashboard/pm-templates/t1`] }>
          <Routes>
            <Route path="/dashboard/pm-templates/:templateId" element={<PMTemplateView />} />
          </Routes>
        </MemoryRouter>
      </TestProviders>
    );

    expect(await screen.findByText('Forklift PM')).toBeInTheDocument();
    expect(screen.getByText('Table of Contents')).toBeInTheDocument();
    expect(screen.getByText(/Visual Inspection/)).toBeInTheDocument();
    expect(screen.getByText(/Electrical Inspection/)).toBeInTheDocument();
  });
});



