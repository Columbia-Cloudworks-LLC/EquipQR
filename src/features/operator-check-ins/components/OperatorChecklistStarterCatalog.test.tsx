import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@vitest-harness/utils/test-utils';
import { OperatorChecklistStarterCatalog } from '@/features/operator-check-ins/components/OperatorChecklistStarterCatalog';
import * as catalogPreferences from '@/features/operator-check-ins/utils/operatorChecklistCatalogPreferences';

vi.mock('@/features/operator-check-ins/utils/operatorChecklistCatalogPreferences', () => ({
  getStarterCatalogExpandedPreference: vi.fn(() => null),
  setStarterCatalogExpandedPreference: vi.fn(),
}));

const defaultProps = {
  organizationId: 'org-test-1',
  hasExistingTemplates: false,
  cloningStarterId: null as string | null,
  isCloning: false,
  onClone: vi.fn(),
};

describe('OperatorChecklistStarterCatalog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(catalogPreferences.getStarterCatalogExpandedPreference).mockReturnValue(null);
  });

  it('renders both starters with Clone template buttons', () => {
    render(<OperatorChecklistStarterCatalog {...defaultProps} />);

    expect(screen.getByText('Odometer Log')).toBeInTheDocument();
    expect(screen.getByText('FMCSA-style DVIR starter')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Clone template' })).toHaveLength(2);
    expect(screen.queryByRole('button', { name: 'Use template' })).not.toBeInTheDocument();
  });

  it('calls onClone with the starter id when Clone template is clicked', () => {
    const onClone = vi.fn();
    render(<OperatorChecklistStarterCatalog {...defaultProps} onClone={onClone} />);

    fireEvent.click(screen.getAllByRole('button', { name: 'Clone template' })[0]!);
    expect(onClone).toHaveBeenCalledWith('starter-odometer-log');
  });

  it('shows catalog header with available count', () => {
    render(<OperatorChecklistStarterCatalog {...defaultProps} />);

    expect(screen.getByText('Starter Template Catalog')).toBeInTheDocument();
    expect(screen.getByText('2 available')).toBeInTheDocument();
    expect(screen.getByText('Clone a ready-made checklist to get started quickly.')).toBeInTheDocument();
  });

  it('collapses and expands the grid when the header is toggled', () => {
    render(<OperatorChecklistStarterCatalog {...defaultProps} />);

    expect(screen.getByText('Odometer Log')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Starter Template Catalog/i }));
    expect(screen.queryByText('Odometer Log')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Starter Template Catalog/i }));
    expect(screen.getByText('Odometer Log')).toBeInTheDocument();
  });

  it('persists collapse preference when toggled', () => {
    render(<OperatorChecklistStarterCatalog {...defaultProps} />);

    fireEvent.click(screen.getByRole('button', { name: /Starter Template Catalog/i }));
    expect(catalogPreferences.setStarterCatalogExpandedPreference).toHaveBeenCalledWith(
      'org-test-1',
      false,
    );
  });

  it('defaults to expanded when org has no templates and no stored preference', () => {
    vi.mocked(catalogPreferences.getStarterCatalogExpandedPreference).mockReturnValue(null);
    render(<OperatorChecklistStarterCatalog {...defaultProps} hasExistingTemplates={false} />);

    expect(screen.getByText('Odometer Log')).toBeInTheDocument();
  });

  it('defaults to collapsed when org already has templates and no stored preference', () => {
    vi.mocked(catalogPreferences.getStarterCatalogExpandedPreference).mockReturnValue(null);
    render(<OperatorChecklistStarterCatalog {...defaultProps} hasExistingTemplates />);

    expect(screen.queryByText('Odometer Log')).not.toBeInTheDocument();
  });

  it('shows Cloning… on the active starter button', () => {
    render(
      <OperatorChecklistStarterCatalog
        {...defaultProps}
        cloningStarterId="starter-odometer-log"
        isCloning
      />,
    );

    expect(screen.getByRole('button', { name: 'Cloning…' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Clone template' })).toBeInTheDocument();
  });
});
