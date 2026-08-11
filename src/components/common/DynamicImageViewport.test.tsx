import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import DynamicImageViewport from '@/components/common/DynamicImageViewport';

vi.mock('@/hooks/use-hover-capable', () => ({
  useHoverCapable: vi.fn(() => true),
}));

vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: vi.fn(() => false),
}));

describe('DynamicImageViewport', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const { useHoverCapable } = await import('@/hooks/use-hover-capable');
    const { useIsMobile } = await import('@/hooks/use-mobile');
    vi.mocked(useHoverCapable).mockReturnValue(true);
    vi.mocked(useIsMobile).mockReturnValue(false);
  });

  it('keeps export controls hover-gated on desktop hover-capable viewports', () => {
    render(
      <DynamicImageViewport src="https://example.com/photo.jpg" alt="Test photo" showControls />,
    );

    const controls = screen.getByLabelText('Download Test photo').closest('div');
    expect(controls?.className).toContain('opacity-0');
    expect(controls?.className).toContain('group-hover/viewport:opacity-100');
  });

  it('shows export controls always on mobile viewports', async () => {
    const { useIsMobile } = await import('@/hooks/use-mobile');
    vi.mocked(useIsMobile).mockReturnValue(true);

    render(
      <DynamicImageViewport src="https://example.com/photo.jpg" alt="Test photo" showControls />,
    );

    const controls = screen.getByLabelText('Download Test photo').closest('div');
    expect(controls?.className).toContain('opacity-100');
    expect(controls?.className).not.toContain('opacity-0');
  });

  it('does not apply touch-none on touch-first devices even when cover-fit pan would apply', async () => {
    const { useHoverCapable } = await import('@/hooks/use-hover-capable');
    vi.mocked(useHoverCapable).mockReturnValue(false);

    const { container } = render(
      <DynamicImageViewport src="https://example.com/photo.jpg" alt="Test photo" fit="cover" />,
    );

    const viewport = container.querySelector('.group\\/viewport');
    expect(viewport?.className).not.toContain('touch-none');
  });
});
