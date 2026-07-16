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

function getHeaderByTitle(title: string): HTMLElement {
  const header = screen.getAllByRole('columnheader').find((h) => h.textContent?.includes(title));
  expect(header, `expected header "${title}" to render`).toBeDefined();
  return header!;
}

describe('EquipmentTable', () => {
  const onShowQRCode = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
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

  it('renders the Status column first with a slim sortable header', () => {
    const onSortChange = vi.fn();
    render(
      <EquipmentTable
        equipment={mockEquipment}
        onShowQRCode={onShowQRCode}
        sortConfig={{ field: 'status', direction: 'asc' }}
        onSortChange={onSortChange}
      />,
    );
    const headers = screen.getAllByRole('columnheader');
    const statusHeader = headers[0];
    expect(statusHeader.textContent).toMatch(/status/i);
    expect(statusHeader.querySelector('button')).not.toBeNull();
    expect(getHeaderByTitle('Name')).not.toBe(statusHeader);
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
    const nameHeader = getHeaderByTitle('Name');
    fireEvent.click(within(nameHeader).getByRole('button'));
    expect(onSortChange).toHaveBeenCalledWith('name', 'desc');
  });

  it('freezes the Status column with sticky left-0', () => {
    render(<EquipmentTable equipment={mockEquipment} onShowQRCode={onShowQRCode} />);
    const headers = screen.getAllByRole('columnheader');
    expect(headers[0].className).toContain('sticky');
    expect(headers[0].className).toContain('left-0');
  });

  it('renders column resize handles on resizable data columns', () => {
    const { container } = render(
      <EquipmentTable equipment={mockEquipment} onShowQRCode={onShowQRCode} />,
    );
    const resizeHandles = container.querySelectorAll('[data-slot="column-resize-handle"]');
    expect(resizeHandles.length).toBeGreaterThan(0);
    const statusHeader = screen.getAllByRole('columnheader')[0];
    expect(statusHeader.querySelector('[data-slot="column-resize-handle"]')).toBeNull();
  });

  it('renders the QR action button', () => {
    render(<EquipmentTable equipment={mockEquipment} onShowQRCode={onShowQRCode} />);
    const qrButton = screen.getByRole('button', { name: /show qr code for forklift a1/i });
    expect(qrButton).toBeInTheDocument();
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

  it('renders monospace serial column header', () => {
    render(<EquipmentTable equipment={mockEquipment} onShowQRCode={onShowQRCode} />);
    const serialHeader = getHeaderByTitle('Serial');
    expect(serialHeader.className).toContain('font-mono');
  });

  it('falls back to em-dash for missing team, missing hours, and missing last_maintenance', () => {
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
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(3);
  });

  it('renders the Working Hours column header and a formatted number value', () => {
    render(<EquipmentTable equipment={mockEquipment} onShowQRCode={onShowQRCode} />);
    const hoursHeader = getHeaderByTitle('Hours');
    expect(hoursHeader.className).toContain('font-mono');
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
    const sortableTitles = [
      'Status',
      'Name',
      'Manufacturer',
      'Model',
      'Serial #',
      'Hours',
      'Location',
      'Team',
      'Last Maintenance',
    ];
    for (const title of sortableTitles) {
      const header = getHeaderByTitle(title);
      expect(
        within(header).getAllByRole('button').length,
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
    expect(headerTexts.some((t) => t.includes('Status'))).toBe(true);
    expect(headerTexts.some((t) => t.includes('Name'))).toBe(true);
    expect(headerTexts.some((t) => t.includes('Manufacturer'))).toBe(false);
    expect(headerTexts.some((t) => t.includes('Last Maintenance'))).toBe(false);
  });
});
