import { useState, useRef, useCallback, useEffect, lazy, Suspense } from 'react';
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion';
import { STATE_VECTORS, ALL_STATE_CODES } from './stateVectors';
import type { StateCode } from './stateVectors';
import AssetDotsPhase from './AssetDotsPhase';

/**
 * Inline branded EquipQR logo from public/eqr-logo/vector.svg.
 *
 * The original SVG canvas is 1920×1080 with the logo content occupying
 * roughly x:700–1230, y:355–730. The cropped viewBox below removes the
 * surrounding whitespace so the logo fills its container edge-to-edge.
 *
 * Icon paths keep the brand purple (#7B3EE7); wordmark paths use currentColor
 * so they invert correctly in dark mode (navy on light → white on dark).
 */
function EquipQRLogo({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="695 352 545 388"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="EquipQR"
      role="img"
      className={className}
    >
      {/* Icon — brand purple, always visible */}
      <g fill="#7B3EE7">
        <rect x="914.44" y="547.52" width="27.5" height="27.5"/>
        <path d="M914.44,494.89v25.13h24.24C927.67,515.14,918.92,506.11,914.44,494.89z"/>
        <rect x="859.45" y="492.52" width="27.5" height="27.5"/>
        <rect x="886.94" y="520.02" width="27.5" height="27.5"/>
        <rect x="859.45" y="547.52" width="27.5" height="27.5"/>
        <path d="M915.17,459h-52.99v-77.04h77.04v53.29c1.77-0.76,3.59-1.42,5.46-1.96V376.5h-87.95v87.96h56.39 C913.67,462.58,914.38,460.77,915.17,459z"/>
        <path d="M921.14,449.12c2.39-3.02,5.13-5.73,8.19-8.07v-49.2h-57.27v57.27H921.14z"/>
        <path d="M967.46,372.86v59.74c4.53,1,8.81,2.67,12.74,4.9v-51.9h69.76v69.76h-52.07c2.18,3.93,3.8,8.21,4.76,12.74 h60.04v-95.23H967.46z"/>
        <path d="M1037.78,397.77h-45.42v45.42h45.42V397.77z M1030.75,436.16h-31.36V404.8h31.36V436.16z"/>
        <path d="M999.35,497.25h50.6V567h-69.76v-49.01c-3.93,2.23-8.21,3.9-12.74,4.9v56.85h95.23v-95.23h-59.52 C1002.51,489,1001.2,493.27,999.35,497.25z"/>
        <path d="M989.63,528.26h20.97v-20.97h-17.61c-1.05,1.27-2.18,2.47-3.36,3.62V528.26z"/>
        <rect x="1019.55" y="507.29" width="20.97" height="20.97"/>
        <rect x="1019.55" y="535.99" width="20.97" height="20.97"/>
        <rect x="989.63" y="535.99" width="20.97" height="20.97"/>
        <path d="M983.82,463.2l-14.92,14.92l-4.34,4.34l-3.37,3.37l-10.54-2.82l-2.82-10.54l3.37-3.37l4.34-4.34l14.92-14.92 c-9.69-4.31-21.44-2.5-29.38,5.44c-8.08,8.08-9.79,20.09-5.19,29.87l-13,13c1.61,2.47,3.49,4.81,5.66,6.97 c2.16,2.16,4.5,4.05,6.97,5.66l13-13c9.78,4.6,21.79,2.89,29.87-5.19C986.32,484.64,988.13,472.89,983.82,463.2z"/>
      </g>
      {/* Wordmark — currentColor adapts light/dark */}
      <g fill="currentColor">
        <path d="M721.86,603.63h58.07v14.34h-42.65v17.59h35.66v13.73h-35.66v18.91h42.65v14.22h-58.07V603.63z"/>
        <path d="M838.47,707.84v-34.09c-4.22,6.62-11.32,10.24-19.88,10.24c-14.46,0-29.64-10.36-29.64-30.72 c0-18.91,13.25-31.92,32.17-31.92c18.67,0,31.68,12.53,31.68,31.8v54.7H838.47z M838.47,652.66c0-10.48-6.99-17.95-17.47-17.95 s-17.59,7.47-17.59,17.95c0,10.48,7.11,17.95,17.59,17.95S838.47,663.14,838.47,652.66z"/>
        <path d="M864.6,653.87V622.9h14.34v30.96c0,11.32,6.02,16.75,15.06,16.75s15.06-5.42,15.06-16.75V622.9h14.34v30.96 c0,19.88-11.81,30.12-29.4,30.12C876.41,683.98,864.6,673.86,864.6,653.87z"/>
        <path d="M934.94,605.68c0-5.54,3.98-9.64,9.52-9.64c5.54,0,9.52,4.1,9.52,9.64c0,5.54-3.98,9.52-9.52,9.52 C938.92,615.19,934.94,611.22,934.94,605.68z M937.23,622.9h14.34v59.51h-14.34V622.9z"/>
        <path d="M965.42,653.14c0-19.28,13.01-31.8,31.69-31.8c18.91,0,32.16,13.01,32.16,31.92 c0,20.36-15.18,30.72-29.64,30.72c-8.55,0-15.66-3.61-19.88-10.24v34.09h-14.34V653.14z M1014.81,652.66 c0-10.48-7.11-17.95-17.59-17.95c-10.48,0-17.47,7.47-17.47,17.95c0,10.48,6.99,17.95,17.47,17.95 C1007.7,670.61,1014.81,663.14,1014.81,652.66z"/>
        <path d="M1104.55,694.83l-9.76-13.61c-4.82,1.81-10.24,2.77-16.02,2.77c-24.58,0-41.92-17.35-41.92-40.96 c0-23.61,17.35-40.96,41.92-40.96c24.58,0,41.92,17.35,41.92,40.96c0,12.65-4.94,23.49-13.37,30.84l14.82,20.96H1104.55z M1086,668.93l-12.29-17.11h17.83l6.87,9.64c4.22-4.7,6.63-11.08,6.63-18.43c0-15.42-10.6-26.62-26.26-26.62 c-15.66,0-26.26,11.2-26.26,26.62s10.6,26.75,26.26,26.75C1081.3,669.77,1083.71,669.53,1086,668.93z"/>
        <path d="M1132.85,603.63h33.01c20,0,28.79,10.96,28.79,26.02c0,12.41-5.9,20.96-16.5,24.46l19.39,28.31h-18.31 l-16.74-26.62h-14.22v26.62h-15.42V603.63z M1166.1,641.46c9.76,0,13.01-5.06,13.01-11.81c0-6.75-3.25-11.69-13.01-11.69h-17.83 v23.49H1166.1z"/>
      </g>
    </svg>
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
        <EquipQRLogo className="mx-auto mb-4 h-14 w-auto text-foreground" />
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
