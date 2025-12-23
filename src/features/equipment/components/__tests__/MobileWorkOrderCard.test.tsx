import React from 'react';
import { render, screen, fireEvent } from '@/test/utils/test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import MobileWorkOrderCard from '../MobileWorkOrderCard';

// Mock navigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate
  };
});

const mockWorkOrder = {
  id: 'wo-1',
  title: 'Test Work Order',
  status: 'open',
  created_date: '2024-01-15',
  due_date: '2024-01-20',
  equipment_id: 'eq-1'
};

describe('MobileWorkOrderCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Core Rendering', () => {
    it('renders work order title', () => {
      render(<MobileWorkOrderCard workOrder={mockWorkOrder} />);
      
      expect(screen.getByText('Test Work Order')).toBeInTheDocument();
    });

    it('displays work order status', () => {
      render(<MobileWorkOrderCard workOrder={mockWorkOrder} />);
      
      expect(screen.getByText('open')).toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    it('navigates to work order details when clicked', () => {
      render(<MobileWorkOrderCard workOrder={mockWorkOrder} />);
      
      const card = screen.getByText('Test Work Order').closest('div');
      if (card) {
        fireEvent.click(card);
        expect(mockNavigate).toHaveBeenCalled();
      }
    });
  });
});

