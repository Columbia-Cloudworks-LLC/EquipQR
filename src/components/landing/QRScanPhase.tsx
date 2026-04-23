import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';

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
          {/* Top-left finder pattern */}
          <path fill="#7B3EE7" d="M915.17,459h-52.99v-77.04h77.04v53.29c1.77-0.76,3.59-1.42,5.46-1.96V376.5h-87.95v87.96h56.39
            C913.67,462.58,914.38,460.77,915.17,459z"/>
          <path fill="#7B3EE7" d="M921.14,449.12c2.39-3.02,5.13-5.73,8.19-8.07v-49.2h-57.27v57.27H921.14z"/>

          {/* Top-right finder pattern */}
          <path fill="#7B3EE7" d="M967.46,372.86v59.74c4.53,1,8.81,2.67,12.74,4.9v-51.9h69.76v69.76h-52.07
            c2.18,3.93,3.8,8.21,4.76,12.74h60.04v-95.23H967.46z"/>
          <path fill="#7B3EE7" d="M1037.78,397.77h-45.42v45.42h45.42V397.77z M1030.75,436.16h-31.36V404.8h31.36V436.16z"/>

          {/* Bottom-right finder pattern */}
          <path fill="#7B3EE7" d="M999.35,497.25h50.6V567h-69.76v-49.01c-3.93,2.23-8.21,3.9-12.74,4.9v56.85h95.23v-95.23h-59.52
            C1002.51,489,1001.2,493.27,999.35,497.25z"/>
          <path fill="#7B3EE7" d="M989.63,528.26h20.97v-20.97h-17.61c-1.05,1.27-2.18,2.47-3.36,3.62V528.26z"/>
          <rect fill="#7B3EE7" x="1019.55" y="507.29" width="20.97" height="20.97"/>
          <rect fill="#7B3EE7" x="1019.55" y="535.99" width="20.97" height="20.97"/>
          <rect fill="#7B3EE7" x="989.63" y="535.99" width="20.97" height="20.97"/>

          {/* Bottom-left data modules */}
          <rect fill="#7B3EE7" x="914.44" y="547.52" width="27.5" height="27.5"/>
          <path fill="#7B3EE7" d="M914.44,494.89v25.13h24.24C927.67,515.14,918.92,506.11,914.44,494.89z"/>
          <rect fill="#7B3EE7" x="859.45" y="492.52" width="27.5" height="27.5"/>
          <rect fill="#7B3EE7" x="886.94" y="520.02" width="27.5" height="27.5"/>
          <rect fill="#7B3EE7" x="859.45" y="547.52" width="27.5" height="27.5"/>

          {/* Scan / link indicator */}
          <path fill="#7B3EE7" d="M983.82,463.2l-14.92,14.92l-4.34,4.34l-3.37,3.37l-10.54-2.82l-2.82-10.54l3.37-3.37l4.34-4.34
            l14.92-14.92c-9.69-4.31-21.44-2.5-29.38,5.44c-8.08,8.08-9.79,20.09-5.19,29.87l-13,13
            c1.61,2.47,3.49,4.81,5.66,6.97c2.16,2.16,4.5,4.05,6.97,5.66l13-13c9.78,4.6,21.79,2.89,29.87-5.19
            C986.32,484.64,988.13,472.89,983.82,463.2z"/>
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
