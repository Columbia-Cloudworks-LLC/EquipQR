import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

// Mock the reduced-motion hook so each test can flip its return value.
const mockUsePrefersReducedMotion = vi.fn<() => boolean>();
vi.mock('@/hooks/use-prefers-reduced-motion', () => ({
  usePrefersReducedMotion: () => mockUsePrefersReducedMotion(),
}));

import { DemoVideo } from './DemoVideo';

const buildUrl = (filename: string) => `https://test.example/landing-page-videos/${filename}`;

const mediaProto = window.HTMLMediaElement.prototype;
const originalPlayDescriptor = Object.getOwnPropertyDescriptor(mediaProto, 'play');
const originalPauseDescriptor = Object.getOwnPropertyDescriptor(mediaProto, 'pause');
const originalReadyStateDescriptor = Object.getOwnPropertyDescriptor(mediaProto, 'readyState');
const originalCurrentTimeDescriptor = Object.getOwnPropertyDescriptor(mediaProto, 'currentTime');

describe('DemoVideo', () => {
  beforeEach(() => {
    cleanup();
    mockUsePrefersReducedMotion.mockReset();
    mockUsePrefersReducedMotion.mockReturnValue(false);

    // jsdom does not implement HTMLMediaElement.play; stub it so the
    // autoplay effect does not throw.
    Object.defineProperty(mediaProto, 'play', {
      configurable: true,
      writable: true,
      value: vi.fn().mockResolvedValue(undefined),
    });
    Object.defineProperty(mediaProto, 'pause', {
      configurable: true,
      writable: true,
      value: vi.fn(),
    });
  });

  afterEach(() => {
    if (originalPlayDescriptor) {
      Object.defineProperty(mediaProto, 'play', originalPlayDescriptor);
    } else {
      delete (mediaProto as unknown as Record<string, unknown>).play;
    }
    if (originalPauseDescriptor) {
      Object.defineProperty(mediaProto, 'pause', originalPauseDescriptor);
    } else {
      delete (mediaProto as unknown as Record<string, unknown>).pause;
    }
    if (originalReadyStateDescriptor) {
      Object.defineProperty(mediaProto, 'readyState', originalReadyStateDescriptor);
    } else {
      delete (mediaProto as unknown as Record<string, unknown>).readyState;
    }
    if (originalCurrentTimeDescriptor) {
      Object.defineProperty(mediaProto, 'currentTime', originalCurrentTimeDescriptor);
    } else {
      delete (mediaProto as unknown as Record<string, unknown>).currentTime;
    }
  });

  it('renders a <video> with WebM and MP4 sources and a poster image', () => {
    const { container } = render(
      <DemoVideo baseName="mobile_create_pm" buildUrl={buildUrl} alt="Create a PM template demo" />,
    );

    const video = container.querySelector('video');
    expect(video).not.toBeNull();
    expect(video?.getAttribute('poster')).toBe(
      'https://test.example/landing-page-videos/mobile_create_pm.jpg',
    );

    const sources = container.querySelectorAll('video > source');
    expect(sources).toHaveLength(2);
    // WebM listed first so VP9-capable browsers pick the smaller payload.
    expect(sources[0].getAttribute('type')).toBe('video/webm');
    expect(sources[0].getAttribute('src')).toBe(
      'https://test.example/landing-page-videos/mobile_create_pm.webm',
    );
    expect(sources[1].getAttribute('type')).toBe('video/mp4');
    expect(sources[1].getAttribute('src')).toBe(
      'https://test.example/landing-page-videos/mobile_create_pm.mp4',
    );
  });

  it('exposes the alt text as an accessible label on the video', () => {
    render(
      <DemoVideo
        baseName="mobile_export_to_quickbooks"
        buildUrl={buildUrl}
        alt="Export work order to QuickBooks demo"
      />,
    );

    expect(
      screen.getByLabelText(/Export work order to QuickBooks demo/i),
    ).toBeInTheDocument();
  });

  it('autoplays muted and inline when reduced-motion is off', () => {
    const { container } = render(
      <DemoVideo baseName="demo" buildUrl={buildUrl} alt="demo" />,
    );

    const video = container.querySelector('video');
    expect(video?.autoplay).toBe(true);
    expect(video?.muted).toBe(true);
    expect(video?.loop).toBe(true);
    expect(video?.hasAttribute('playsinline')).toBe(true);
    expect(video?.controls).toBe(true);
  });

  it('disables autoplay and shows controls when reduced-motion is on', () => {
    mockUsePrefersReducedMotion.mockReturnValue(true);

    const { container } = render(
      <DemoVideo baseName="demo" buildUrl={buildUrl} alt="demo" />,
    );

    const video = container.querySelector('video');
    expect(video?.autoplay).toBe(false);
    expect(video?.controls).toBe(true);
    // Still muted/loop so a manual play stays silent and repeats.
    expect(video?.muted).toBe(true);
    expect(video?.loop).toBe(true);
  });

  it('does not throw when resetting playback before metadata loads under reduced-motion', () => {
    mockUsePrefersReducedMotion.mockReturnValue(true);

    Object.defineProperty(mediaProto, 'readyState', {
      configurable: true,
      get: () => 0,
    });
    Object.defineProperty(mediaProto, 'currentTime', {
      configurable: true,
      get: () => 0,
      set: () => {
        throw new DOMException('InvalidStateError');
      },
    });

    expect(() => {
      render(<DemoVideo baseName="demo" buildUrl={buildUrl} alt="demo" />);
    }).not.toThrow();

    expect(mediaProto.pause).toHaveBeenCalled();
  });

  it('resets playback to the start when metadata is already loaded under reduced-motion', () => {
    mockUsePrefersReducedMotion.mockReturnValue(true);

    let currentTime = 12;
    Object.defineProperty(mediaProto, 'readyState', {
      configurable: true,
      get: () => HTMLMediaElement.HAVE_METADATA,
    });
    Object.defineProperty(mediaProto, 'currentTime', {
      configurable: true,
      get: () => currentTime,
      set: (value: number) => {
        currentTime = value;
      },
    });

    render(<DemoVideo baseName="demo" buildUrl={buildUrl} alt="demo" />);

    expect(currentTime).toBe(0);
    expect(mediaProto.pause).toHaveBeenCalled();
  });

  it('provides a download fallback for browsers without <video> support', () => {
    render(<DemoVideo baseName="demo" buildUrl={buildUrl} alt="demo" />);

    expect(screen.getByRole('link', { name: /Download the demo \(MP4\)/i })).toHaveAttribute(
      'href',
      'https://test.example/landing-page-videos/demo.mp4',
    );
  });
});
