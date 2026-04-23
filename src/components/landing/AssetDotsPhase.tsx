import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';
import type { StateCode } from './stateVectors';
import { STATE_VECTORS } from './stateVectors';
import type { DotPosition } from './dotPositions';
import { strToSeed } from './dotPositions';

interface AssetDotsPhaseProps {
  stateKey: StateCode;
  /** Dots are computed by the parent (HeroAnimation) via rejection sampling
   *  so positions are guaranteed inside the state polygon and the parent's
   *  chosen-dot pick lines up with a visible dot. */
  dots: DotPosition[];
}

const VIEWBOX = 100;

// Equipment vectors served from /public/icons. The space in the crane variant's
// filename must be percent-encoded for safe use as an SVG image href.
const EQUIPMENT_ICONS = [
  '/icons/barrier-svgrepo-com.svg',
  '/icons/bulldozer-svgrepo-com.svg',
  '/icons/concrete-mixer-concrete-svgrepo-com.svg',
  '/icons/cone-svgrepo-com.svg',
  '/icons/crane-svgrepo-com%20(1).svg',
  '/icons/crane-svgrepo-com.svg',
  '/icons/driller-maintenance-svgrepo-com.svg',
  '/icons/excavator-svgrepo-com.svg',
  '/icons/forklift-svgrepo-com.svg',
  '/icons/tractor-svgrepo-com.svg',
  '/icons/trolley-wheelbarrow-svgrepo-com.svg',
  '/icons/truck-pickup-svgrepo-com.svg',
] as const;

// Icon size in viewBox units. Slightly larger than the former dot diameter (5)
// so the silhouettes are legible at the animation stage's small rendered size.
const ICON_SIZE = 9;

/**
 * Deterministic icon assignment. Stable for a given (stateKey, slot) pair so
 * the same equipment appears in the same map position across re-renders, but
 * naturally varies when the stateKey changes — different states show different
 * equipment mixes. No RNG needed: integer arithmetic is sufficient.
 */
function iconForDot(stateKey: StateCode, dotId: number): string {
  const seed = strToSeed(stateKey) + dotId * 7919; // 7919 is prime
  return EQUIPMENT_ICONS[((seed % EQUIPMENT_ICONS.length) + EQUIPMENT_ICONS.length) % EQUIPMENT_ICONS.length];
}

export default function AssetDotsPhase({ stateKey, dots }: AssetDotsPhaseProps) {
  const containerRef = useRef<SVGSVGElement>(null);

  useGSAP(
    () => {
      const icons = containerRef.current?.querySelectorAll('image.asset-icon');
      if (!icons?.length) return;

      // Sequence entrance → pulse in a timeline so the pulse never starts until
      // every icon has finished its entrance. Running both as independent tweens
      // caused the pulse to capture a mid-entrance scale as its yoyo floor,
      // making icons periodically collapse toward zero.
      const tl = gsap.timeline();

      tl.from(icons, {
        scale: 0,
        opacity: 0,
        stagger: 0.06,
        duration: 0.4,
        ease: 'back.out(1.7)',
        transformOrigin: 'center center',
      });

      tl.to(icons, {
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
      {/* State outline — painted first so icons composite on top of it.
          No clip-path is needed: rejection sampling already guarantees every
          icon center is inside the polygon, and removing the clip lets each
          icon render fully rather than being masked at the border edge. */}
      <path
        d={STATE_VECTORS[stateKey]}
        fill="none"
        stroke="hsl(var(--primary))"
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
        opacity={0.6}
      />

      {/* Equipment icons — painted after the outline so they sit on top of it. */}
      <g>
        {dots.map((dot) => (
          <image
            key={dot.id}
            className="asset-icon"
            href={iconForDot(stateKey, dot.id)}
            x={dot.cx - ICON_SIZE / 2}
            y={dot.cy - ICON_SIZE / 2}
            width={ICON_SIZE}
            height={ICON_SIZE}
          />
        ))}
      </g>
    </svg>
  );
}
