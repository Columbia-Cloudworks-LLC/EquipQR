import { useState, useRef, useCallback, useEffect, lazy, Suspense } from 'react';
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion';
import { STATE_VECTORS, ALL_STATE_CODES } from './stateVectors';
import type { StateCode } from './stateVectors';
import AssetDotsPhase from './AssetDotsPhase';
import EquipQRIcon from '@/components/ui/EquipQRIcon';

/**
 * Full EquipQR brand lockup: icon mark (vector) + wordmark (SVG paths).
 * The wordmark paths use currentColor so navy renders as white in dark mode.
 */
function EquipQRLogo({ className = '' }: { className?: string }) {
  return (
    <div className={`inline-flex flex-col items-center gap-1 ${className}`}>
      <EquipQRIcon title="EquipQR" className="h-10 w-auto" />
      {/* Wordmark — currentColor adapts light/dark */}
      <svg
        viewBox="700 592 510 130"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="h-5 w-auto"
        fill="currentColor"
      >
        <path d="M721.86,603.63h58.07v14.34h-42.65v17.59h35.66v13.73h-35.66v18.91h42.65v14.22h-58.07V603.63z"/>
        <path d="M838.47,707.84v-34.09c-4.22,6.62-11.32,10.24-19.88,10.24c-14.46,0-29.64-10.36-29.64-30.72
          c0-18.91,13.25-31.92,32.17-31.92c18.67,0,31.68,12.53,31.68,31.8v54.7H838.47z M838.47,652.66c0-10.48-6.99-17.95-17.47-17.95
          s-17.59,7.47-17.59,17.95c0,10.48,7.11,17.95,17.59,17.95S838.47,663.14,838.47,652.66z"/>
        <path d="M864.6,653.87V622.9h14.34v30.96c0,11.32,6.02,16.75,15.06,16.75s15.06-5.42,15.06-16.75V622.9h14.34v30.96
          c0,19.88-11.81,30.12-29.4,30.12C876.41,683.98,864.6,673.86,864.6,653.87z"/>
        <path d="M934.94,605.68c0-5.54,3.98-9.64,9.52-9.64c5.54,0,9.52,4.1,9.52,9.64c0,5.54-3.98,9.52-9.52,9.52
          C938.92,615.19,934.94,611.22,934.94,605.68z M937.23,622.9h14.34v59.51h-14.34V622.9z"/>
        <path d="M965.42,653.14c0-19.28,13.01-31.8,31.69-31.8c18.91,0,32.16,13.01,32.16,31.92
          c0,20.36-15.18,30.72-29.64,30.72c-8.55,0-15.66-3.61-19.88-10.24v34.09h-14.34V653.14z M1014.81,652.66
          c0-10.48-7.11-17.95-17.59-17.95c-10.48,0-17.47,7.47-17.47,17.95c0,10.48,6.99,17.95,17.47,17.95
          C1007.7,670.61,1014.81,663.14,1014.81,652.66z"/>
        <path d="M1104.55,694.83l-9.76-13.61c-4.82,1.81-10.24,2.77-16.02,2.77c-24.58,0-41.92-17.35-41.92-40.96
          c0-23.61,17.35-40.96,41.92-40.96c24.58,0,41.92,17.35,41.92,40.96c0,12.65-4.94,23.49-13.37,30.84l14.82,20.96H1104.55z
          M1086,668.93l-12.29-17.11h17.83l6.87,9.64c4.22-4.7,6.63-11.08,6.63-18.43c0-15.42-10.6-26.62-26.26-26.62
          c-15.66,0-26.26,11.2-26.26,26.62s10.6,26.75,26.26,26.75C1081.3,669.77,1083.71,669.53,1086,668.93z"/>
        <path d="M1132.85,603.63h33.01c20,0,28.79,10.96,28.79,26.02c0,12.41-5.9,20.96-16.5,24.46l19.39,28.31h-18.31
          l-16.74-26.62h-14.22v26.62h-15.42V603.63z M1166.1,641.46c9.76,0,13.01-5.06,13.01-11.81c0-6.75-3.25-11.69-13.01-11.69h-17.83
          v23.49H1166.1z"/>
      </svg>
    </div>
  );
}

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
    <div className="relative w-full h-full flex flex-col items-center justify-center gap-4" data-testid="static-hero-composite">
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

      {/* Minimal overlay — Option B: branded logo + tagline */}
      <div className="relative z-10 text-center mb-8 px-4">
        <EquipQRLogo className="mx-auto mb-4 text-foreground" />
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
