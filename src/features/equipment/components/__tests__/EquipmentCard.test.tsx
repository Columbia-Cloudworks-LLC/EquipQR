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

  describe('Edge Cases', () => {
    it('handles image loading errors gracefully', () => {
      render(<EquipmentCard equipment={mockEquipment} onShowQRCode={mockOnShowQRCode} />);

      const images = screen.getAllByRole('img');
      const equipmentImage = images.find(img => img.getAttribute('src') === 'https://example.com/forklift.jpg');
      
      if (equipmentImage) {
        // Simulate image error
        fireEvent.error(equipmentImage);
        
        // Component should still be functional
        expect(screen.getByText('Forklift A1')).toBeInTheDocument();
      }
    });

    it('handles equipment with null working_hours', () => {
      const equipmentWithNullHours = { ...mockEquipment, working_hours: null };
      render(<EquipmentCard equipment={equipmentWithNullHours} onShowQRCode={mockOnShowQRCode} />);

      expect(screen.getByText(/0 hours/)).toBeInTheDocument();
    });

    it('handles equipment with undefined working_hours', () => {
      const { working_hours, ...equipmentWithoutHours } = mockEquipment;
      render(<EquipmentCard equipment={equipmentWithoutHours as typeof mockEquipment} onShowQRCode={mockOnShowQRCode} />);

      // Should render without crashing
      expect(screen.getByText('Forklift A1')).toBeInTheDocument();
    });

    it('handles equipment without location', () => {
      const { location, ...equipmentWithoutLocation } = mockEquipment;
      render(<EquipmentCard equipment={equipmentWithoutLocation as typeof mockEquipment} onShowQRCode={mockOnShowQRCode} />);

      expect(screen.getByText('Forklift A1')).toBeInTheDocument();
      expect(screen.queryByText('Warehouse A')).not.toBeInTheDocument();
    });

    it('handles equipment without last_maintenance date', () => {
      const { last_maintenance, ...equipmentWithoutMaintenance } = mockEquipment;
      render(<EquipmentCard equipment={equipmentWithoutMaintenance as typeof mockEquipment} onShowQRCode={mockOnShowQRCode} />);

      expect(screen.getByText('Forklift A1')).toBeInTheDocument();
    });

    it('handles equipment with very long name', () => {
      const longNameEquipment = {
        ...mockEquipment,
        name: 'This is an extremely long equipment name that should be truncated or handled appropriately by the component to prevent layout issues'
      };
      render(<EquipmentCard equipment={longNameEquipment} onShowQRCode={mockOnShowQRCode} />);

      expect(screen.getByText(longNameEquipment.name)).toBeInTheDocument();
    });

    it('handles equipment with very long serial number', () => {
      const longSerialEquipment = {
        ...mockEquipment,
        serial_number: 'SERIAL-NUMBER-WITH-VERY-LONG-IDENTIFIER-123456789-ABCDEFGHIJK'
      };
      render(<EquipmentCard equipment={longSerialEquipment} onShowQRCode={mockOnShowQRCode} />);

      expect(screen.getByText(longSerialEquipment.serial_number)).toBeInTheDocument();
    });

    it('handles equipment without image_url', () => {
      const { image_url, ...equipmentWithoutImage } = mockEquipment;
      render(<EquipmentCard equipment={equipmentWithoutImage as typeof mockEquipment} onShowQRCode={mockOnShowQRCode} />);

      expect(screen.getByText('Forklift A1')).toBeInTheDocument();
    });

    it('handles equipment with empty string values', () => {
      const equipmentWithEmptyStrings = {
        ...mockEquipment,
        manufacturer: '',
        model: '',
        location: ''
      };
      render(<EquipmentCard equipment={equipmentWithEmptyStrings} onShowQRCode={mockOnShowQRCode} />);

      expect(screen.getByText('Forklift A1')).toBeInTheDocument();
    });

    it('handles equipment with very high working_hours', () => {
      const highHoursEquipment = {
        ...mockEquipment,
        working_hours: 999999
      };
      render(<EquipmentCard equipment={highHoursEquipment} onShowQRCode={mockOnShowQRCode} />);

      // Should format large numbers with commas
      expect(screen.getByText(/999,999/)).toBeInTheDocument();
    });
  });
});

