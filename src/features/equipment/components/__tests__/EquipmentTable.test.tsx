import React from 'react';
import { render, screen, fireEvent } from '@/test/utils/test-utils';
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

  it('renders DotStatus indicators with visible labels', () => {
    render(<EquipmentTable equipment={mockEquipment} onShowQRCode={onShowQRCode} />);
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Under Maintenance')).toBeInTheDocument();
  });

  it('renders the Name column as a sortable header button', () => {
    render(<EquipmentTable equipment={mockEquipment} onShowQRCode={onShowQRCode} />);
    const headers = screen.getAllByRole('columnheader');
    const nameHeader = headers[0];
    expect(nameHeader.textContent).toMatch(/name/i);
    expect(nameHeader.querySelector('button')).not.toBeNull();
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

  it('falls back to em-dash for missing team and missing last_maintenance', () => {
    render(<EquipmentTable equipment={mockEquipment} onShowQRCode={onShowQRCode} />);
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(2);
  });
});
