import { useRef, useState, useEffect, useMemo } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';
import { Check } from 'lucide-react';
import {
  PM_CHECKLIST_SECTIONS,
  ALL_PM_ITEMS,
  EXPORT_TARGETS,
} from './pmChecklistData';

export interface DotCoord {
  cx: number;
  cy: number;
}

interface PMChecklistPhaseProps {
  /** 'left'  = map slid left, checklist appears on the right side
   *  'right' = map slid right, checklist appears on the left side */
  slideDirection: 'left' | 'right';
  /** The chosen dot's position in the 100×100 viewBox coordinate space. */
  chosenDot: DotCoord;
  /** Seeded deterministically so the same stateKey always picks the same export target. */
  exportSeed: number;
  /** Called when the full Phase 5 sequence (fade-out included) is complete. */
  onComplete: () => void;
}

const ITEM_CHECK_INTERVAL = 0.25; // seconds between each checkmark

/**
 * Phase 5: work-order sequence overlay.
 *
 * Mounts as an absolutely-positioned overlay on top of the animation stage.
 * Renders entirely with HTML / Tailwind — no SVG — so the checklist text
 * is crisp at any viewport size and accessible to screen readers.
 *
 * Sequence:
 *   5a: The stage slides (handled by parent via CSS transform)
 *   5b: A horizontal line SVG grows from the chosen dot's edge toward the checklist
 *   5c: The checklist box expands vertically from height-0
 *   5d: Items check off sequentially (0.25s stagger)
 *   5e: "Export to …" button fades in
 *   5f: Button pulses (simulated press), then the whole panel fades out
 *   → onComplete fires
 */
export default function PMChecklistPhase({
  slideDirection,
  chosenDot,
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

  // Trigger sequential checkmarks after the component mounts (GSAP handles the
  // prior animations; the checks are driven by setTimeout for simplicity since
  // React state is the source of truth for the check marks).
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    ALL_PM_ITEMS.forEach((item, i) => {
      timers.push(
        setTimeout(
          () => setCheckedItems(prev => new Set([...prev, item.id])),
          // Offset 1.3s for the line + box expand animations, then stagger
          (1300 + i * ITEM_CHECK_INTERVAL * 1000),
        ),
      );
    });

    // Show export button after all checks
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

      // 5b: horizontal line grows from dot edge to panel edge
      const x1 = slideDirection === 'left' ? '0%' : '100%';
      const x2 = slideDirection === 'left' ? '100%' : '0%';
      tl.fromTo(
        lineRef.current,
        { attr: { x1, x2: x1 } },
        { attr: { x2 }, duration: 0.5, ease: 'power2.out' },
      );

      // 5c: checklist box expands vertically
      tl.fromTo(
        boxRef.current,
        { height: 0, opacity: 0 },
        { height: 'auto', opacity: 1, duration: 0.45, ease: 'power2.out' },
        '-=0.1',
      );

      // After all checks + button visible → button press simulation → fade out
      const totalCheckTime =
        (1300 + ALL_PM_ITEMS.length * ITEM_CHECK_INTERVAL * 1000 + 300 + 600) / 1000;

      tl.to(
        btnRef.current,
        {
          scale: 0.94,
          duration: 0.12,
          ease: 'power1.in',
          delay: totalCheckTime,
        },
      );
      tl.to(btnRef.current, { scale: 1, duration: 0.12, ease: 'power1.out' });

      // 5f: fade out the entire overlay
      tl.to(
        containerRef.current,
        { opacity: 0, duration: 0.4, ease: 'power1.in', onComplete },
        '+=0.2',
      );
    },
    { scope: containerRef, dependencies: [slideDirection, onComplete] },
  );

  const isRight = slideDirection === 'left';

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 pointer-events-none"
      data-testid="pm-checklist-phase"
    >
      {/* Connector line SVG */}
      <svg
        className="absolute inset-0 w-full h-full overflow-visible"
        aria-hidden="true"
      >
        <line
          ref={lineRef}
          x1={isRight ? '40%' : '60%'}
          y1={`${chosenDot.cy}%`}
          x2={isRight ? '40%' : '60%'}
          y2={`${chosenDot.cy}%`}
          stroke="hsl(var(--primary))"
          strokeWidth={1.5}
          strokeDasharray="4 3"
          opacity={0.7}
        />
      </svg>

      {/* Checklist panel */}
      <div
        className={`absolute top-[20%] w-[52%] ${isRight ? 'left-[46%]' : 'right-[46%]'}`}
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
                        <Check
                          className="w-3 h-3 text-background"
                          strokeWidth={3}
                          aria-hidden
                        />
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
              className="mt-1.5 w-full flex items-center justify-center gap-1 rounded-md bg-primary px-2 py-1 text-[7.5px] font-semibold text-primary-foreground transition-opacity pointer-events-none"
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
