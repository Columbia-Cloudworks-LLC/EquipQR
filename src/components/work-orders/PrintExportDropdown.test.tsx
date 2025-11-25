import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PrintExportDropdown from './PrintExportDropdown';
import { useIsMobile } from '@/hooks/use-mobile';

// Mock the useIsMobile hook
vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: vi.fn()
}));

const mockUseIsMobile = vi.mocked(useIsMobile);

describe('PrintExportDropdown', () => {
  const mockOnDownloadPDF = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseIsMobile.mockReturnValue(false);
  });

  it('should render with desktop size by default', () => {
    mockUseIsMobile.mockReturnValue(false);

    render(<PrintExportDropdown onDownloadPDF={mockOnDownloadPDF} />);
    
    const button = screen.getByRole('button', { name: /download pdf/i });
    expect(button).toBeInTheDocument();
    expect(button).not.toBeDisabled();
  });

  it('should render with mobile size when isMobile is true', () => {
    mockUseIsMobile.mockReturnValue(true);

    render(<PrintExportDropdown onDownloadPDF={mockOnDownloadPDF} />);
    
    const button = screen.getByRole('button', { name: /download pdf/i });
    expect(button).toBeInTheDocument();
    expect(button).not.toBeDisabled();
  });

  it('should call onDownloadPDF when button is clicked', () => {
    render(<PrintExportDropdown onDownloadPDF={mockOnDownloadPDF} />);
    
    const button = screen.getByRole('button', { name: /download pdf/i });
    fireEvent.click(button);
    
    expect(mockOnDownloadPDF).toHaveBeenCalledTimes(1);
  });

  it('should be disabled when disabled prop is true', () => {
    render(<PrintExportDropdown onDownloadPDF={mockOnDownloadPDF} disabled />);
    
    const button = screen.getByRole('button', { name: /download pdf/i });
    expect(button).toBeDisabled();
  });

  it('should show download icon', () => {
    render(<PrintExportDropdown onDownloadPDF={mockOnDownloadPDF} />);
    
    // The Download icon should be present (as SVG)
    const button = screen.getByRole('button');
    const svg = button.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });
});

