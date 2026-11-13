import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
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

  async function renderLoadedCoverImage(hoverCapable: boolean) {
    const { useHoverCapable } = await import('@/hooks/use-hover-capable');
    vi.mocked(useHoverCapable).mockReturnValue(hoverCapable);

    const { container } = render(
      <DynamicImageViewport src="https://example.com/photo.jpg" alt="Test photo" fit="cover" />,
    );

    const viewport = container.querySelector<HTMLElement>('.group\\/viewport');
    if (!viewport) throw new Error('viewport not rendered');
    vi.spyOn(viewport, 'getBoundingClientRect').mockReturnValue(DOMRect.fromRect({ width: 400, height: 300 }));

    // A wide panorama in a 4:3 cover viewport overflows horizontally, so it can be panned.
    const img = screen.getByAltText('Test photo');
    Object.defineProperty(img, 'naturalWidth', { configurable: true, value: 1600 });
    Object.defineProperty(img, 'naturalHeight', { configurable: true, value: 400 });
    fireEvent.load(img);

    return viewport;
  }

  it('applies touch-none for cover-fit pan on hover-capable devices', async () => {
    const viewport = await renderLoadedCoverImage(true);
    expect(viewport.className).toContain('touch-none');
  });

  it('does not apply touch-none on touch-first devices even when cover-fit pan would apply', async () => {
    const viewport = await renderLoadedCoverImage(false);
    expect(viewport.className).not.toContain('touch-none');
  });
});
