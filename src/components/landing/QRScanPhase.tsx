import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';

interface QRScanPhaseProps {
  /** Called when Phase 2 (scaleX flatten) completes */
  onPhaseComplete: () => void;
}

const VIEWBOX = 320;
const QR_SIZE = 180;
const QR_OFFSET = (VIEWBOX - QR_SIZE) / 2;

/**
 * Phase 1: Render a styled QR code SVG with a sweeping scanline glow.
 * Phase 2: Flatten the QR on the X-axis to a 1-px vertical line.
 *
 * Uses a static QR pattern rendered as SVG rects — no runtime generation
 * needed for the animation; the pattern communicates "QR code" without
 * containing real data that might change between renders.
 */

// 21×21 QR-like module grid (0 = white, 1 = dark)
// Pattern is a simplified, visually convincing QR outline.
const MODULES: number[][] = [
  [1,1,1,1,1,1,1,0,1,0,1,0,1,0,1,1,1,1,1,1,1],
  [1,0,0,0,0,0,1,0,0,1,0,1,0,0,1,0,0,0,0,0,1],
  [1,0,1,1,1,0,1,0,1,0,1,0,1,0,1,0,1,1,1,0,1],
  [1,0,1,1,1,0,1,0,0,1,0,1,0,0,1,0,1,1,1,0,1],
  [1,0,1,1,1,0,1,0,1,0,1,0,1,0,1,0,1,1,1,0,1],
  [1,0,0,0,0,0,1,0,0,1,0,1,0,0,1,0,0,0,0,0,1],
  [1,1,1,1,1,1,1,0,1,0,1,0,1,0,1,1,1,1,1,1,1],
  [0,0,0,0,0,0,0,0,0,1,0,1,0,0,0,0,0,0,0,0,0],
  [1,0,1,1,0,1,1,0,1,0,1,0,1,0,0,1,0,1,1,0,1],
  [0,1,0,1,0,0,0,1,0,1,0,1,0,1,0,0,1,0,1,0,0],
  [1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1],
  [0,1,0,1,0,1,0,1,0,1,0,0,0,1,0,1,0,1,0,1,0],
  [1,0,1,1,0,1,1,0,1,0,1,0,1,0,1,0,1,1,0,0,1],
  [0,0,0,0,0,0,0,0,0,1,0,1,0,1,0,0,0,1,0,1,0],
  [1,1,1,1,1,1,1,0,1,0,1,0,1,0,1,1,1,1,1,1,1],
  [1,0,0,0,0,0,1,0,0,1,0,1,0,0,1,0,0,0,0,0,1],
  [1,0,1,1,1,0,1,0,1,0,1,0,1,0,1,0,1,1,1,0,1],
  [1,0,1,1,1,0,1,1,0,1,0,1,0,1,0,1,1,1,1,0,1],
  [1,0,1,1,1,0,1,0,1,0,1,1,1,0,1,0,1,1,1,0,1],
  [1,0,0,0,0,0,1,0,0,1,0,1,0,0,1,0,0,0,0,0,1],
  [1,1,1,1,1,1,1,0,1,0,1,0,1,0,1,1,1,1,1,1,1],
];

const MODULE_SIZE = QR_SIZE / MODULES.length;

export default function QRScanPhase({ onPhaseComplete }: QRScanPhaseProps) {
  const containerRef = useRef<SVGSVGElement>(null);
  const scanlineRef = useRef<SVGRectElement>(null);
  const qrGroupRef = useRef<SVGGElement>(null);
  const lineRef = useRef<SVGLineElement>(null);

  useGSAP(
    () => {
      const tl = gsap.timeline();

      // Phase 1: scanline sweeps top → bottom across the QR
      tl.to(scanlineRef.current, {
        attr: { y: QR_OFFSET + QR_SIZE - 8 },
        duration: 1.4,
        ease: 'power2.inOut',
      });

      // Phase 1 → 2: fade out scanline
      tl.to(
        scanlineRef.current,
        { opacity: 0, duration: 0.2, ease: 'power1.out' },
        '-=0.15',
      );

      // Phase 2: QR group scaleX collapses to 0 (becomes a thin vertical line)
      tl.to(
        qrGroupRef.current,
        {
          scaleX: 0,
          duration: 0.5,
          ease: 'power3.inOut',
          transformOrigin: '50% 50%',
        },
        '+=0.1',
      );

      // Reveal the clean vertical line element
      tl.to(
        lineRef.current,
        {
          opacity: 1,
          duration: 0.15,
          ease: 'power1.in',
          onComplete: onPhaseComplete,
        },
        '-=0.1',
      );
    },
    { scope: containerRef, dependencies: [onPhaseComplete] },
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
        <filter id="scanline-glow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* QR module grid */}
      <g ref={qrGroupRef}>
        {MODULES.map((row, ri) =>
          row.map((cell, ci) =>
            cell ? (
              <rect
                key={`${ri}-${ci}`}
                x={QR_OFFSET + ci * MODULE_SIZE}
                y={QR_OFFSET + ri * MODULE_SIZE}
                width={MODULE_SIZE - 0.5}
                height={MODULE_SIZE - 0.5}
                fill="currentColor"
                className="text-foreground"
              />
            ) : null,
          ),
        )}
      </g>

      {/* Scanline — starts at top of QR, sweeps down */}
      <rect
        ref={scanlineRef}
        x={QR_OFFSET}
        y={QR_OFFSET}
        width={QR_SIZE}
        height={8}
        fill="hsl(var(--primary))"
        opacity={0.85}
        rx={1}
        filter="url(#scanline-glow)"
      />

      {/* Vertical line revealed when QR collapses — initially hidden */}
      <line
        ref={lineRef}
        x1={VIEWBOX / 2}
        y1={QR_OFFSET}
        x2={VIEWBOX / 2}
        y2={QR_OFFSET + QR_SIZE}
        stroke="hsl(var(--primary))"
        strokeWidth={2}
        opacity={0}
      />
    </svg>
  );
}
