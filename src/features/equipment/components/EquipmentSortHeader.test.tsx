import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@/test/utils/test-utils';
import EquipmentSortHeader from './EquipmentSortHeader';
import { SortConfig } from '@/features/equipment/hooks/useEquipmentFiltering';

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
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders equipment count information', () => {
      render(<EquipmentSortHeader {...defaultProps} />);
      
      const countText = screen.getAllByText((_, element) => {
        return element?.textContent?.replace(/\s+/g, ' ').trim() === 'Showing 25 of 100 equipment';
      });
      expect(countText.length).toBeGreaterThan(0);
    });

    it('renders a single sort select dropdown', () => {
      render(<EquipmentSortHeader {...defaultProps} />);
      
      const select = screen.getByRole('combobox');
      expect(select).toBeInTheDocument();
    });
  });

  describe('Sort Functionality', () => {
    it('displays current composite sort label', () => {
      render(<EquipmentSortHeader {...defaultProps} />);
      
      const combobox = screen.getByRole('combobox');
      expect(within(combobox).getByText('Name (A\u2013Z)')).toBeInTheDocument();
    });

    it('calls onSortChange with field and direction when option is selected', () => {
      const onSortChange = vi.fn();
      render(<EquipmentSortHeader {...defaultProps} onSortChange={onSortChange} />);
      
      const select = screen.getByRole('combobox');
      fireEvent.click(select);
      
      const option = screen.getByText('Hours (High\u2013Low)');
      fireEvent.click(option);
      
      expect(onSortChange).toHaveBeenCalledWith('working_hours', 'desc');
    });

    it('calls onSortChange with correct direction for descending option', () => {
      const onSortChange = vi.fn();
      render(<EquipmentSortHeader {...defaultProps} onSortChange={onSortChange} />);
      
      const select = screen.getByRole('combobox');
      fireEvent.click(select);
      
      const option = screen.getByText('Name (Z\u2013A)');
      fireEvent.click(option);
      
      expect(onSortChange).toHaveBeenCalledWith('name', 'desc');
    });
  });

  describe('Sort Options', () => {
    it('includes all expected composite sort options', async () => {
      render(<EquipmentSortHeader {...defaultProps} />);
      
      const combobox = screen.getByRole('combobox');
      fireEvent.click(combobox);
      
      const listbox = await screen.findByRole('listbox');
      
      expect(within(listbox).getByRole('option', { name: 'Name (A\u2013Z)' })).toBeInTheDocument();
      expect(within(listbox).getByRole('option', { name: 'Name (Z\u2013A)' })).toBeInTheDocument();
      expect(within(listbox).getByRole('option', { name: 'Hours (High\u2013Low)' })).toBeInTheDocument();
      expect(within(listbox).getByRole('option', { name: 'Hours (Low\u2013High)' })).toBeInTheDocument();
      expect(within(listbox).getByRole('option', { name: 'Last Maintenance' })).toBeInTheDocument();
      expect(within(listbox).getByRole('option', { name: 'Last Updated' })).toBeInTheDocument();
      expect(within(listbox).getByRole('option', { name: 'Status' })).toBeInTheDocument();
      expect(within(listbox).getByRole('option', { name: 'Location (A\u2013Z)' })).toBeInTheDocument();
      expect(within(listbox).getByRole('option', { name: 'Manufacturer (A\u2013Z)' })).toBeInTheDocument();
      expect(within(listbox).getByRole('option', { name: 'Recently Added' })).toBeInTheDocument();
      expect(within(listbox).getByRole('option', { name: 'Warranty Expiration' })).toBeInTheDocument();
    });
  });

  describe('Count Display', () => {
    it('handles zero results', () => {
      render(<EquipmentSortHeader {...defaultProps} resultCount={0} totalCount={0} />);
      
      const countText = screen.getAllByText((_, element) => {
        return element?.textContent?.replace(/\s+/g, ' ').trim() === 'Showing 0 of 0 equipment';
      });
      expect(countText.length).toBeGreaterThan(0);
    });

    it('handles single result', () => {
      render(<EquipmentSortHeader {...defaultProps} resultCount={1} totalCount={1} />);
      
      const countText = screen.getAllByText((_, element) => {
        return element?.textContent?.replace(/\s+/g, ' ').trim() === 'Showing 1 of 1 equipment';
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
    it('shows correct label for descending name sort', () => {
      render(<EquipmentSortHeader {...defaultProps} sortConfig={{ field: 'name', direction: 'desc' }} />);
      
      const combobox = screen.getByRole('combobox');
      expect(within(combobox).getByText('Name (Z\u2013A)')).toBeInTheDocument();
    });

    it('shows correct label for hours sort', () => {
      render(<EquipmentSortHeader {...defaultProps} sortConfig={{ field: 'working_hours', direction: 'desc' }} />);
      
      const combobox = screen.getByRole('combobox');
      expect(within(combobox).getByText('Hours (High\u2013Low)')).toBeInTheDocument();
    });

    it('shows correct label for recently added sort', () => {
      render(<EquipmentSortHeader {...defaultProps} sortConfig={{ field: 'created_at', direction: 'desc' }} />);
      
      const combobox = screen.getByRole('combobox');
      expect(within(combobox).getByText('Recently Added')).toBeInTheDocument();
    });
  });
});
