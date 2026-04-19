import React, { useRef, useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface HorizontalChipRowProps {
  /** Content to render inside the scrollable row */
  children: React.ReactNode;
  /** Additional CSS classes for the container */
  className?: string;
  /** Accessible label for the chip row region */
  ariaLabel?: string;
  /** Gap between chips (default: gap-2) */
  gap?: 'gap-1' | 'gap-1.5' | 'gap-2' | 'gap-3';
}

/**
 * A horizontally scrollable container for chips/buttons with scroll hint gradients.
 * Shows a fade gradient on the right edge when content overflows to indicate scrollability.
 */
export const HorizontalChipRow: React.FC<HorizontalChipRowProps> = ({
  children,
  className,
  ariaLabel = 'Filter options',
  gap = 'gap-2',
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const rafIdRef = useRef<number | null>(null);
  const [showLeftHint, setShowLeftHint] = useState(false);
  const [showRightHint, setShowRightHint] = useState(false);

  // Schedule the actual DOM-measurement + state update on the next animation
  // frame. Calling this synchronously inside React effects (or while another
  // commit is in flight) forces a layout calculation that has been observed
  // to push the main-thread budget past 30ms on /dashboard/work-orders,
  // producing the "Forced reflow while executing JavaScript" violation.
  // Coalesce rapid invocations (scroll + resize + children-change) by
  // cancelling the pending frame before scheduling a new one.
  const updateScrollHints = useCallback(() => {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
    }
    rafIdRef.current = requestAnimationFrame(() => {
      rafIdRef.current = null;
      const el = scrollRef.current;
      if (!el) return;

      const { scrollLeft, scrollWidth, clientWidth } = el;
      const scrollThreshold = 8;

      setShowLeftHint(scrollLeft > scrollThreshold);
      setShowRightHint(scrollLeft < scrollWidth - clientWidth - scrollThreshold);
    });
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    // Initial check
    updateScrollHints();

    // Listen for scroll events
    el.addEventListener('scroll', updateScrollHints, { passive: true });

    // Listen for resize to recalculate
    const resizeObserver = new ResizeObserver(updateScrollHints);
    resizeObserver.observe(el);

    return () => {
      el.removeEventListener('scroll', updateScrollHints);
      resizeObserver.disconnect();
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [updateScrollHints]);

  // Re-check when children change (e.g., chips added/removed)
  useEffect(() => {
    updateScrollHints();
  }, [children, updateScrollHints]);

  return (
    <div className={cn('relative', className)} role="region" aria-label={ariaLabel}>
      {/* Left scroll hint gradient */}
      <div
        className={cn(
          'pointer-events-none absolute left-0 top-0 bottom-0 w-10 bg-gradient-to-r from-background via-background/80 to-transparent z-10 transition-opacity duration-200',
          showLeftHint ? 'opacity-100' : 'opacity-0'
        )}
        aria-hidden="true"
      />
      
      {/* Scrollable content */}
      <div
        ref={scrollRef}
        className={cn(
          'flex flex-nowrap overflow-x-auto pb-1 scrollbar-none',
          gap
        )}
      >
        {children}
      </div>
      
      {/* Right scroll hint gradient */}
      <div
        className={cn(
          'pointer-events-none absolute right-0 top-0 bottom-0 w-10 bg-gradient-to-l from-background via-background/80 to-transparent z-10 transition-opacity duration-200',
          showRightHint ? 'opacity-100' : 'opacity-0'
        )}
        aria-hidden="true"
      />
    </div>
  );
};

export default HorizontalChipRow;
