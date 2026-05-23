import React, { useEffect, useRef } from 'react';
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion';
import { cn } from '@/lib/utils';

export interface DemoVideoProps {
  /** Filename in the `landing-page-videos` Supabase bucket, without extension. */
  baseName: string;
  /**
   * Build a public URL for a file in the `landing-page-videos` bucket.
   * Injected so unit tests can avoid the `VITE_SUPABASE_URL` env requirement
   * of {@link landingVideo}.
   */
  buildUrl: (filename: string) => string;
  /** Accessible label describing what the demo shows. Required for a11y. */
  alt: string;
  /**
   * Optional extra class names applied to the root frame. The frame already
   * provides a mobile-portrait aspect ratio (9:19.5, matching the 1080×2340
   * source captures) and a max-width, so callers usually only need to add
   * margin/alignment utilities.
   */
  className?: string;
}

/**
 * Renders an autoplaying, looping, muted demo video for the marketing pages.
 *
 * Why a video element (not a GIF):
 *  - The original mobile screen captures are 1080×2340 and run ~35–40s. As
 *    GIFs they were 19–37 MB each; encoded as H.264/VP9 at 720px width they
 *    drop to ~1.5–3.5 MB while remaining crisp on a phone-frame display.
 *
 * Accessibility:
 *  - Muted + playsInline + autoPlay + loop = browser-allowed mobile autoplay.
 *  - Native controls are always exposed so every user can pause, seek, or stop
 *    the looping motion without relying on a global reduced-motion setting.
 *  - When `prefers-reduced-motion: reduce` is set, autoplay is suppressed and
 *    the poster image is shown instead while controls remain available.
 *  - `aria-label` on the `<video>` provides a text alternative for the moving
 *    content.
 */
export const DemoVideo: React.FC<DemoVideoProps> = ({
  baseName,
  buildUrl,
  alt,
  className,
}) => {
  const prefersReducedMotion = usePrefersReducedMotion();
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const mp4Src = buildUrl(`${baseName}.mp4`);
  const webmSrc = buildUrl(`${baseName}.webm`);
  const posterSrc = buildUrl(`${baseName}.jpg`);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (prefersReducedMotion) {
      video.pause();
      video.currentTime = 0;
    } else {
      // Best-effort autoplay; some browsers reject the promise silently.
      const playPromise = video.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => undefined);
      }
    }
  }, [prefersReducedMotion]);

  return (
    <div
      className={cn(
        'mx-auto w-full max-w-xs overflow-hidden rounded-[2rem] border border-border bg-black shadow-lg',
        'aspect-[1080/2340]',
        className,
      )}
    >
      <video
        ref={videoRef}
        className="h-full w-full object-cover"
        poster={posterSrc}
        autoPlay={!prefersReducedMotion}
        loop
        muted
        playsInline
        preload="metadata"
        controls
        aria-label={alt}
      >
        <source src={webmSrc} type="video/webm" />
        <source src={mp4Src} type="video/mp4" />
        {/* Browsers without <video> support fall through to this text. */}
        <p>
          Your browser does not support inline video.{' '}
          <a href={mp4Src}>Download the demo (MP4)</a>.
        </p>
      </video>
    </div>
  );
};

export default DemoVideo;
