import { useRef, useMemo } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';
import { STATES_RELATIVE, ALL_STATE_CODES } from './stateVectors';
import { strToSeed } from './dotPositions';

interface NationalMapPhaseProps {
  /** Called after the hold period expires — signals the orchestrator to restart. */
  onComplete: () => void;
}

const VIEWBOX = 100;
const NATIONAL_DOT_COUNT = 30;
const HOLD_DURATION = 4;

/** Seeded LCG RNG — different seed than per-state dots to avoid same positions. */
function seededRng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

/**
 * Phase 3a–4 for the every-3rd-cycle national map.
 *
 * Animation sequence:
 *   1. Container scaleX 0 → 1 over 0.9s (the thin vertical line "expands" to
 *      reveal the full US map silhouette — visually equivalent to MorphSVG but
 *      performant at any path complexity).
 *   2. Individual state border paths stagger fade-in over 1.5s.
 *   3. ~30 dots scatter across the national canvas.
 *   4. Hold for 4s, then fire onComplete.
 *
 * The filled state paths (primary/10 fill) create the solid silhouette the user
 * requested so the map reads as a distinct shape before borders appear.
 */
export default function NationalMapPhase({ onComplete }: NationalMapPhaseProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const nationalDots = useMemo(() => {
    const rng = seededRng(strToSeed('national_map_dots'));
    return Array.from({ length: NATIONAL_DOT_COUNT }, (_, i) => ({
      id: i,
      cx: 5 + rng() * 90,
      cy: 5 + rng() * 90,
    }));
  }, []);

  useGSAP(
    () => {
      const tl = gsap.timeline();

      // Phase 3a: container scaleX from 0 → 1 (line expands to US map silhouette)
      tl.fromTo(
        containerRef.current,
        { scaleX: 0 },
        {
          scaleX: 1,
          duration: 0.9,
          ease: 'power3.inOut',
          transformOrigin: '50% 50%',
        },
      );

      // Phase 3b: state border paths stagger fade-in over 1.5s
      const borderPaths = svgRef.current?.querySelectorAll('.state-border');
      if (borderPaths?.length) {
        tl.from(
          borderPaths,
          {
            opacity: 0,
            duration: 0.3,
            stagger: {
              each: 1.5 / borderPaths.length,
              from: 'center',
            },
            ease: 'power1.in',
          },
          '-=0.1',
        );
      }

      // Phase 4: national dots scatter in
      const circles = svgRef.current?.querySelectorAll('.national-dot');
      if (circles?.length) {
        tl.from(
          circles,
          {
            r: 0,
            opacity: 0,
            stagger: 0.05,
            duration: 0.35,
            ease: 'back.out(1.7)',
          },
          '-=0.5',
        );

        // Perpetual breathing pulse on dots
        tl.to(
          circles,
          {
            scale: 1.3,
            repeat: -1,
            yoyo: true,
            duration: 1.6,
            ease: 'sine.inOut',
            stagger: { each: 0.1, from: 'random' },
            transformOrigin: 'center center',
          },
        );
      }

      // Hold for 4s then fire onComplete
      tl.to({}, { duration: HOLD_DURATION, onComplete });
    },
    { scope: containerRef, dependencies: [onComplete] },
  );

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      style={{ transformOrigin: '50% 50%' }}
    >
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
        width="100%"
        height="100%"
        aria-hidden="true"
      >
        {/* Filled state silhouettes — primary/10 tint for the "solid US map" look */}
        {ALL_STATE_CODES.map((code) => (
          <path
            key={`fill-${code}`}
            d={STATES_RELATIVE[code]}
            fill="hsl(var(--primary) / 0.12)"
            stroke="none"
          />
        ))}

        {/* State border outlines — stagger fade-in on top of the filled silhouette */}
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

        {/* National asset dots scattered across the canvas */}
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
      </svg>
    </div>
  );
}
