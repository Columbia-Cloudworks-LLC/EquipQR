import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';
import { EquipQrMark } from './EquipQrMark';

interface QRScanPhaseProps {
  /** Called when Phase 2 (scaleX flatten) completes */
  onPhaseComplete: () => void;
}

const VIEWBOX = 320;
const QR_SIZE = 200;
const QR_OFFSET = (VIEWBOX - QR_SIZE) / 2; // 60

/**
 * Phase 1: The EquipQR brand icon (which was designed to look like a QR code)
 * is rendered at the centre of the stage. A glowing scanline sweeps top-to-bottom
 * across it, communicating "this is being scanned".
 *
 * Phase 2: The icon group collapses on the X-axis (scaleX → 0), leaving a
 * single vertical line that the next phase morphs into a U.S. state outline.
 *
 * The icon paths are rendered inside a nested <svg> using the same tight viewBox
 * as EquipQRIcon (850 365 222 222), so no coordinate translation is needed.
 */
export default function QRScanPhase({ onPhaseComplete }: QRScanPhaseProps) {
  const containerRef = useRef<SVGSVGElement>(null);
  const scanlineRef = useRef<SVGRectElement>(null);
  const qrGroupRef = useRef<SVGGElement>(null);
  const lineRef = useRef<SVGLineElement>(null);

  useGSAP(
    () => {
      const tl = gsap.timeline();

      // Phase 1: scanline sweeps top → bottom across the icon
      tl.to(scanlineRef.current, {
        attr: { y: QR_OFFSET + QR_SIZE - 8 },
        duration: 1.4,
        ease: 'power2.inOut',
      });

      // Fade out scanline just before collapse
      tl.to(
        scanlineRef.current,
        { opacity: 0, duration: 0.2, ease: 'power1.out' },
        '-=0.15',
      );

      // Phase 2: icon group scaleX collapses to 0 → thin vertical line
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

      // Reveal the clean vertical line as the icon disappears
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
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* EquipQR brand icon — designed to look like a QR code.
          Nested <svg> maps the icon's own coordinate space (viewBox 850 365 222 222)
          into the QR_OFFSET / QR_SIZE region of this stage. */}
      <g ref={qrGroupRef}>
        <svg
          x={QR_OFFSET}
          y={QR_OFFSET}
          width={QR_SIZE}
          height={QR_SIZE}
          viewBox="850 365 222 222"
        >
          <EquipQrMark />
        </svg>
      </g>

      {/* Scanline — starts at top of icon, sweeps down */}
      <rect
        ref={scanlineRef}
        x={QR_OFFSET}
        y={QR_OFFSET}
        width={QR_SIZE}
        height={8}
        fill="hsl(var(--primary))"
        opacity={0.9}
        rx={2}
        filter="url(#scanline-glow)"
      />

      {/* Vertical line revealed when icon collapses — initially hidden */}
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
