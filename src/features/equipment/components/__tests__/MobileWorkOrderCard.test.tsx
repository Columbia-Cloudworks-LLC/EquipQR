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
  description: 'Test description',
  status: 'submitted' as const,
  priority: 'medium' as const,
  equipment_id: 'eq-1',
  organization_id: 'org-1',
  created_by: 'user-1',
  created_date: '2024-01-15',
  due_date: '2024-01-20',
  updated_at: '2024-01-15T00:00:00Z',
  has_pm: false,
  is_historical: false,
  pm_required: false,
  acceptance_date: null,
  assignee_id: null,
  assignee_name: null,
  assigneeName: undefined,
  team_id: null,
  teamName: undefined,
  created_by_admin: null,
  created_by_name: null,
  completed_date: null,
  estimated_hours: null,
  historical_notes: null,
  historical_start_date: null
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
      
      expect(screen.getByText('Submitted')).toBeInTheDocument();
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
