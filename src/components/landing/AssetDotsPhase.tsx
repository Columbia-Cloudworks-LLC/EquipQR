import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';
import type { StateCode } from './stateVectors';
import { STATE_VECTORS } from './stateVectors';
import type { DotPosition } from './dotPositions';

interface AssetDotsPhaseProps {
  stateKey: StateCode;
  /** Dots are computed by the parent (HeroAnimation) via rejection sampling
   *  so positions are guaranteed inside the state polygon and the parent's
   *  chosen-dot pick lines up with a visible dot. */
  dots: DotPosition[];
}

const VIEWBOX = 100;

export default function AssetDotsPhase({ stateKey, dots }: AssetDotsPhaseProps) {
  const containerRef = useRef<SVGSVGElement>(null);
  const clipId = `state-clip-${stateKey}`;

  useGSAP(
    () => {
      const circles = containerRef.current?.querySelectorAll('circle');
      if (!circles?.length) return;

      // Staggered entrance
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
    { scope: containerRef, dependencies: [stateKey, dots] },
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

      {/* Dots — clip-path is a belt-and-braces guard since rejection sampling
          already keeps them inside the polygon. */}
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
