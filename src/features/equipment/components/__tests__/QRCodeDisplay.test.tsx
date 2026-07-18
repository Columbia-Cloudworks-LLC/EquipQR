import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@/test/utils/test-utils';
import QRCodeDisplay from '../QRCodeDisplay';

// Mock QRCode library
vi.mock('qrcode', () => ({
  default: {
    toDataURL: vi.fn()
  }
}));

// Mock sonner
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn()
  }
}));

// Mock useIsMobile hook
vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: () => false
}));

// Operator check-in hooks — defaults mirror "no assignments" so legacy tests
// keep exercising the plain equipment QR path (#1179).
const mockUseAssignments = vi.fn();
const mockUseToken = vi.fn();
const mockUseRotateToken = vi.fn();
vi.mock('@/features/operator-check-ins/hooks/useOperatorCheckinSettings', () => ({
  useEquipmentOperatorCheckinAssignments: (...args: unknown[]) => mockUseAssignments(...args),
  useOperatorCheckinToken: (...args: unknown[]) => mockUseToken(...args),
  useRotateOperatorCheckinToken: (...args: unknown[]) => mockUseRotateToken(...args),
}));

const mockHasRole = vi.fn();
vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: () => ({ hasRole: mockHasRole }),
}));

beforeEach(() => {
  mockUseAssignments.mockReturnValue({ data: [], isLoading: false });
  mockUseToken.mockReturnValue({ data: null, isLoading: false });
  mockUseRotateToken.mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
  mockHasRole.mockReturnValue(false);
});

const mockQRCode = await import('qrcode');
const mockToast = await import('sonner');

describe('QRCodeDisplay', () => {
  const defaultProps = {
    open: true,
    onClose: vi.fn(),
    equipmentId: 'test-equipment-id',
    equipmentName: 'Test Equipment'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Sync-resolved promise keeps generation waits short (#1314)
    (mockQRCode.default.toDataURL as ReturnType<typeof vi.fn>).mockImplementation(() =>
      Promise.resolve('data:image/png;base64,mock-qr-code'),
    );
    
    // Mock window.location.origin
    Object.defineProperty(window, 'location', {
      value: { origin: 'https://test.com' },
      writable: true
    });

    // Mock navigator.clipboard
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: vi.fn().mockResolvedValue(undefined)
      },
      writable: true,
      configurable: true
    });
  });

  describe('Dialog Rendering', () => {
    it('renders when open is true', () => {
      render(<QRCodeDisplay {...defaultProps} />);
      expect(screen.getByText('Equipment QR Code')).toBeInTheDocument();
    });

    it('does not render when open is false', () => {
      render(<QRCodeDisplay {...defaultProps} open={false} />);
      expect(screen.queryByText('Equipment QR Code')).not.toBeInTheDocument();
    });

    it('calls onClose when dialog is closed', () => {
      const onClose = vi.fn();
      render(<QRCodeDisplay {...defaultProps} onClose={onClose} />);
      
      // Get all close buttons and click the footer one (not the X icon)
      const closeButtons = screen.getAllByRole('button', { name: 'Close' });
      fireEvent.click(closeButtons[closeButtons.length - 1]);
      
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('QR Code Generation', () => {
    it('generates QR code when dialog opens', async () => {
      render(<QRCodeDisplay {...defaultProps} />);
      
      await waitFor(() => {
        expect(mockQRCode.default.toDataURL).toHaveBeenCalledWith(
          'https://test.com/qr/equipment/test-equipment-id',
          expect.objectContaining({
            width: 256,
            margin: 2,
            color: {
              dark: '#000000',
              light: '#FFFFFF'
            }
          })
        );
      });
    });

    it('displays generated QR code image', async () => {
      render(<QRCodeDisplay {...defaultProps} />);
      
      const img = await screen.findByAltText('Equipment QR Code');
      expect(img).toHaveAttribute('src', 'data:image/png;base64,mock-qr-code');
    });

    it('shows loading state while generating QR code', () => {
      (mockQRCode.default.toDataURL as ReturnType<typeof vi.fn>).mockImplementation(() => new Promise(() => {})); // Never resolves
      
      render(<QRCodeDisplay {...defaultProps} />);
      
      expect(screen.getByText('Generating QR code...')).toBeInTheDocument();
    });

    it('handles QR code generation error', async () => {
      (mockQRCode.default.toDataURL as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Generation failed'));
      
      render(<QRCodeDisplay {...defaultProps} />);
      
      await waitFor(() => {
        expect(mockToast.toast.error).toHaveBeenCalledWith('Failed to generate QR code');
      });
    });
  });

  describe('QR Code URL Display', () => {
    it('displays the correct QR code URL', () => {
      render(<QRCodeDisplay {...defaultProps} />);
      
      expect(screen.getByText('https://test.com/qr/equipment/test-equipment-id')).toBeInTheDocument();
    });

    it('shows copy button for URL', () => {
      render(<QRCodeDisplay {...defaultProps} />);
      
      const copyButton = screen.getByRole('button', { name: 'Copy URL to clipboard' });
      expect(copyButton).toBeInTheDocument();
    });
  });

  describe('Copy Functionality', () => {
    it('copies URL to clipboard when copy button is clicked', async () => {
      render(<QRCodeDisplay {...defaultProps} />);
      
    const copyButton = screen.getByRole('button', { name: 'Copy URL to clipboard' });
      fireEvent.click(copyButton);
      
      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith('https://test.com/qr/equipment/test-equipment-id');
        expect(mockToast.toast.success).toHaveBeenCalledWith('QR code URL copied to clipboard');
      });
    });

    it('shows check icon after successful copy', async () => {
      render(<QRCodeDisplay {...defaultProps} />);
      
      const copyButton = screen.getByRole('button', { name: 'Copy URL to clipboard' });
      fireEvent.click(copyButton);
      
      await waitFor(() => {
        expect(screen.getByText('Copied')).toBeInTheDocument();
      });
    });

    it('shows Test link after successful copy that opens the URL', async () => {
      render(<QRCodeDisplay {...defaultProps} />);

      fireEvent.click(screen.getByRole('button', { name: 'Copy URL to clipboard' }));

      const testLink = await screen.findByRole('link', { name: 'Open URL in new tab' });
      expect(testLink).toHaveAttribute('href', 'https://test.com/qr/equipment/test-equipment-id');
      expect(testLink).toHaveAttribute('target', '_blank');
      expect(testLink).toHaveAttribute('rel', 'noopener noreferrer');
      expect(screen.getByText('Copied')).toBeInTheDocument();
    });

    it('handles copy error', async () => {
      (navigator.clipboard.writeText as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Copy failed'));
      
      render(<QRCodeDisplay {...defaultProps} />);
      
    const copyButton = screen.getByRole('button', { name: 'Copy URL to clipboard' });
      fireEvent.click(copyButton);
      
      await waitFor(() => {
        expect(mockToast.toast.error).toHaveBeenCalledWith('Failed to copy URL');
      });
    });
  });

  describe('Download Functionality', () => {
    beforeEach(() => {
      // Mock document.createElement to return a real element
      const originalCreateElement = document.createElement.bind(document);
      vi.spyOn(document, 'createElement').mockImplementation((tagName) => {
        if (tagName === 'a') {
          const link = originalCreateElement('a');
          link.click = vi.fn();
          return link;
        }
        return originalCreateElement(tagName);
      });
    });

    afterEach(() => {
      vi.mocked(document.createElement).mockRestore();
    });

    it('shows download format selector', () => {
      render(<QRCodeDisplay {...defaultProps} />);
      
      expect(screen.getByText('Download Format:')).toBeInTheDocument();
      const combobox = screen.getByRole('combobox');
      expect(combobox).toBeInTheDocument();
    });

    it('allows changing download format', async () => {
      render(<QRCodeDisplay {...defaultProps} />);
      
      const combobox = screen.getByRole('combobox');
      fireEvent.click(combobox);
      
      // Wait for the dropdown to appear and use within() to scope queries
      const listbox = await screen.findByRole('listbox');
      const jpgOption = within(listbox).getByRole('option', { name: 'JPG' });
      fireEvent.click(jpgOption);
      
      await waitFor(() => {
        expect(screen.getByText('test_equipment-qr.jpg')).toBeInTheDocument();
      });
    });

    it('downloads QR code when download button is clicked', async () => {
      render(<QRCodeDisplay {...defaultProps} />);
      
      // Wait for QR code to be generated and displayed
      await waitFor(() => {
        expect(screen.getByRole('img', { name: 'Equipment QR Code' })).toBeInTheDocument();
      });

      const downloadButton = screen.getByRole('button', { name: /download/i });
      fireEvent.click(downloadButton);
      
      await waitFor(() => {
        expect(mockQRCode.default.toDataURL).toHaveBeenCalledTimes(2); // Once for display, once for download
        expect(mockToast.toast.success).toHaveBeenCalledWith('QR code downloaded as PNG');
      });
    });

    it('shows correct filename preview', () => {
      render(<QRCodeDisplay {...defaultProps} />);
      
      expect(screen.getByText('test_equipment-qr.png')).toBeInTheDocument();
    });

    it('sanitizes equipment name for filename', () => {
      render(<QRCodeDisplay {...defaultProps} equipmentName="Test Equipment #1 @$%" />);
      
      expect(screen.getByText('test_equipment__1____-qr.png')).toBeInTheDocument();
    });

    it('handles download error', async () => {
      // Mock QR code generation to fail first, then succeed
      (mockQRCode.default.toDataURL as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce('data:image/png;base64,mock-qr-code') // For initial display
        .mockRejectedValueOnce(new Error('Download failed')); // For download attempt
      
      // Mock navigator.clipboard for this test
      Object.defineProperty(navigator, 'clipboard', {
        value: {
          writeText: vi.fn().mockResolvedValue(undefined)
        },
        writable: true,
        configurable: true
      });
      
      render(<QRCodeDisplay {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByRole('img', { name: 'Equipment QR Code' })).toBeInTheDocument();
      });

      const downloadButton = screen.getByRole('button', { name: /download/i });
      fireEvent.click(downloadButton);
      
      await waitFor(() => {
        expect(mockToast.toast.error).toHaveBeenCalledWith('Failed to download QR code');
      });
    });
  });

  describe('Instructions', () => {
    it('displays usage instructions', () => {
      render(<QRCodeDisplay {...defaultProps} />);
      
      expect(screen.getByText('How to use:')).toBeInTheDocument();
      expect(screen.getByText(/Copy the URL and paste it into your preferred QR app/)).toBeInTheDocument();
      expect(screen.getByText(/Or download the PNG\/JPG image and print it/)).toBeInTheDocument();
      expect(screen.getByText(/Print this QR code and attach it to the equipment/)).toBeInTheDocument();
      expect(screen.getByText(/Scans open this equipment's details and are logged automatically/)).toBeInTheDocument();
    });
  });

  describe('Daily check-in QR generation (#1179)', () => {
    const assignment = {
      id: 'assign-1',
      organization_id: 'org-1',
      equipment_id: 'test-equipment-id',
      template_id: 'tpl-1',
      enabled: true,
      public_token_hash: 'hash',
      token_rotated_at: '2026-07-06T00:00:00Z',
      token_rotated_by: null,
      created_at: '2026-07-06T00:00:00Z',
      updated_at: '2026-07-06T00:00:00Z',
      template: { id: 'tpl-1', name: 'Odometer Log', description: null },
    };

    const checkinProps = {
      ...defaultProps,
      organizationId: 'org-1',
      initialVariant: 'assignment:assign-1' as const,
    };

    beforeEach(() => {
      mockUseAssignments.mockReturnValue({ data: [assignment], isLoading: false });
      mockUseToken.mockReturnValue({ data: null, isLoading: false });
    });

    it('lets an owner/admin generate the QR link directly in the dialog', async () => {
      mockHasRole.mockReturnValue(true);
      const mutateAsync = vi.fn().mockResolvedValue('raw-token');
      mockUseRotateToken.mockReturnValue({ mutateAsync, isPending: false });

      render(<QRCodeDisplay {...checkinProps} />);

      const generateButton = screen.getByRole('button', { name: 'Generate QR link' });
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(mutateAsync).toHaveBeenCalledWith('assign-1');
        expect(mockToast.toast.success).toHaveBeenCalledWith(
          'QR link generated. Print or share the code below.',
        );
      });
    });

    it('surfaces an error toast when generation fails', async () => {
      mockHasRole.mockReturnValue(true);
      const mutateAsync = vi.fn().mockRejectedValue(new Error('Forbidden'));
      mockUseRotateToken.mockReturnValue({ mutateAsync, isPending: false });

      render(<QRCodeDisplay {...checkinProps} />);

      fireEvent.click(screen.getByRole('button', { name: 'Generate QR link' }));

      await waitFor(() => {
        expect(mockToast.toast.error).toHaveBeenCalledWith('Unable to generate QR link.');
      });
    });

    it('does not offer generation to members without the owner/admin role', () => {
      mockHasRole.mockReturnValue(false);

      render(<QRCodeDisplay {...checkinProps} />);

      expect(screen.queryByRole('button', { name: 'Generate QR link' })).not.toBeInTheDocument();
      expect(
        screen.getByText(/ask an organization owner or admin to generate a new link/i),
      ).toBeInTheDocument();
    });

    it('shows the operator check-in QR once a token is stored', () => {
      mockUseToken.mockReturnValue({ data: 'stored-raw-token', isLoading: false });

      render(<QRCodeDisplay {...checkinProps} />);

      expect(screen.queryByRole('button', { name: 'Generate QR link' })).not.toBeInTheDocument();
      expect(
        screen.getByText('https://test.com/qr/operator-check-in/stored-raw-token'),
      ).toBeInTheDocument();
    });
  });

  describe('Props Handling', () => {
    it('handles missing equipment name', () => {
      render(<QRCodeDisplay {...defaultProps} equipmentName={undefined} />);
      
      expect(screen.getByText('equipment-test-equipment-id-qr.png')).toBeInTheDocument();
    });

    it('generates URL with correct equipment ID', () => {
      render(<QRCodeDisplay {...defaultProps} equipmentId="different-id" />);
      
      expect(screen.getByText('https://test.com/qr/equipment/different-id')).toBeInTheDocument();
    });
  });
});