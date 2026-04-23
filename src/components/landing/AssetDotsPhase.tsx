import { useRef, useMemo } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';
import type { StateCode } from './stateVectors';
import { STATE_VECTORS } from './stateVectors';

interface AssetDotsPhaseProps {
  stateKey: StateCode;
  dotCount?: number;
}

const VIEWBOX = 100;
const DEFAULT_DOT_COUNT = 14;

/**
 * Simple linear-congruential generator for deterministic, seedable pseudorandom
 * numbers. Seeds on the stateKey so dot positions are stable per-state and
 * don't shift between renders or loop iterations.
 */
function seededRng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

/** Convert a string to a numeric seed (sum of char codes). */
function strToSeed(str: string): number {
  return str.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
}

export default function AssetDotsPhase({
  stateKey,
  dotCount = DEFAULT_DOT_COUNT,
}: AssetDotsPhaseProps) {
  const containerRef = useRef<SVGSVGElement>(null);
  const clipId = `state-clip-${stateKey}`;

  const dots = useMemo(() => {
    const rng = seededRng(strToSeed(stateKey));
    return Array.from({ length: dotCount }, (_, i) => ({
      id: i,
      cx: rng() * VIEWBOX,
      cy: rng() * VIEWBOX,
    }));
  }, [stateKey, dotCount]);

  useGSAP(
    () => {
      const circles = containerRef.current?.querySelectorAll('circle');
      if (!circles?.length) return;

      // Staggered entrance: dots scatter in from r=0 opacity=0
      gsap.from(circles, {
        r: 0,
        opacity: 0,
        stagger: 0.06,
        duration: 0.4,
        ease: 'back.out(1.7)',
      });

      // Perpetual breathing pulse
      gsap.to(circles, {
        scale: 1.3,
        repeat: -1,
        yoyo: true,
        duration: 1.6,
        ease: 'sine.inOut',
        stagger: { each: 0.12, from: 'random' },
        transformOrigin: 'center center',
      });
    },
    { scope: containerRef, dependencies: [stateKey, dotCount] },
  );

  return (
    <svg
      ref={containerRef}
      viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
      width="100%"
      height="100%"
      aria-hidden="true"
    >
      <defs>
        <clipPath id={clipId}>
          <path d={STATE_VECTORS[stateKey]} />
        </clipPath>
      </defs>

      {/* State outline */}
      <path
        d={STATE_VECTORS[stateKey]}
        fill="none"
        stroke="hsl(var(--primary))"
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
        opacity={0.6}
      />

      {/* Asset dots clipped to state shape — none appear outside the border */}
      <g clipPath={`url(#${clipId})`}>
        {dots.map((dot) => (
          <circle
            key={dot.id}
            cx={dot.cx}
            cy={dot.cy}
            r={2.5}
            fill="hsl(var(--primary))"
            opacity={0.9}
          />
        ))}
      </g>
    </svg>
  );
}
