import { useRef, useMemo, useState, useEffect } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';
import { STATES_RELATIVE, ALL_STATE_CODES } from './stateVectors';
import { seededRng, strToSeed } from './dotPositions';
import { FEATURE_CARD_SETS } from './featureCardsData';

interface NationalMapPhaseProps {
  /** Mixed into the dot-position RNG so dots vary per loop iteration. */
  cycleSeed: number;
  /** Counts national cycles only (0, 1, 2, 3, ...) — used to rotate the
   *  feature-card set so consecutive national visits show different sets.
   *  Distinct from cycleSeed because national cycles only fire every 3rd loop,
   *  meaning cycleSeed is always 0/3/6/9… and `cycleSeed % 3` always picks set 0. */
  nationalSeed: number;
  onComplete: () => void;
}

// us.svg coordinate space.
const SVG_WIDTH = 1000;
const SVG_HEIGHT = 589;
const NATIONAL_DOT_COUNT = 30;
const INTRO_HOLD_MS = 600;
const FEATURE_DISPLAY_MS = 4500;

/**
 * Every-3rd-cycle national map view.
 *
 * Sub-phases:
 *   intro   — line expands to full US map, borders fade in, dots scatter
 *   feature — a single feature card slides in below the map (map stays full size)
 *   then fires onComplete to let the orchestrator fade out and restart
 *
 * The US map renders in the top portion of the stage; the feature card sits
 * in the room below it (no map resize). This gives enough time to read one
 * sentence per cycle instead of trying to digest two cards at once.
 */
export default function NationalMapPhase({
  cycleSeed,
  nationalSeed,
  onComplete,
}: NationalMapPhaseProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapWrapperRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);

  const [subPhase, setSubPhase] = useState<'intro' | 'feature'>('intro');

  const cardSet = useMemo(
    () => FEATURE_CARD_SETS[Math.abs(nationalSeed) % FEATURE_CARD_SETS.length],
    [nationalSeed],
  );

  const nationalDots = useMemo(() => {
    const rng = seededRng(strToSeed('national_map_dots') + cycleSeed * 31);
    return Array.from({ length: NATIONAL_DOT_COUNT }, (_, i) => ({
      id: i,
      cx: 90 + rng() * 820,
      cy: 30 + rng() * 470,
    }));
  }, [cycleSeed]);

  // Sub-phase scheduler
  useEffect(() => {
    if (subPhase === 'intro') {
      const t = setTimeout(() => setSubPhase('feature'), 3500 + INTRO_HOLD_MS);
      return () => clearTimeout(t);
    }
    const t = setTimeout(onComplete, FEATURE_DISPLAY_MS);
    return () => clearTimeout(t);
  }, [subPhase, onComplete]);

  // Intro animation
  useGSAP(
    () => {
      const tl = gsap.timeline();

      tl.fromTo(
        mapWrapperRef.current,
        { scaleX: 0 },
        {
          scaleX: 1,
          duration: 0.9,
          ease: 'power3.inOut',
          transformOrigin: '50% 50%',
        },
      );

      const borderPaths = svgRef.current?.querySelectorAll('.state-border');
      if (borderPaths?.length) {
        tl.from(borderPaths, {
          opacity: 0,
          duration: 0.3,
          stagger: { each: 1.5 / borderPaths.length, from: 'center' },
          ease: 'power1.in',
        }, '-=0.1');
      }

      const circles = svgRef.current?.querySelectorAll('.national-dot');
      if (circles?.length) {
        tl.from(circles, {
          r: 0,
          opacity: 0,
          stagger: 0.05,
          duration: 0.35,
          ease: 'back.out(1.7)',
        }, '-=0.5');

        tl.to(circles, {
          scale: 1.3,
          repeat: -1,
          yoyo: true,
          duration: 1.6,
          ease: 'sine.inOut',
          stagger: { each: 0.1, from: 'random' },
          transformOrigin: 'center center',
        });
      }
    },
    { scope: containerRef, dependencies: [cycleSeed] },
  );

  // Stagger the three feature cards in when subPhase becomes 'feature'
  useGSAP(
    () => {
      if (subPhase !== 'feature' || !cardsRef.current) return;
      const cards = cardsRef.current.querySelectorAll('[data-feature-card]');
      gsap.fromTo(
        cards,
        { opacity: 0, y: 14 },
        {
          opacity: 1,
          y: 0,
          duration: 0.5,
          stagger: 0.12,
          ease: 'power2.out',
        },
      );
    },
    { scope: containerRef, dependencies: [subPhase] },
  );

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full flex flex-col"
      data-testid="national-map-phase"
    >
      {/* Map fills the top portion of the stage at full width */}
      <div
        ref={mapWrapperRef}
        className="w-full"
        style={{
          transformOrigin: '50% 50%',
          // SVG is 1000×589 (≈1.7:1) inside a square stage; with width=100%
          // and aspectRatio preserved it occupies ~59% of stage height.
          flex: '0 0 auto',
        }}
      >
        <svg
          ref={svgRef}
          viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
          width="100%"
          height="100%"
          aria-hidden="true"
        >
          <defs>
            <clipPath id="us-territory-clip">
              {ALL_STATE_CODES.map((code) => (
                <path key={`clip-${code}`} d={STATES_RELATIVE[code]} />
              ))}
            </clipPath>
          </defs>

          {ALL_STATE_CODES.map((code) => (
            <path
              key={`fill-${code}`}
              d={STATES_RELATIVE[code]}
              fill="hsl(var(--primary) / 0.12)"
              stroke="none"
            />
          ))}

          {ALL_STATE_CODES.map((code) => (
            <path
              key={`border-${code}`}
              className="state-border"
              d={STATES_RELATIVE[code]}
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth={0.4}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ))}

          <g clipPath="url(#us-territory-clip)">
            {nationalDots.map((dot) => (
              <circle
                key={dot.id}
                className="national-dot"
                cx={dot.cx}
                cy={dot.cy}
                r={2}
                fill="hsl(var(--primary))"
                opacity={0.85}
              />
            ))}
          </g>
        </svg>
      </div>

      {/* Three stacked feature cards centred in the room below the map */}
      <div className="flex-1 flex items-center justify-center px-3 pb-2 min-h-0">
        {subPhase === 'feature' && (
          <div
            ref={cardsRef}
            className="w-full max-w-sm flex flex-col gap-1.5"
            data-testid="national-feature-cards"
          >
            {cardSet.cards.map((card) => (
              <div
                key={card.title}
                data-feature-card
                className="rounded-md border border-primary/30 bg-background/92 backdrop-blur-sm px-2.5 py-1.5 text-left"
                style={{ opacity: 0 }}
              >
                <div className="flex items-start gap-2">
                  <card.icon
                    className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5"
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[8px] font-bold uppercase tracking-[0.12em] text-primary mb-0.5">
                      {card.title}
                    </p>
                    <p className="text-[10px] leading-snug text-foreground/85">
                      {card.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
