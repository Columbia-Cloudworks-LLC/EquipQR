import { useState, useRef, useCallback, useEffect, lazy, Suspense, useMemo } from 'react';
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion';
import { STATE_VECTORS, ALL_STATE_CODES } from './stateVectors';
import type { StateCode } from './stateVectors';
import AssetDotsPhase from './AssetDotsPhase';
import { computeDotPositions, chosenDotIndex, strToSeed } from './dotPositions';

// Animation phases are dynamically imported so the reduced-motion path
// never pays the GSAP / MorphSVG bundle cost.
const QRScanPhase = lazy(() => import('./QRScanPhase'));
const StateMorphPhase = lazy(() => import('./StateMorphPhase'));
const NationalMapPhase = lazy(() => import('./NationalMapPhase'));
const PMChecklistPhase = lazy(() => import('./PMChecklistPhase'));

type AnimPhase =
  | 'qr'
  | 'morph'       // state cycle: MorphSVG line → state outline
  | 'national'    // national cycle: CSS scaleX expand → US map
  | 'dots'        // state cycle: asset dots scatter
  | 'phase5-slide'     // state cycle: slide map+dots to the side
  | 'phase5-checklist' // state cycle: work-order sequence
  | 'fade';

/** Pick a random state that is not the same as the previous one. */
function pickNextState(prev: StateCode | null): StateCode {
  const pool = prev
    ? ALL_STATE_CODES.filter((c) => c !== prev)
    : ALL_STATE_CODES;
  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * Reduced-motion / GSAP-load-failure static composite.
 * Shows a state outline + static dots. Zero GSAP bundle cost.
 */
function StaticHeroComposite() {
  return (
    <div
      className="relative w-full h-full flex flex-col items-center justify-center gap-4"
      data-testid="static-hero-composite"
    >
      <svg viewBox="0 0 100 100" width="100%" height="100%" aria-hidden="true">
        <path
          d={STATE_VECTORS['TX']}
          fill="hsl(var(--primary) / 0.08)"
          stroke="hsl(var(--primary))"
          strokeWidth={1.5}
          strokeLinejoin="round"
        />
        {[
          [30, 35], [45, 55], [60, 40], [50, 65], [35, 70],
          [55, 30], [40, 45], [65, 60], [25, 55], [70, 50],
        ].map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r={2.5} fill="hsl(var(--primary))" opacity={0.8} />
        ))}
      </svg>
    </div>
  );
}

export default function HeroAnimation() {
  const prefersReducedMotion = usePrefersReducedMotion();

  // Cycle counter — every 3rd cycle (1-indexed) is the national map cycle.
  const cycleRef = useRef(0);

  const [phase, setPhase] = useState<AnimPhase>('qr');
  const [stateKey, setStateKey] = useState<StateCode>(() => pickNextState(null));
  const prevStateRef = useRef<StateCode>(stateKey);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [opacity, setOpacity] = useState(1);
  // Map slides to one side during Phase 5; 0 = centred, ±30% = slid
  const [slidePercent, setSlidePercent] = useState(0);

  // Determine cycle type from the counter (used in handleQRComplete via cycleRef.current % 3)
  // Note: derived at render time from cycleRef — only used inside callbacks via closure.

  // --- Chosen dot for Phase 5 (deterministic per stateKey) ---
  const dots = useMemo(() => computeDotPositions(stateKey, 14), [stateKey]);
  const chosenIdx = useMemo(() => chosenDotIndex(stateKey, dots), [stateKey, dots]);
  const chosenDot = dots[chosenIdx] ?? { cx: 50, cy: 50 };
  const slideDirection = chosenDot.cx > 50 ? 'left' : 'right';
  const exportSeed = useMemo(() => strToSeed(stateKey + '_export'), [stateKey]);

  // --- Phase transition handlers ---

  const handleQRComplete = useCallback(() => {
    setPhase(cycleRef.current % 3 === 0 ? 'national' : 'morph');
  }, []);

  const handleMorphComplete = useCallback(() => {
    setPhase('dots');
  }, []);

  const handleNationalComplete = useCallback(() => {
    // National cycles skip Phase 5 — go straight to fade → restart
    setOpacity(0);
    holdTimerRef.current = setTimeout(() => {
      cycleRef.current += 1;
      const next = pickNextState(prevStateRef.current);
      prevStateRef.current = next;
      setStateKey(next);
      setPhase('qr');
      setOpacity(1);
    }, 400);
  }, []);

  const handleDotsReady = useCallback(() => {
    // After a short hold, start Phase 5 on state cycles
    holdTimerRef.current = setTimeout(() => {
      setPhase('phase5-slide');
    }, 800);
  }, []);

  const handleChecklistComplete = useCallback(() => {
    // Phase 5 complete → fade out → restart cycle
    setOpacity(0);
    setSlidePercent(0);
    holdTimerRef.current = setTimeout(() => {
      cycleRef.current += 1;
      const next = pickNextState(prevStateRef.current);
      prevStateRef.current = next;
      setStateKey(next);
      setPhase('qr');
      setOpacity(1);
    }, 400);
  }, []);

  // Animate the map slide for Phase 5a
  useEffect(() => {
    if (phase === 'phase5-slide') {
      // Slide map 30% in the opposite direction of the chosen dot
      const target = slideDirection === 'left' ? -30 : 30;
      holdTimerRef.current = setTimeout(() => {
        setSlidePercent(target);
        // Advance to checklist after CSS transition completes (0.6s)
        holdTimerRef.current = setTimeout(() => {
          setPhase('phase5-checklist');
        }, 650);
      }, 50);
    }
    return () => { if (holdTimerRef.current) clearTimeout(holdTimerRef.current); };
  }, [phase, slideDirection]);

  // Trigger the hold timer for state-cycle dots phase
  useEffect(() => {
    if (phase === 'dots') {
      handleDotsReady();
    }
    return () => { if (holdTimerRef.current) clearTimeout(holdTimerRef.current); };
  }, [phase, handleDotsReady]);

  return (
    <section
      aria-label="EquipQR asset tracking demo"
      className="relative flex flex-col items-center justify-center pt-24 pb-14 md:pt-28 md:pb-20 bg-gradient-to-br from-background via-background to-primary/5"
    >
      <p className="sr-only">
        EquipQR tracks QR-coded equipment across the United States. The demo shows a QR
        code being scanned, which transforms into a U.S. map with asset location markers.
        Work orders are created and exported to QuickBooks, Google Drive, or Excel.
      </p>

      <div className="relative z-10 text-center mb-8 px-4">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-foreground">
          QR-tracked work orders for heavy equipment repair shops
        </h1>
      </div>

      {/* Animation stage */}
      <div
        className="relative w-full max-w-sm px-4 overflow-hidden"
        style={{ aspectRatio: '1 / 1', minHeight: 320 }}
      >
        {prefersReducedMotion ? (
          <StaticHeroComposite />
        ) : (
          <div
            className="relative w-full h-full transition-opacity duration-300"
            style={{ opacity }}
          >
            {/* Map + dots wrapper — slides during Phase 5 */}
            <div
              className="absolute inset-0"
              style={{
                transform: `translateX(${slidePercent}%)`,
                transition: 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                width: slidePercent !== 0 ? '40%' : '100%',
              }}
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
                {(phase === 'dots' || phase === 'phase5-slide' || phase === 'phase5-checklist') && (
                  <AssetDotsPhase stateKey={stateKey} />
                )}
                {phase === 'national' && (
                  <NationalMapPhase onComplete={handleNationalComplete} />
                )}
              </Suspense>
            </div>

            {/* Phase 5 checklist overlay — mounts beside the slid map */}
            {phase === 'phase5-checklist' && (
              <Suspense fallback={null}>
                <PMChecklistPhase
                  slideDirection={slideDirection}
                  chosenDot={chosenDot}
                  exportSeed={exportSeed}
                  onComplete={handleChecklistComplete}
                />
              </Suspense>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
