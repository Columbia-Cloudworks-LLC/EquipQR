import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';
import { MorphSVGPlugin } from 'gsap/MorphSVGPlugin';
import type { StateCode } from './stateVectors';
import { STATE_VECTORS } from './stateVectors';

gsap.registerPlugin(MorphSVGPlugin);

interface StateMorphPhaseProps {
  stateKey: StateCode;
  /** Called when the morph animation completes */
  onComplete: () => void;
}

/**
 * Phase 3: The thin vertical line morphs into the outline of a U.S. state.
 *
 * The initial path is a straight vertical line in the centre of the 100×100
 * viewBox. MorphSVGPlugin animates the d attribute to the target state shape.
 */

const VERTICAL_LINE = 'M 50 0 L 50 100 Z';
const VIEWBOX = 100;

export default function StateMorphPhase({ stateKey, onComplete }: StateMorphPhaseProps) {
  const pathRef = useRef<SVGPathElement>(null);
  const containerRef = useRef<SVGSVGElement>(null);

  useGSAP(
    () => {
      gsap.to(pathRef.current, {
        duration: 0.9,
        ease: 'power3.inOut',
        morphSVG: STATE_VECTORS[stateKey],
        onComplete,
      });
    },
    { scope: containerRef, dependencies: [stateKey, onComplete] },
  );

  return (
    <svg
      ref={containerRef}
      viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
      width="100%"
      height="100%"
      aria-hidden="true"
    >
      <path
        ref={pathRef}
        d={VERTICAL_LINE}
        fill="none"
        stroke="hsl(var(--primary))"
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
