import { useState, useRef, useCallback, useEffect, lazy, Suspense } from 'react';
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion';
import { STATE_VECTORS, ALL_STATE_CODES } from './stateVectors';
import type { StateCode } from './stateVectors';
import AssetDotsPhase from './AssetDotsPhase';

// Animation phases are dynamically imported so the reduced-motion path
// never pays the GSAP / MorphSVG bundle cost.
const QRScanPhase = lazy(() => import('./QRScanPhase'));
const StateMorphPhase = lazy(() => import('./StateMorphPhase'));

type AnimPhase = 'qr' | 'morph' | 'dots' | 'fade';

/** Pick a random state that is not the same as the previous one. */
function pickNextState(prev: StateCode | null): StateCode {
  const pool = prev
    ? ALL_STATE_CODES.filter((c) => c !== prev)
    : ALL_STATE_CODES;
  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * Reduced-motion / GSAP-load-failure static composite.
 * Shows a QR icon + a single state outline (TX) + static dots.
 * Zero GSAP bundle cost.
 */
function StaticHeroComposite() {
  return (
    <div className="relative w-full h-full" data-testid="static-hero-composite">
      <svg
        viewBox="0 0 100 100"
        width="100%"
        height="100%"
        aria-hidden="true"
      >
        {/* State outline */}
        <path
          d={STATE_VECTORS['TX']}
          fill="hsl(var(--primary) / 0.08)"
          stroke="hsl(var(--primary))"
          strokeWidth={1.5}
          strokeLinejoin="round"
        />
        {/* Static dots */}
        {[
          [30, 35], [45, 55], [60, 40], [50, 65], [35, 70],
          [55, 30], [40, 45], [65, 60], [25, 55], [70, 50],
        ].map(([cx, cy], i) => (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={2.5}
            fill="hsl(var(--primary))"
            opacity={0.8}
          />
        ))}
      </svg>
    </div>
  );
}

export default function HeroAnimation() {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [phase, setPhase] = useState<AnimPhase>('qr');
  const [stateKey, setStateKey] = useState<StateCode>(() => pickNextState(null));
  const prevStateRef = useRef<StateCode>(stateKey);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [opacity, setOpacity] = useState(1);

  const handleQRComplete = useCallback(() => {
    setPhase('morph');
  }, []);

  const handleMorphComplete = useCallback(() => {
    setPhase('dots');
  }, []);

  const startNextCycle = useCallback(() => {
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    holdTimerRef.current = setTimeout(() => {
      // Fade out
      setOpacity(0);
      setTimeout(() => {
        const next = pickNextState(prevStateRef.current);
        prevStateRef.current = next;
        setStateKey(next);
        setPhase('qr');
        setOpacity(1);
      }, 400);
    }, 2500);
  }, []);

  useEffect(() => {
    if (phase === 'dots') {
      startNextCycle();
    }
    return () => {
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    };
  }, [phase, startNextCycle]);

  return (
    <section
      aria-label="EquipQR asset tracking demo"
      className="relative flex flex-col items-center justify-center pt-24 pb-14 md:pt-28 md:pb-20 bg-gradient-to-br from-background via-background to-primary/5"
    >
      {/* Screen-reader text provides a textual equivalent of the animation */}
      <p className="sr-only">
        EquipQR tracks QR-coded equipment across the United States. The demo
        shows a QR code being scanned, which then transforms into a U.S. state
        map with asset location markers.
      </p>

      {/* Minimal overlay — Option B: app name + tagline only */}
      <div className="relative z-10 text-center mb-8 px-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary mb-2">
          EquipQR
        </p>
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-foreground">
          QR-tracked work orders for heavy equipment repair shops
        </h1>
      </div>

      {/* Animation stage — fixed aspect ratio prevents CLS */}
      <div
        className="relative w-full max-w-sm px-4"
        style={{ aspectRatio: '1 / 1', minHeight: 320 }}
      >
        {prefersReducedMotion ? (
          <StaticHeroComposite />
        ) : (
          <div
            className="w-full h-full transition-opacity duration-300"
            style={{ opacity }}
          >
            <Suspense fallback={<StaticHeroComposite />}>
              {phase === 'qr' && (
                <QRScanPhase onPhaseComplete={handleQRComplete} />
              )}
              {phase === 'morph' && (
                <StateMorphPhase
                  stateKey={stateKey}
                  onComplete={handleMorphComplete}
                />
              )}
              {phase === 'dots' && (
                <AssetDotsPhase stateKey={stateKey} />
              )}
            </Suspense>
          </div>
        )}
      </div>
    </section>
  );
}
