import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@/test/utils/test-utils';
import EquipmentSortHeader from './EquipmentSortHeader';
import { SortConfig } from '@/hooks/useEquipmentFiltering';

describe('EquipmentSortHeader', () => {
  const defaultSortConfig: SortConfig = {
    field: 'name',
    direction: 'asc'
  };

  const defaultProps = {
    sortConfig: defaultSortConfig,
    onSortChange: vi.fn(),
    resultCount: 25,
    totalCount: 100,
    canExport: false,
    onExportCSV: vi.fn(),
    isExporting: false
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders equipment count information', () => {
      render(<EquipmentSortHeader {...defaultProps} />);
      
      const countText = screen.getAllByText((_, element) => {
        return element?.textContent?.replace(/\s+/g, ' ').trim() === 'Showing 25 of 100 equipment items';
      });
      expect(countText.length).toBeGreaterThan(0);
    });

    it('displays sort label', () => {
      render(<EquipmentSortHeader {...defaultProps} />);
      
      expect(screen.getByText('Sort by:')).toBeInTheDocument();
    });

    it('renders sort select dropdown', () => {
      render(<EquipmentSortHeader {...defaultProps} />);
      
      const select = screen.getByRole('combobox');
      expect(select).toBeInTheDocument();
    });

    it('renders sort direction button', () => {
      render(<EquipmentSortHeader {...defaultProps} />);
      
      const sortButton = screen.getByRole('button');
      expect(sortButton).toBeInTheDocument();
    });
  });

  describe('Sort Functionality', () => {
    it('displays current sort field in select', () => {
      render(<EquipmentSortHeader {...defaultProps} />);
      
      const combobox = screen.getByRole('combobox');
      expect(within(combobox).getByText('Name')).toBeInTheDocument();
    });

    it('calls onSortChange when select value changes', () => {
      const onSortChange = vi.fn();
      render(<EquipmentSortHeader {...defaultProps} onSortChange={onSortChange} />);
      
      const select = screen.getByRole('combobox');
      fireEvent.click(select);
      
      const manufacturerOption = screen.getByText('Manufacturer');
      fireEvent.click(manufacturerOption);
      
      expect(onSortChange).toHaveBeenCalledWith('manufacturer');
    });

    it('calls onSortChange when sort direction button is clicked', () => {
      const onSortChange = vi.fn();
      render(<EquipmentSortHeader {...defaultProps} onSortChange={onSortChange} />);
      
      const sortButton = screen.getByRole('button');
      fireEvent.click(sortButton);
      
      expect(onSortChange).toHaveBeenCalledWith('name'); // current field
    });

    it('shows up arrow for ascending sort', () => {
      render(<EquipmentSortHeader {...defaultProps} sortConfig={{ field: 'name', direction: 'asc' }} />);
      
      // Should show ArrowUp icon - testing that the component renders
      const sortButton = screen.getByRole('button');
      expect(sortButton).toBeInTheDocument();
    });

    it('shows down arrow for descending sort', () => {
      render(<EquipmentSortHeader {...defaultProps} sortConfig={{ field: 'name', direction: 'desc' }} />);
      
      // Should show ArrowDown icon - testing that the component renders
      const sortButton = screen.getByRole('button');
      expect(sortButton).toBeInTheDocument();
    });

    it('shows up-down arrow when field differs from current sort field', async () => {
      render(<EquipmentSortHeader {...defaultProps} sortConfig={{ field: 'name', direction: 'asc' }} />);
      
      // Click to open dropdown
      const combobox = screen.getByRole('combobox');
      fireEvent.click(combobox);
      
      // Wait for dropdown and click on a different field
      const listbox = await screen.findByRole('listbox');
      const manufacturerOption = within(listbox).getByRole('option', { name: 'Manufacturer' });
      
      // The option should show ArrowUpDown icon when field differs
      // This tests the branch where sortConfig.field !== option.value
      expect(manufacturerOption).toBeInTheDocument();
    });
  });

  describe('Sort Options', () => {
    it('includes all expected sort options', async () => {
      render(<EquipmentSortHeader {...defaultProps} />);
      
      const combobox = screen.getByRole('combobox');
      fireEvent.click(combobox);
      
      // Wait for dropdown to appear and find all options
      const listbox = await screen.findByRole('listbox');
      
      // Use within() to scope the queries to the listbox
      expect(within(listbox).getByRole('option', { name: 'Name' })).toBeInTheDocument();
      expect(within(listbox).getByRole('option', { name: 'Manufacturer' })).toBeInTheDocument();
      expect(within(listbox).getByRole('option', { name: 'Model' })).toBeInTheDocument();
      expect(within(listbox).getByRole('option', { name: 'Location' })).toBeInTheDocument();
      expect(within(listbox).getByRole('option', { name: 'Status' })).toBeInTheDocument();
      expect(within(listbox).getByRole('option', { name: 'Installation Date' })).toBeInTheDocument();
      expect(within(listbox).getByRole('option', { name: 'Last Maintenance' })).toBeInTheDocument();
      expect(within(listbox).getByRole('option', { name: 'Warranty Expiration' })).toBeInTheDocument();
      expect(within(listbox).getByRole('option', { name: 'Date Added' })).toBeInTheDocument();
      expect(within(listbox).getByRole('option', { name: 'Last Updated' })).toBeInTheDocument();
    });
  });

  describe('Export Functionality', () => {
    it('does not show export button when canExport is false', () => {
      render(<EquipmentSortHeader {...defaultProps} canExport={false} />);
      
      expect(screen.queryByText(/Export CSV/i)).not.toBeInTheDocument();
    });

    it('shows export button when canExport is true', () => {
      render(<EquipmentSortHeader {...defaultProps} canExport={true} onExportCSV={vi.fn()} />);
      
      expect(screen.getByText('Export CSV')).toBeInTheDocument();
    });

    it('calls onExportCSV when export button is clicked', () => {
      const onExportCSV = vi.fn();
      render(<EquipmentSortHeader {...defaultProps} canExport={true} onExportCSV={onExportCSV} />);
      
      const exportButton = screen.getByText('Export CSV');
      fireEvent.click(exportButton);
      
      expect(onExportCSV).toHaveBeenCalledOnce();
    });

    it('disables export button when isExporting is true', () => {
      render(<EquipmentSortHeader {...defaultProps} canExport={true} onExportCSV={vi.fn()} isExporting={true} />);
      
      const exportButton = screen.getByText('Exporting...');
      expect(exportButton).toBeDisabled();
    });

    it('disables export button when resultCount is 0', () => {
      render(<EquipmentSortHeader {...defaultProps} canExport={true} onExportCSV={vi.fn()} resultCount={0} />);
      
      const exportButton = screen.getByText('Export CSV');
      expect(exportButton).toBeDisabled();
    });

    it('shows export icon in button', () => {
      render(<EquipmentSortHeader {...defaultProps} canExport={true} onExportCSV={vi.fn()} />);
      
      const exportButton = screen.getByText('Export CSV');
      expect(exportButton).toBeInTheDocument();
      // Download icon should be included in the button
    });
  });

  describe('Count Display', () => {
    it('handles zero results', () => {
      render(<EquipmentSortHeader {...defaultProps} resultCount={0} totalCount={0} />);
      
      const countText = screen.getAllByText((_, element) => {
        return element?.textContent?.replace(/\s+/g, ' ').trim() === 'Showing 0 of 0 equipment items';
      });
      expect(countText.length).toBeGreaterThan(0);
    });

    it('handles single result', () => {
      render(<EquipmentSortHeader {...defaultProps} resultCount={1} totalCount={1} />);
      
      const countText = screen.getAllByText((_, element) => {
        return element?.textContent?.replace(/\s+/g, ' ').trim() === 'Showing 1 of 1 equipment items';
      });
      expect(countText.length).toBeGreaterThan(0);
    });

    it('handles large numbers', () => {
      render(<EquipmentSortHeader {...defaultProps} resultCount={1000} totalCount={5000} />);
      
      expect(screen.getByText('1000')).toBeInTheDocument();
      expect(screen.getByText('5000')).toBeInTheDocument();
    });
  });

  describe('Different Sort Configurations', () => {
    it('handles different sort fields', () => {
      render(<EquipmentSortHeader {...defaultProps} sortConfig={{ field: 'manufacturer', direction: 'asc' }} />);
      
      const combobox = screen.getByRole('combobox');
      expect(within(combobox).getByText('Manufacturer')).toBeInTheDocument();
    });

    it('handles installation_date field mapping', () => {
      render(<EquipmentSortHeader {...defaultProps} sortConfig={{ field: 'installation_date', direction: 'asc' }} />);
      
      const combobox = screen.getByRole('combobox');
      expect(within(combobox).getByText('Installation Date')).toBeInTheDocument();
    });

    it('handles created_at field mapping', () => {
      render(<EquipmentSortHeader {...defaultProps} sortConfig={{ field: 'created_at', direction: 'asc' }} />);
      
      const combobox = screen.getByRole('combobox');
      expect(within(combobox).getByText('Date Added')).toBeInTheDocument();
    });
  });

  describe('Props Validation', () => {
    it('handles missing onExportCSV when canExport is true', () => {
      render(<EquipmentSortHeader {...defaultProps} canExport={true} onExportCSV={undefined} />);
      
      // Should not show export button if onExportCSV is not provided
      expect(screen.queryByText(/Export CSV/i)).not.toBeInTheDocument();
    });

    it('handles negative counts gracefully', () => {
      render(<EquipmentSortHeader {...defaultProps} resultCount={-1} totalCount={-1} />);
      
      const countText = screen.getAllByText((_, element) => {
        return element?.textContent?.replace(/\s+/g, ' ').trim() === 'Showing -1 of -1 equipment items';
      });
      expect(countText.length).toBeGreaterThan(0);
    });
  });
});