import React from 'react';
import { render, screen, fireEvent } from '@/test/utils/test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import MobileEquipmentHeader from '../MobileEquipmentHeader';
import { Tables } from '@/integrations/supabase/types';

type Equipment = Tables<'equipment'>;

// Mock navigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate
  };
});

const mockEquipment: Equipment = {
  id: 'eq-1',
  name: 'Test Equipment',
  manufacturer: 'Test Manufacturer',
  model: 'Test Model',
  serial_number: 'SN12345',
  location: 'Test Location',
  status: 'active',
  organization_id: 'org-1',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  last_maintenance: null,
  working_hours: null,
} as Equipment;

describe('MobileEquipmentHeader', () => {
  const mockOnShowQRCode = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Core Rendering', () => {
    it('renders mobile header', () => {
      render(
        <MobileEquipmentHeader 
          equipment={mockEquipment} 
          onShowQRCode={mockOnShowQRCode}
        />
      );
      
      expect(screen.getByText('Test Equipment')).toBeInTheDocument();
    });

    it('renders back button', () => {
      render(
        <MobileEquipmentHeader 
          equipment={mockEquipment} 
          onShowQRCode={mockOnShowQRCode}
        />
      );
      
      const backButton = screen.getByRole('button', { name: /back/i });
      expect(backButton).toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    it('navigates back when back button is clicked', () => {
      render(
        <MobileEquipmentHeader 
          equipment={mockEquipment} 
          onShowQRCode={mockOnShowQRCode}
        />
      );
      
      const backButton = screen.getByRole('button', { name: /back/i });
      fireEvent.click(backButton);
      
      expect(mockNavigate).toHaveBeenCalled();
    });
  });

  describe('Action Buttons', () => {
    it('renders QR code button', () => {
      render(
        <MobileEquipmentHeader 
          equipment={mockEquipment} 
          onShowQRCode={mockOnShowQRCode}
        />
      );
      
      // QR button is the second button (index 1) after the Back button
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThanOrEqual(2);
      // Verify QR button exists by checking it's not the Back button
      const qrButton = buttons.find(btn => !btn.textContent?.includes('Back'));
      expect(qrButton).toBeInTheDocument();
    });

    it('calls onShowQRCode when QR button is clicked', () => {
      render(
        <MobileEquipmentHeader 
          equipment={mockEquipment} 
          onShowQRCode={mockOnShowQRCode}
        />
      );
      
      // QR button is the second button (index 1) after the Back button
      const buttons = screen.getAllByRole('button');
      const qrButton = buttons[1]; // Second button is the QR code button
      fireEvent.click(qrButton);
      
      expect(mockOnShowQRCode).toHaveBeenCalled();
    });

    it('renders delete button when canDelete is true', () => {
      const mockOnDelete = vi.fn();
      render(
        <MobileEquipmentHeader 
          equipment={mockEquipment} 
          onShowQRCode={mockOnShowQRCode}
          canDelete={true}
          onDelete={mockOnDelete}
        />
      );
      
      // With delete enabled, there should be 3 buttons: Back, QR, Delete
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThanOrEqual(3);
      // Delete button is the third button (index 2)
      const deleteButton = buttons[2];
      expect(deleteButton).toBeInTheDocument();
    });
  });
});
