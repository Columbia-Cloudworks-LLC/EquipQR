import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion';
import { PRICING_COLLAGE_MANIFEST } from './collageManifest';
import { resolvePricingCollage } from './resolvePricingCollage';

export default function PricingCollageBackground() {
  const prefersReducedMotion = usePrefersReducedMotion();
  const strips = resolvePricingCollage(PRICING_COLLAGE_MANIFEST);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      <div className="flex h-full w-full">
        {strips.map((strip) => (
          <div key={strip.id} className="relative h-full min-w-0 flex-1 overflow-hidden">
            <div
              className={prefersReducedMotion ? undefined : 'pricing-collage-track-animated'}
              style={{ animationDuration: strip.durationCss }}
            >
              <img src={strip.url} alt="" decoding="async" loading="lazy" className="block w-full" />
              <img src={strip.url} alt="" decoding="async" loading="lazy" className="block w-full" />
            </div>
          </div>
        ))}
      </div>
      <div className="absolute inset-0 bg-background/80 bg-gradient-to-b from-background/90 via-background/70 to-background/85" />
    </div>
  );
}
