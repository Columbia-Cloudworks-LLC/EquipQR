import { useRef, useState, useEffect, useMemo } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';
import { Check } from 'lucide-react';
import {
  PM_CHECKLIST_SECTIONS,
  ALL_PM_ITEMS,
  EXPORT_TARGETS,
} from './pmChecklistData';

interface PMChecklistPhaseProps {
  /** 'left' = map is on the left 40%, checklist on the right 60%
   *  'right' = map is on the right 40%, checklist on the left 60% */
  slideDirection: 'left' | 'right';
  /**
   * The chosen dot's X position as a percentage of the FULL stage width
   * (already accounting for the 40% map width). Range: 0–100.
   * Computed by HeroAnimation as: (dot.cx / 100) * 40  (if slideDir='left')
   *                             or: 60 + (dot.cx / 100) * 40  (if slideDir='right')
   */
  dotStageX: number;
  /** The chosen dot's Y position as a percentage of the full stage height. Range: 0–100. */
  dotStageY: number;
  exportSeed: number;
  onComplete: () => void;
}

const ITEM_CHECK_INTERVAL = 0.25; // seconds between checkmarks
// Gap (% of stage) between map edge and checklist box left/right edge
const PANEL_INSET = 2;

/**
 * Phase 5: work-order sequence overlay.
 *
 * Rendered as an absolute inset-0 overlay on the full animation stage.
 * The connector line SVG spans the entire stage so it can start exactly
 * at the chosen dot's position and extend toward the checklist panel.
 *
 * Sequence:
 *   5b: Line grows from dot outward toward the checklist panel
 *   5c: Checklist box expands vertically, centered on the dot's Y
 *   5d: Items check off sequentially (0.25 s stagger)
 *   5e: Export button fades in
 *   5f: Button press → overlay fades out → onComplete
 */
export default function PMChecklistPhase({
  slideDirection,
  dotStageX,
  dotStageY,
  exportSeed,
  onComplete,
}: PMChecklistPhaseProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<SVGLineElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [showButton, setShowButton] = useState(false);

  const exportTarget = useMemo(
    () => EXPORT_TARGETS[Math.abs(exportSeed) % EXPORT_TARGETS.length],
    [exportSeed],
  );

  // Sequential checkmarks driven by setTimeout (React state, not GSAP).
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    ALL_PM_ITEMS.forEach((item, i) => {
      timers.push(
        setTimeout(
          () => setCheckedItems(prev => new Set([...prev, item.id])),
          1300 + i * ITEM_CHECK_INTERVAL * 1000,
        ),
      );
    });

    timers.push(
      setTimeout(
        () => setShowButton(true),
        1300 + ALL_PM_ITEMS.length * ITEM_CHECK_INTERVAL * 1000 + 300,
      ),
    );

    return () => timers.forEach(clearTimeout);
  }, []);

  useGSAP(
    () => {
      const tl = gsap.timeline();

      // 5b: line grows FROM the dot TOWARD the checklist panel.
      // x1 stays at the dot; x2 animates to the far edge of the stage.
      const farEdge = slideDirection === 'left' ? '98%' : '2%';
      tl.fromTo(
        lineRef.current,
        { attr: { x2: `${dotStageX}%` } },
        { attr: { x2: farEdge }, duration: 0.5, ease: 'power2.out' },
      );

      // 5c: checklist box expands from height-0
      tl.fromTo(
        boxRef.current,
        { height: 0, opacity: 0 },
        { height: 'auto', opacity: 1, duration: 0.45, ease: 'power2.out' },
        '-=0.1',
      );

      // 5f: button press + full fade-out after all checks + button visible
      const totalCheckDelay =
        (1300 + ALL_PM_ITEMS.length * ITEM_CHECK_INTERVAL * 1000 + 300 + 600) / 1000;

      tl.to(btnRef.current, {
        scale: 0.94,
        duration: 0.12,
        ease: 'power1.in',
        delay: totalCheckDelay,
      });
      tl.to(btnRef.current, { scale: 1, duration: 0.12, ease: 'power1.out' });
      tl.to(containerRef.current, {
        opacity: 0,
        duration: 0.4,
        ease: 'power1.in',
        onComplete,
      }, '+=0.2');
    },
    { scope: containerRef, dependencies: [slideDirection, dotStageX, onComplete] },
  );

  // Checklist panel occupies the non-map 60% of the stage.
  // For 'left' (map on left 40%): panel spans 42%→98% of stage width.
  // For 'right' (map on right 40%): panel spans 2%→58% of stage width.
  const MAP_WIDTH = 40;
  const panelLeft = slideDirection === 'left'
    ? `${MAP_WIDTH + PANEL_INSET}%`
    : `${PANEL_INSET}%`;
  const panelRight = slideDirection === 'left'
    ? `${PANEL_INSET}%`
    : `${MAP_WIDTH + PANEL_INSET}%`;

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 pointer-events-none"
      data-testid="pm-checklist-phase"
    >
      {/* Full-stage SVG carries the connector line.
          Line x1 stays fixed at the dot; x2 is animated outward by GSAP. */}
      <svg
        className="absolute inset-0 w-full h-full"
        aria-hidden="true"
        overflow="visible"
      >
        <line
          ref={lineRef}
          x1={`${dotStageX}%`}
          y1={`${dotStageY}%`}
          x2={`${dotStageX}%`}
          y2={`${dotStageY}%`}
          stroke="hsl(var(--primary))"
          strokeWidth={1.5}
          strokeDasharray="4 3"
          opacity={0.7}
        />
      </svg>

      {/* Checklist panel — positioned in the non-map region.
          Vertically centered on the dot's Y so the connector aligns perfectly. */}
      <div
        className="absolute"
        style={{
          left: panelLeft,
          right: panelRight,
          top: `${dotStageY}%`,
          transform: 'translateY(-50%)',
        }}
      >
        <div
          ref={boxRef}
          className="rounded-lg border border-primary/30 bg-background/90 backdrop-blur-sm p-2 overflow-hidden text-left"
          style={{ height: 0, opacity: 0 }}
        >
          <p className="text-[8px] font-semibold uppercase tracking-[0.18em] text-primary mb-1.5 px-1">
            Work Order
          </p>

          {PM_CHECKLIST_SECTIONS.map((section) => (
            <div key={section.title} className="mb-1.5">
              <p className="text-[7px] font-medium text-muted-foreground uppercase tracking-wide px-1 mb-0.5">
                {section.title}
              </p>
              {section.items.map((item) => {
                const isChecked = checkedItems.has(item.id);
                return (
                  <div
                    key={item.id}
                    className="flex items-center gap-1 px-1 py-0.5"
                    data-testid={`checklist-item-${item.id}`}
                  >
                    <div
                      className={[
                        'flex-shrink-0 w-3 h-3 rounded-sm border transition-colors duration-200',
                        isChecked
                          ? 'border-primary bg-primary'
                          : 'border-primary/40 bg-transparent',
                      ].join(' ')}
                    >
                      {isChecked && (
                        <Check className="w-3 h-3 text-background" strokeWidth={3} aria-hidden />
                      )}
                    </div>
                    <span className="text-[7.5px] leading-tight text-foreground/80">
                      {item.title}
                    </span>
                  </div>
                );
              })}
            </div>
          ))}

          {showButton && (
            <button
              ref={btnRef}
              type="button"
              className="mt-1.5 w-full flex items-center justify-center gap-1 rounded-md bg-primary px-2 py-1 text-[7.5px] font-semibold text-primary-foreground pointer-events-none"
              data-testid="export-button"
            >
              <exportTarget.icon className="w-2.5 h-2.5" aria-hidden />
              {exportTarget.label}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
