import React from 'react';
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion';
import { PRICING_COLLAGE_MANIFEST } from '@/components/landing/pricing-collage/collageManifest';
import { resolvePricingCollage } from '@/components/landing/pricing-collage/resolvePricingCollage';

export function PricingCollageBackground(): React.JSX.Element {
  const prefersReducedMotion = usePrefersReducedMotion();
  const strips = resolvePricingCollage(PRICING_COLLAGE_MANIFEST);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      <div className="flex h-full w-full">
        {strips.map((strip) => (
          <div key={strip.id} className="relative h-full min-w-0 flex-1 overflow-hidden">
            <div
              className={
                prefersReducedMotion
                  ? 'h-[200%]'
                  : 'pricing-collage-track-animated h-[200%]'
              }
              style={
                {
                  '--pricing-collage-duration': strip.durationCss,
                } as React.CSSProperties
              }
            >
              <img
                src={strip.url}
                alt=""
                decoding="async"
                loading="lazy"
                className="block h-1/2 w-full object-cover object-center"
              />
              <img
                src={strip.url}
                alt=""
                decoding="async"
                loading="lazy"
                className="block h-1/2 w-full object-cover object-center"
              />
            </div>
          </div>
        ))}
      </div>
      <div className="absolute inset-0 bg-background/80 bg-gradient-to-b from-background/90 via-background/70 to-background/85" />
    </div>
  );
}
