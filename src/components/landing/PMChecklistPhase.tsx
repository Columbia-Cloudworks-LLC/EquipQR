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
  /** 'left' = map on left 50%, checklist on right 50%
   *  'right' = map on right 50%, checklist on left 50% */
  slideDirection: 'left' | 'right';
  /**
   * Chosen dot's X position as a percentage of the full stage width.
   * Computed by HeroAnimation after accounting for the 50% map container.
   */
  dotStageX: number;
  /**
   * Chosen dot's Y position as a percentage of the full stage height.
   * Computed with the letterbox correction:
   *   dotStageY = 25 + (dot.cy / 100) * 50
   * so it reflects the actual rendered pixel position of the dot.
   */
  dotStageY: number;
  exportSeed: number;
  onComplete: () => void;
}

const ITEM_CHECK_INTERVAL = 0.25; // seconds between checkmarks
const PANEL_GAP = 1;              // % of stage between map edge and checklist box

/**
 * Phase 5 work-order overlay.
 *
 * Layout:
 *   - Full-stage SVG carries the connector line that originates exactly at
 *     the chosen dot's stage-level position (dotStageX%, dotStageY%).
 *   - Checklist panel is ALWAYS vertically centered in its half of the stage
 *     so the button is always in view regardless of the dot's Y position.
 *   - Export button is always rendered; it becomes fully opaque only after
 *     the last checklist item is checked.
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

  const exportTarget = useMemo(
    () => EXPORT_TARGETS[Math.abs(exportSeed) % EXPORT_TARGETS.length],
    [exportSeed],
  );

  const isLastItemChecked = checkedItems.size >= ALL_PM_ITEMS.length;

  // Sequential checkmarks via setTimeout — React state drives the check marks.
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    ALL_PM_ITEMS.forEach((item, i) => {
      timers.push(
        setTimeout(
          () => setCheckedItems(prev => new Set([...prev, item.id])),
          // 1.1 s to let line + box expand; then stagger checks
          1100 + i * ITEM_CHECK_INTERVAL * 1000,
        ),
      );
    });

    return () => timers.forEach(clearTimeout);
  }, []);

  useGSAP(
    () => {
      const tl = gsap.timeline();

      // 5b: line grows FROM the dot outward toward the checklist panel.
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

      // 5f: button press simulation after all checks complete
      const allChecksMs = 1100 + ALL_PM_ITEMS.length * ITEM_CHECK_INTERVAL * 1000;
      const buttonPressDelay = allChecksMs / 1000 + 0.5;

      tl.to(btnRef.current, {
        scale: 0.94,
        duration: 0.12,
        ease: 'power1.in',
        delay: buttonPressDelay,
      });
      tl.to(btnRef.current, { scale: 1, duration: 0.12, ease: 'power1.out' });

      // 5f cont: fade out entire overlay
      tl.to(containerRef.current, {
        opacity: 0,
        duration: 0.4,
        ease: 'power1.in',
        onComplete,
      }, '+=0.3');
    },
    { scope: containerRef, dependencies: [slideDirection, dotStageX, onComplete] },
  );

  // Checklist panel occupies the non-map 50% of the stage.
  const MAP_WIDTH = 50;
  const panelLeft = slideDirection === 'left'
    ? `${MAP_WIDTH + PANEL_GAP}%`
    : `${PANEL_GAP}%`;
  const panelRight = slideDirection === 'left'
    ? `${PANEL_GAP}%`
    : `${MAP_WIDTH + PANEL_GAP}%`;

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 pointer-events-none"
      data-testid="pm-checklist-phase"
    >
      {/* Full-stage connector line — x1 fixed at dot, x2 animates outward */}
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

      {/* Checklist panel — always vertically centered so the button is always visible */}
      <div
        className="absolute flex items-center"
        style={{
          left: panelLeft,
          right: panelRight,
          top: 0,
          bottom: 0,
        }}
      >
        <div
          ref={boxRef}
          className="w-full rounded-lg border border-primary/30 bg-background/92 backdrop-blur-sm p-2.5 overflow-hidden text-left"
          style={{ height: 0, opacity: 0 }}
        >
          <p className="text-[8px] font-semibold uppercase tracking-[0.18em] text-primary mb-1.5 px-0.5">
            Work Order
          </p>

          {PM_CHECKLIST_SECTIONS.map((section) => (
            <div key={section.title} className="mb-1.5">
              <p className="text-[7px] font-medium text-muted-foreground uppercase tracking-wide px-0.5 mb-0.5">
                {section.title}
              </p>
              {section.items.map((item) => {
                const isChecked = checkedItems.has(item.id);
                return (
                  <div
                    key={item.id}
                    className="flex items-center gap-1.5 px-0.5 py-0.5"
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

          {/* Export button — always rendered; becomes active after last check */}
          <button
            ref={btnRef}
            type="button"
            className={[
              'mt-2 w-full flex items-center justify-center gap-1 rounded-md px-2 py-1.5',
              'text-[7.5px] font-semibold transition-all duration-500 pointer-events-none',
              isLastItemChecked
                ? 'bg-primary text-primary-foreground opacity-100'
                : 'bg-primary/30 text-primary-foreground/60 opacity-60',
            ].join(' ')}
            data-testid="export-button"
          >
            <exportTarget.icon className="w-2.5 h-2.5" aria-hidden />
            {exportTarget.label}
          </button>
        </div>
      </div>
    </div>
  );
}
