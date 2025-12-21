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
    // Mock successful QR code generation by default
    (mockQRCode.default.toDataURL as ReturnType<typeof vi.fn>).mockResolvedValue('data:image/png;base64,mock-qr-code');
    
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

  afterEach(() => {
    vi.restoreAllMocks();
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
          'https://test.com/qr/test-equipment-id',
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
      
      await waitFor(() => {
        const img = screen.getByAltText('Equipment QR Code');
        expect(img).toBeInTheDocument();
        expect(img).toHaveAttribute('src', 'data:image/png;base64,mock-qr-code');
      });
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
      
      expect(screen.getByText('https://test.com/qr/test-equipment-id')).toBeInTheDocument();
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
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith('https://test.com/qr/test-equipment-id');
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
      expect(screen.getByText(/Print this QR code and attach it to the equipment/)).toBeInTheDocument();
      expect(screen.getByText(/Users can scan it with any QR code scanner/)).toBeInTheDocument();
      expect(screen.getByText(/Scans are automatically logged with location data/)).toBeInTheDocument();
    });
  });

  describe('Props Handling', () => {
    it('handles missing equipment name', () => {
      render(<QRCodeDisplay {...defaultProps} equipmentName={undefined} />);
      
      expect(screen.getByText('equipment-test-equipment-id-qr.png')).toBeInTheDocument();
    });

    it('generates URL with correct equipment ID', () => {
      render(<QRCodeDisplay {...defaultProps} equipmentId="different-id" />);
      
      expect(screen.getByText('https://test.com/qr/different-id')).toBeInTheDocument();
    });
  });
});