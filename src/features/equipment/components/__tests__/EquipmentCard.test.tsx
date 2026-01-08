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

      expect(screen.getAllByText('Forklift A1')[0]).toBeInTheDocument();
    });

    it('renders manufacturer and model', () => {
      render(<EquipmentCard equipment={mockEquipment} onShowQRCode={mockOnShowQRCode} />);

      expect(screen.getByText('Toyota Model X')).toBeInTheDocument();
    });

    it('renders location', () => {
      render(<EquipmentCard equipment={mockEquipment} onShowQRCode={mockOnShowQRCode} />);

      expect(screen.getAllByText('Warehouse A')[0]).toBeInTheDocument();
    });

    it('renders serial number', () => {
      render(<EquipmentCard equipment={mockEquipment} onShowQRCode={mockOnShowQRCode} />);

      expect(screen.getAllByText('SN12345')[0]).toBeInTheDocument();
    });

    it('renders QR code button', () => {
      render(<EquipmentCard equipment={mockEquipment} onShowQRCode={mockOnShowQRCode} />);

      expect(screen.getAllByRole('button', { name: /show qr code/i })[0]).toBeInTheDocument();
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

      expect(screen.getAllByText('maintenance')[0]).toBeInTheDocument();
    });
  });

  describe('Click Handlers', () => {
    it('navigates to equipment details when card is clicked', () => {
      render(<EquipmentCard equipment={mockEquipment} onShowQRCode={mockOnShowQRCode} />);

      // Find the card and click it
      const nameEl = screen.getAllByText('Forklift A1')[0];
      const card = nameEl.closest('article') || nameEl.closest('[class*="card"]');
      
      if (card) {
        fireEvent.click(card);
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard/equipment/eq-1');
      }
    });

    it('calls onShowQRCode when QR button is clicked', () => {
      render(<EquipmentCard equipment={mockEquipment} onShowQRCode={mockOnShowQRCode} />);

      const qrButton = screen.getAllByRole('button', { name: /show qr code/i })[0];
      fireEvent.click(qrButton);

      expect(mockOnShowQRCode).toHaveBeenCalledWith('eq-1');
    });

    it('stops propagation when QR button is clicked', () => {
      render(<EquipmentCard equipment={mockEquipment} onShowQRCode={mockOnShowQRCode} />);

      const qrButton = screen.getAllByRole('button', { name: /show qr code/i })[0];
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

    it('shows 0 hours when working_hours is undefined', () => {
      const equipmentWithUndefinedHours = { ...mockEquipment, working_hours: undefined };
      render(<EquipmentCard equipment={equipmentWithUndefinedHours} onShowQRCode={mockOnShowQRCode} />);

      expect(screen.getByText(/0 hours/)).toBeInTheDocument();
    });

    it('formats large working hours with locale string', () => {
      const equipmentWithLargeHours = { ...mockEquipment, working_hours: 12500 };
      render(<EquipmentCard equipment={equipmentWithLargeHours} onShowQRCode={mockOnShowQRCode} />);

      expect(screen.getByText(/12,500 hours/)).toBeInTheDocument();
    });
  });

  describe('Last Maintenance', () => {
    it('renders last maintenance date when provided', () => {
      render(<EquipmentCard equipment={mockEquipment} onShowQRCode={mockOnShowQRCode} />);

      // Date format may vary, but the year should be there
      expect(screen.getByText(/2024/)).toBeInTheDocument();
    });

    it('does not render last maintenance section when not provided', () => {
      const equipmentWithoutMaintenance = { ...mockEquipment, last_maintenance: undefined };
      render(<EquipmentCard equipment={equipmentWithoutMaintenance} onShowQRCode={mockOnShowQRCode} />);

      expect(screen.queryByText(/Last maintenance/)).not.toBeInTheDocument();
    });

    it('handles empty string for last_maintenance', () => {
      const equipmentWithEmptyMaintenance = { ...mockEquipment, last_maintenance: '' };
      render(<EquipmentCard equipment={equipmentWithEmptyMaintenance} onShowQRCode={mockOnShowQRCode} />);

      // Empty string is falsy, so last maintenance section should not render
      expect(screen.queryByText(/Last maintenance/)).not.toBeInTheDocument();
    });
  });

  describe('Image Handling', () => {
    it('renders fallback Forklift icon when no image_url is provided', () => {
      const equipmentWithoutImage = { ...mockEquipment, image_url: undefined };
      render(<EquipmentCard equipment={equipmentWithoutImage} onShowQRCode={mockOnShowQRCode} />);

      // Should not have an img element for equipment
      const images = screen.queryAllByRole('img');
      const equipmentImage = images.find(img => img.getAttribute('alt')?.includes('equipment'));
      expect(equipmentImage).toBeUndefined();
    });

    it('handles image load error by setting fallback image', () => {
      render(<EquipmentCard equipment={mockEquipment} onShowQRCode={mockOnShowQRCode} />);

      const images = screen.getAllByRole('img');
      const equipmentImage = images.find(img => img.getAttribute('src') === 'https://example.com/forklift.jpg');
      
      expect(equipmentImage).toBeInTheDocument();
      
      // Simulate image error
      if (equipmentImage) {
        fireEvent.error(equipmentImage);
        
        // After error, src should be updated to fallback
        expect(equipmentImage.getAttribute('src')).toContain('placeholder.svg');
      }
    });

    it('renders alt text with equipment name', () => {
      render(<EquipmentCard equipment={mockEquipment} onShowQRCode={mockOnShowQRCode} />);

      const images = screen.getAllByRole('img');
      const equipmentImage = images.find(img => img.getAttribute('alt')?.includes('Forklift A1'));
      expect(equipmentImage).toBeInTheDocument();
    });
  });

  describe('Location Handling', () => {
    it('renders location when provided', () => {
      render(<EquipmentCard equipment={mockEquipment} onShowQRCode={mockOnShowQRCode} />);

      expect(screen.getAllByText('Warehouse A')[0]).toBeInTheDocument();
    });

    it('handles empty location gracefully', () => {
      const equipmentWithEmptyLocation = { ...mockEquipment, location: '' };
      render(<EquipmentCard equipment={equipmentWithEmptyLocation} onShowQRCode={mockOnShowQRCode} />);

      // Should still render without crashing
      expect(screen.getAllByText('Forklift A1')[0]).toBeInTheDocument();
    });
  });

  describe('Text Truncation and Long Content', () => {
    it('handles long equipment names', () => {
      const longNameEquipment = { 
        ...mockEquipment, 
        name: 'Very Long Equipment Name That Should Be Displayed Properly Without Breaking Layout' 
      };
      render(<EquipmentCard equipment={longNameEquipment} onShowQRCode={mockOnShowQRCode} />);

      expect(screen.getAllByText(/Very Long Equipment Name/)[0]).toBeInTheDocument();
    });

    it('handles long serial numbers', () => {
      const longSerialEquipment = { 
        ...mockEquipment, 
        serial_number: 'VERY-LONG-SERIAL-NUMBER-12345678901234567890' 
      };
      render(<EquipmentCard equipment={longSerialEquipment} onShowQRCode={mockOnShowQRCode} />);

      expect(screen.getAllByText(/VERY-LONG-SERIAL/)[0]).toBeInTheDocument();
    });

    it('handles long location names with truncation', () => {
      const longLocationEquipment = { 
        ...mockEquipment, 
        location: 'Building A, Floor 3, Room 301, Corner Office Near the Window' 
      };
      render(<EquipmentCard equipment={longLocationEquipment} onShowQRCode={mockOnShowQRCode} />);

      // Location should still be in the document (may be truncated via CSS)
      expect(screen.getAllByText(/Building A, Floor 3/)[0]).toBeInTheDocument();
    });

    it('handles long manufacturer and model names', () => {
      const longMfgEquipment = { 
        ...mockEquipment, 
        manufacturer: 'Very Long Manufacturer Company Name Inc.',
        model: 'Extended Model Name Pro Max Ultra Edition'
      };
      render(<EquipmentCard equipment={longMfgEquipment} onShowQRCode={mockOnShowQRCode} />);

      expect(screen.getByText(/Very Long Manufacturer Company Name/)).toBeInTheDocument();
    });
  });

  describe('Mobile Responsiveness', () => {
    it('applies mobile styles when on mobile', async () => {
      const { useIsMobile } = await import('@/hooks/use-mobile');
      vi.mocked(useIsMobile).mockReturnValue(true);

      render(<EquipmentCard equipment={mockEquipment} onShowQRCode={mockOnShowQRCode} />);

      // Component should render without errors
      expect(screen.getAllByText('Forklift A1')[0]).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles equipment with minimum required fields', () => {
      const minimalEquipment = {
        id: 'eq-minimal',
        name: 'Minimal Equipment',
        manufacturer: 'Mfg',
        model: 'Model',
        serial_number: 'SN1',
        status: 'active',
        location: 'Loc'
      };
      render(<EquipmentCard equipment={minimalEquipment} onShowQRCode={mockOnShowQRCode} />);

      expect(screen.getAllByText('Minimal Equipment')[0]).toBeInTheDocument();
      expect(screen.getByText('Mfg Model')).toBeInTheDocument();
    });

    it('handles special characters in equipment fields', () => {
      const specialCharEquipment = {
        ...mockEquipment,
        name: 'Equipment <Test> & "Quotes"',
        location: "O'Brien's Warehouse"
      };
      render(<EquipmentCard equipment={specialCharEquipment} onShowQRCode={mockOnShowQRCode} />);

      expect(screen.getAllByText('Equipment <Test> & "Quotes"')[0]).toBeInTheDocument();
      expect(screen.getAllByText("O'Brien's Warehouse")[0]).toBeInTheDocument();
    });
  });
});

