import React from 'react';
import { render, screen, fireEvent } from '@/test/utils/test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import QRScanner from '../QRScanner';

// Mock hooks
vi.mock('@/contexts/OrganizationContext', () => ({
  useOrganization: vi.fn(() => ({
    currentOrganization: { id: 'org-1', name: 'Test Org' }
  }))
}));

vi.mock('@/features/equipment/hooks/useEquipment', () => ({
  useEquipmentById: vi.fn(() => ({
    data: null,
    isLoading: false
  }))
}));

vi.mock('@/hooks/useInventory', () => ({
  useInventoryItem: vi.fn(() => ({
    data: null,
    isLoading: false
  }))
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: vi.fn(() => ({
    toast: vi.fn()
  }))
}));

// Mock supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(() => Promise.resolve({ data: { user: { id: 'user-1' } } }))
    },
    functions: {
      invoke: vi.fn()
    }
  }
}));

// Mock scanner component
vi.mock('@/components/scanner/QRScannerComponent', () => ({
  default: ({ onScan, isScanning }: { onScan: (result: string) => void; isScanning: boolean }) => (
    <div data-testid="qr-scanner-component">
      {isScanning ? 'Scanning...' : 'Scanner Ready'}
      <button onClick={() => onScan('test-qr-code')}>Simulate Scan</button>
    </div>
  )
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

describe('QRScanner Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Core Rendering', () => {
    it('renders page title', () => {
      render(<QRScanner />);

      expect(screen.getByText('QR Scanner')).toBeInTheDocument();
    });

    it('renders scan instructions', () => {
      render(<QRScanner />);

      expect(screen.getByText(/Scan a QR code to see equipment details/i)).toBeInTheDocument();
    });

    it('renders back button', () => {
      render(<QRScanner />);

      expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument();
    });

    it('navigates back when back button is clicked', () => {
      render(<QRScanner />);

      const backButton = screen.getByRole('button', { name: /back/i });
      fireEvent.click(backButton);

      // The button navigates somewhere (could be -1 or a specific route)
      expect(mockNavigate).toHaveBeenCalled();
    });
  });

  describe('Scanner Controls', () => {
    it('renders start scan button when not scanning', () => {
      render(<QRScanner />);

      expect(screen.getByRole('button', { name: /start scan/i })).toBeInTheDocument();
    });
  });
});

