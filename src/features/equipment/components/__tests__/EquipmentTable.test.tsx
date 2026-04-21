import React from 'react';
import { render, screen, fireEvent, within } from '@/test/utils/test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import EquipmentTable from '../EquipmentTable';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const mockEquipment = [
  {
    id: 'eq-1',
    name: 'Forklift A1',
    manufacturer: 'Toyota',
    model: 'Model X',
    serial_number: 'SN12345',
    status: 'active',
    location: 'Warehouse A',
    last_maintenance: '2026-01-15',
    team_name: 'Alpha',
    team_id: 'team-1',
    working_hours: 1234,
  },
  {
    id: 'eq-2',
    name: 'Excavator B2',
    manufacturer: 'Caterpillar',
    model: 'Model Y',
    serial_number: 'SN67890',
    status: 'maintenance',
    location: 'Warehouse B',
  },
];

describe('EquipmentTable', () => {
  const onShowQRCode = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders one row per equipment item with name and serial', () => {
    render(<EquipmentTable equipment={mockEquipment} onShowQRCode={onShowQRCode} />);
    expect(screen.getByText('Forklift A1')).toBeInTheDocument();
    expect(screen.getByText('Excavator B2')).toBeInTheDocument();
    expect(screen.getByText('SN12345')).toBeInTheDocument();
    expect(screen.getByText('SN67890')).toBeInTheDocument();
  });

  it('renders compact DotStatus with labels only for assistive tech', () => {
    render(<EquipmentTable equipment={mockEquipment} onShowQRCode={onShowQRCode} />);
    expect(screen.getByText('Active')).toHaveClass('sr-only');
    expect(screen.getByText('Under Maintenance')).toHaveClass('sr-only');
  });

  it('renders the Name column as a sortable header button', () => {
    const onSortChange = vi.fn();
    render(
      <EquipmentTable
        equipment={mockEquipment}
        onShowQRCode={onShowQRCode}
        sortConfig={{ field: 'name', direction: 'asc' }}
        onSortChange={onSortChange}
      />,
    );
    const headers = screen.getAllByRole('columnheader');
    const nameHeader = headers[0];
    expect(nameHeader.textContent).toMatch(/name/i);
    expect(nameHeader.querySelector('button')).not.toBeNull();
  });

  it('calls onSortChange when the Name header sort control is used', () => {
    const onSortChange = vi.fn();
    render(
      <EquipmentTable
        equipment={mockEquipment}
        onShowQRCode={onShowQRCode}
        sortConfig={{ field: 'name', direction: 'asc' }}
        onSortChange={onSortChange}
      />,
    );
    const nameHeader = screen.getAllByRole('columnheader')[0];
    fireEvent.click(within(nameHeader).getByRole('button'));
    expect(onSortChange).toHaveBeenCalledWith('name', 'desc');
  });

  it('freezes the first column with sticky left-0', () => {
    render(<EquipmentTable equipment={mockEquipment} onShowQRCode={onShowQRCode} />);
    const headers = screen.getAllByRole('columnheader');
    expect(headers[0].className).toContain('sticky');
    expect(headers[0].className).toContain('left-0');
  });

  it('renders a sticky table header', () => {
    const { container } = render(
      <EquipmentTable equipment={mockEquipment} onShowQRCode={onShowQRCode} />,
    );
    const thead = container.querySelector('thead');
    expect(thead).not.toBeNull();
    expect(thead!.className).toContain('sticky');
    expect(thead!.className).toContain('top-0');
  });

  it('uses compact density on body cells', () => {
    render(<EquipmentTable equipment={mockEquipment} onShowQRCode={onShowQRCode} />);
    const cells = screen.getAllByRole('cell');
    expect(cells[0].className).toContain('py-1.5');
    expect(cells[0].className).toContain('px-2');
  });

  it('renders the QR action button with a 44x44 invisible tap target', () => {
    render(<EquipmentTable equipment={mockEquipment} onShowQRCode={onShowQRCode} />);
    const qrButton = screen.getByRole('button', { name: /show qr code for forklift a1/i });
    expect(qrButton.className).toContain('min-h-11');
    expect(qrButton.className).toContain('min-w-11');
  });

  it('gives the Name navigation control a minimum 44px row height', () => {
    render(<EquipmentTable equipment={mockEquipment} onShowQRCode={onShowQRCode} />);
    const nameBtn = screen.getByRole('button', { name: 'Forklift A1' });
    expect(nameBtn.className).toContain('min-h-11');
    expect(nameBtn.className).toContain('w-full');
  });

  it('calls onShowQRCode when the QR action button is clicked', () => {
    render(<EquipmentTable equipment={mockEquipment} onShowQRCode={onShowQRCode} />);
    fireEvent.click(screen.getByRole('button', { name: /show qr code for forklift a1/i }));
    expect(onShowQRCode).toHaveBeenCalledWith('eq-1');
  });

  it('navigates to the equipment detail route when the name link is clicked', () => {
    render(<EquipmentTable equipment={mockEquipment} onShowQRCode={onShowQRCode} />);
    fireEvent.click(screen.getByRole('button', { name: 'Forklift A1' }));
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard/equipment/eq-1');
  });

  it('renders monospace serial column', () => {
    render(<EquipmentTable equipment={mockEquipment} onShowQRCode={onShowQRCode} />);
    const headers = screen.getAllByRole('columnheader');
    const serialHeader = headers.find((h) => h.textContent?.includes('Serial'));
    expect(serialHeader).toBeDefined();
    expect(serialHeader!.className).toContain('font-mono');
  });

  it('falls back to em-dash for missing team, missing hours, and missing last_maintenance', () => {
    // Last Maintenance is hidden by default in the new visibility map, so the
    // em-dash count for the second row is: missing team + missing hours = 2
    // (plus the visible Last Maintenance em-dash from the first row's
    // unprovided value if visibility were enabled — which it isn't).
    render(
      <EquipmentTable
        equipment={mockEquipment}
        onShowQRCode={onShowQRCode}
        visibleColumns={{
          name: true,
          status: true,
          manufacturer: true,
          model: true,
          serial_number: true,
          working_hours: true,
          location: true,
          team_name: true,
          last_maintenance: true,
        }}
      />,
    );
    // First row has all values; second row is missing team_id+team_name,
    // working_hours, and last_maintenance — three em-dashes.
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(3);
  });

  it('renders the Working Hours column header and a formatted number value', () => {
    render(<EquipmentTable equipment={mockEquipment} onShowQRCode={onShowQRCode} />);
    const headers = screen.getAllByRole('columnheader');
    const hoursHeader = headers.find((h) => h.textContent?.includes('Hours'));
    expect(hoursHeader).toBeDefined();
    expect(hoursHeader!.className).toContain('font-mono');
    expect(screen.getByText('1,234')).toBeInTheDocument();
  });

  it('renders Team as a clickable link to /dashboard/teams/{team_id} when team_id is present', () => {
    render(<EquipmentTable equipment={mockEquipment} onShowQRCode={onShowQRCode} />);
    const teamLink = screen.getByRole('link', { name: 'Alpha' });
    expect(teamLink).toHaveAttribute('href', '/dashboard/teams/team-1');
  });

  it('marks every data-bearing header as a sortable button', () => {
    render(
      <EquipmentTable
        equipment={mockEquipment}
        onShowQRCode={onShowQRCode}
        sortConfig={{ field: 'name', direction: 'asc' }}
        onSortChange={vi.fn()}
        visibleColumns={{
          name: true,
          status: true,
          manufacturer: true,
          model: true,
          serial_number: true,
          working_hours: true,
          location: true,
          team_name: true,
          last_maintenance: true,
        }}
      />,
    );
    const headers = screen.getAllByRole('columnheader');
    const sortableTitles = [
      'Name',
      'Status',
      'Manufacturer',
      'Model',
      'Serial #',
      'Hours',
      'Location',
      'Team',
      'Last Maintenance',
    ];
    for (const title of sortableTitles) {
      const header = headers.find((h) => h.textContent?.includes(title));
      expect(header, `expected header "${title}" to render`).toBeDefined();
      expect(
        within(header!).getAllByRole('button').length,
        `expected header "${title}" to contain a sortable button`,
      ).toBeGreaterThan(0);
    }
  });

  it('respects visibleColumns prop and hides columns set to false', () => {
    render(
      <EquipmentTable
        equipment={mockEquipment}
        onShowQRCode={onShowQRCode}
        visibleColumns={{
          name: true,
          status: false,
          manufacturer: false,
          model: true,
          serial_number: true,
          working_hours: true,
          location: true,
          team_name: true,
          last_maintenance: false,
        }}
      />,
    );
    const headers = screen.getAllByRole('columnheader');
    const headerTexts = headers.map((h) => h.textContent ?? '');
    expect(headerTexts.some((t) => t.includes('Name'))).toBe(true);
    expect(headerTexts.some((t) => t.includes('Status'))).toBe(false);
    expect(headerTexts.some((t) => t.includes('Manufacturer'))).toBe(false);
    expect(headerTexts.some((t) => t.includes('Last Maintenance'))).toBe(false);
  });
});
