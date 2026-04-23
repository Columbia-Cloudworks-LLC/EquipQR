import { useRef, useMemo, useState, useEffect } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';
import { STATES_RELATIVE, ALL_STATE_CODES } from './stateVectors';
import { strToSeed } from './dotPositions';
import { FEATURE_CARD_SETS } from './featureCardsData';

interface NationalMapPhaseProps {
  /** Mixed into RNG seed so dot positions and chosen card set vary per cycle. */
  cycleSeed: number;
  onComplete: () => void;
}

// us.svg coordinate space.
const SVG_WIDTH = 1000;
const SVG_HEIGHT = 589;
const NATIONAL_DOT_COUNT = 30;
const INTRO_HOLD_MS = 1000;
const FEATURES_DISPLAY_MS = 3500;

function seededRng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

/**
 * Every-3rd-cycle national map view.
 *
 * Sub-phases (internal):
 *   intro    — full-stage US map: scaleX expand + state borders fade in + dots scatter
 *   features — map shrinks to 50% on the left, two feature cards slide in on the right
 *   (then fires onComplete to let the orchestrator fade out)
 *
 * Dots are randomized per cycle and clipped to the US territory (union of all
 * STATES_RELATIVE paths) so none appear in the ocean or beyond the borders.
 */
export default function NationalMapPhase({ cycleSeed, onComplete }: NationalMapPhaseProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapWrapperRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);

  const [subPhase, setSubPhase] = useState<'intro' | 'features'>('intro');

  const cardSet = useMemo(
    () => FEATURE_CARD_SETS[Math.abs(cycleSeed) % FEATURE_CARD_SETS.length],
    [cycleSeed],
  );

  // Random dots per cycle. Generate generously inside the contiguous-48 bbox;
  // any stragglers outside the US territory are clipped invisibly by clipPath.
  const nationalDots = useMemo(() => {
    const rng = seededRng(strToSeed('national_map_dots') + cycleSeed * 31);
    return Array.from({ length: NATIONAL_DOT_COUNT }, (_, i) => ({
      id: i,
      cx: 90 + rng() * 820,    // generous span; clipPath trims anything off-territory
      cy: 30 + rng() * 470,
    }));
  }, [cycleSeed]);

  // Sub-phase scheduler
  useEffect(() => {
    if (subPhase === 'intro') {
      // GSAP intro takes ~3.5s; INTRO_HOLD_MS extra hold so user sees full map
      const t = setTimeout(() => setSubPhase('features'), 3500 + INTRO_HOLD_MS);
      return () => clearTimeout(t);
    } else {
      // Features displayed for FEATURES_DISPLAY_MS, then complete
      const t = setTimeout(onComplete, FEATURES_DISPLAY_MS);
      return () => clearTimeout(t);
    }
  }, [subPhase, onComplete]);

  // Intro animation (runs once on mount)
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

  // Slide cards in when subPhase becomes 'features'
  useGSAP(
    () => {
      if (subPhase !== 'features' || !cardsRef.current) return;
      gsap.fromTo(
        cardsRef.current.querySelectorAll('[data-feature-card]'),
        { opacity: 0, x: 20 },
        {
          opacity: 1,
          x: 0,
          duration: 0.5,
          stagger: 0.15,
          ease: 'power2.out',
          delay: 0.3, // wait for map to finish shrinking
        },
      );
    },
    { scope: containerRef, dependencies: [subPhase] },
  );

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full"
      data-testid="national-map-phase"
    >
      {/* Map wrapper: full-width during intro, shrinks to 50% during features */}
      <div
        ref={mapWrapperRef}
        className="absolute top-0 left-0 bottom-0"
        style={{
          transformOrigin: '50% 50%',
          width: subPhase === 'features' ? '50%' : '100%',
          transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
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
            {/* Union of all 50 state paths — clips dots to US territory only */}
            <clipPath id="us-territory-clip">
              {ALL_STATE_CODES.map((code) => (
                <path key={`clip-${code}`} d={STATES_RELATIVE[code]} />
              ))}
            </clipPath>
          </defs>

          {/* Filled state silhouettes — the solid US shape */}
          {ALL_STATE_CODES.map((code) => (
            <path
              key={`fill-${code}`}
              d={STATES_RELATIVE[code]}
              fill="hsl(var(--primary) / 0.12)"
              stroke="none"
            />
          ))}

          {/* State borders — staggered fade-in on top of the silhouette */}
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

          {/* Asset dots — clipped to US territory */}
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

      {/* Feature cards — mount only during 'features' sub-phase */}
      {subPhase === 'features' && (
        <div
          ref={cardsRef}
          className="absolute top-0 right-0 bottom-0 w-[48%] flex flex-col justify-center gap-2 px-1.5"
          data-testid="national-feature-cards"
        >
          {cardSet.cards.map((card) => (
            <div
              key={card.title}
              data-feature-card
              className="rounded-lg border border-primary/30 bg-background/92 backdrop-blur-sm p-2 text-left"
              style={{ opacity: 0 }}
            >
              <div className="flex items-start gap-2">
                <card.icon className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" aria-hidden />
                <div className="min-w-0">
                  <p className="text-[8px] font-bold uppercase tracking-[0.12em] text-primary mb-0.5">
                    {card.title}
                  </p>
                  <p className="text-[7.5px] leading-tight text-foreground/80">
                    {card.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
