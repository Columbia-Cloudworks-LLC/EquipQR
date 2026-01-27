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
  const [showLeftHint, setShowLeftHint] = useState(false);
  const [showRightHint, setShowRightHint] = useState(false);

  const updateScrollHints = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;

    const { scrollLeft, scrollWidth, clientWidth } = el;
    const scrollThreshold = 8; // Small threshold to avoid flickering at edges
    
    // Show left hint if scrolled past the beginning
    setShowLeftHint(scrollLeft > scrollThreshold);
    
    // Show right hint if there's more content to scroll
    setShowRightHint(scrollLeft < scrollWidth - clientWidth - scrollThreshold);
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
          'pointer-events-none absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-background to-transparent z-10 transition-opacity duration-200',
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
          'pointer-events-none absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-background to-transparent z-10 transition-opacity duration-200',
          showRightHint ? 'opacity-100' : 'opacity-0'
        )}
        aria-hidden="true"
      />
    </div>
  );
};

export default HorizontalChipRow;
