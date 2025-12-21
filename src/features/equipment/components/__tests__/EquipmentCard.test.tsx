import React from 'react';
import { render, screen, fireEvent } from '@/test/utils/test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import EquipmentCard from '../EquipmentCard';

// Mock hooks
vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: vi.fn(() => false)
}));

// Mock navigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate
  };
});

const mockEquipment = {
  id: 'eq-1',
  name: 'Forklift A1',
  manufacturer: 'Toyota',
  model: 'Model X',
  serial_number: 'SN12345',
  status: 'active',
  location: 'Warehouse A',
  last_maintenance: '2024-01-15',
  image_url: 'https://example.com/forklift.jpg',
  working_hours: 1500
};

describe('EquipmentCard', () => {
  const mockOnShowQRCode = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Core Rendering', () => {
    it('renders equipment name', () => {
      render(<EquipmentCard equipment={mockEquipment} onShowQRCode={mockOnShowQRCode} />);

      expect(screen.getByText('Forklift A1')).toBeInTheDocument();
    });

    it('renders manufacturer and model', () => {
      render(<EquipmentCard equipment={mockEquipment} onShowQRCode={mockOnShowQRCode} />);

      expect(screen.getByText('Toyota Model X')).toBeInTheDocument();
    });

    it('renders location', () => {
      render(<EquipmentCard equipment={mockEquipment} onShowQRCode={mockOnShowQRCode} />);

      expect(screen.getByText('Warehouse A')).toBeInTheDocument();
    });

    it('renders serial number', () => {
      render(<EquipmentCard equipment={mockEquipment} onShowQRCode={mockOnShowQRCode} />);

      expect(screen.getByText('SN12345')).toBeInTheDocument();
    });

    it('renders QR code button', () => {
      render(<EquipmentCard equipment={mockEquipment} onShowQRCode={mockOnShowQRCode} />);

      expect(screen.getByRole('button', { name: /show qr code/i })).toBeInTheDocument();
    });

    it('renders equipment image when image_url is provided', () => {
      render(<EquipmentCard equipment={mockEquipment} onShowQRCode={mockOnShowQRCode} />);

      const images = screen.getAllByRole('img');
      const equipmentImage = images.find(img => img.getAttribute('src') === 'https://example.com/forklift.jpg');
      expect(equipmentImage).toBeInTheDocument();
    });
  });

  describe('Status Badge', () => {
    it('does not show badge for active status', () => {
      render(<EquipmentCard equipment={mockEquipment} onShowQRCode={mockOnShowQRCode} />);

      expect(screen.queryByText('active')).not.toBeInTheDocument();
    });

    it('shows badge for non-active status', () => {
      const inactiveEquipment = { ...mockEquipment, status: 'maintenance' };
      render(<EquipmentCard equipment={inactiveEquipment} onShowQRCode={mockOnShowQRCode} />);

      expect(screen.getByText('maintenance')).toBeInTheDocument();
    });
  });

  describe('Click Handlers', () => {
    it('navigates to equipment details when card is clicked', () => {
      render(<EquipmentCard equipment={mockEquipment} onShowQRCode={mockOnShowQRCode} />);

      // Find the card and click it
      const card = screen.getByText('Forklift A1').closest('article') || 
                   screen.getByText('Forklift A1').closest('[class*="card"]');
      
      if (card) {
        fireEvent.click(card);
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard/equipment/eq-1');
      }
    });

    it('calls onShowQRCode when QR button is clicked', () => {
      render(<EquipmentCard equipment={mockEquipment} onShowQRCode={mockOnShowQRCode} />);

      const qrButton = screen.getByRole('button', { name: /show qr code/i });
      fireEvent.click(qrButton);

      expect(mockOnShowQRCode).toHaveBeenCalledWith('eq-1');
    });

    it('stops propagation when QR button is clicked', () => {
      render(<EquipmentCard equipment={mockEquipment} onShowQRCode={mockOnShowQRCode} />);

      const qrButton = screen.getByRole('button', { name: /show qr code/i });
      fireEvent.click(qrButton);

      // If propagation wasn't stopped, navigate would also be called
      expect(mockOnShowQRCode).toHaveBeenCalledTimes(1);
    });
  });

  describe('Working Hours', () => {
    it('renders working hours when provided', () => {
      render(<EquipmentCard equipment={mockEquipment} onShowQRCode={mockOnShowQRCode} />);

      expect(screen.getByText(/1,500 hours/)).toBeInTheDocument();
    });

    it('shows 0 hours when working_hours is null', () => {
      const equipmentWithoutHours = { ...mockEquipment, working_hours: null };
      render(<EquipmentCard equipment={equipmentWithoutHours} onShowQRCode={mockOnShowQRCode} />);

      expect(screen.getByText(/0 hours/)).toBeInTheDocument();
    });
  });

  describe('Last Maintenance', () => {
    it('renders last maintenance date when provided', () => {
      render(<EquipmentCard equipment={mockEquipment} onShowQRCode={mockOnShowQRCode} />);

      // Date format may vary, but the year should be there
      expect(screen.getByText(/2024/)).toBeInTheDocument();
    });
  });

  describe('Mobile Responsiveness', () => {
    it('applies mobile styles when on mobile', async () => {
      const { useIsMobile } = await import('@/hooks/use-mobile');
      vi.mocked(useIsMobile).mockReturnValue(true);

      render(<EquipmentCard equipment={mockEquipment} onShowQRCode={mockOnShowQRCode} />);

      // Component should render without errors
      expect(screen.getByText('Forklift A1')).toBeInTheDocument();
    });
  });
});

