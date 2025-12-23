import React from 'react';
import { render, screen, fireEvent } from '@/test/utils/test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import MobileEquipmentHeader from '../MobileEquipmentHeader';

// Mock navigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate
  };
});

describe('MobileEquipmentHeader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Core Rendering', () => {
    it('renders mobile header', () => {
      render(<MobileEquipmentHeader equipmentId="eq-1" equipmentName="Test Equipment" />);
      
      expect(screen.getByText('Test Equipment')).toBeInTheDocument();
    });

    it('renders back button', () => {
      render(<MobileEquipmentHeader equipmentId="eq-1" equipmentName="Test Equipment" />);
      
      const backButton = screen.getByRole('button', { name: /back/i });
      expect(backButton).toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    it('navigates back when back button is clicked', () => {
      render(<MobileEquipmentHeader equipmentId="eq-1" equipmentName="Test Equipment" />);
      
      const backButton = screen.getByRole('button', { name: /back/i });
      fireEvent.click(backButton);
      
      expect(mockNavigate).toHaveBeenCalled();
    });
  });

  describe('Action Buttons', () => {
    it('renders action buttons when provided', () => {
      const mockActions = <button>Action</button>;
      
      render(
        <MobileEquipmentHeader 
          equipmentId="eq-1" 
          equipmentName="Test Equipment"
          actions={mockActions}
        />
      );
      
      expect(screen.getByText('Action')).toBeInTheDocument();
    });
  });
});

