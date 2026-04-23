import type { HTMLAttributes } from 'react';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion';

interface LandingRevealProps extends HTMLAttributes<HTMLDivElement> {
  delayMs?: number;
}

const LandingReveal = ({
  children,
  className,
  delayMs = 0,
  style,
  ...props
}: LandingRevealProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();
  const [isVisible, setIsVisible] = useState(prefersReducedMotion);

  useEffect(() => {
    if (prefersReducedMotion) {
      setIsVisible(true);
    }
  }, [prefersReducedMotion]);

  useEffect(() => {
    if (prefersReducedMotion) {
      return;
    }

    const element = containerRef.current;
    if (!element || typeof IntersectionObserver === 'undefined') {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) {
          return;
        }

        setIsVisible(true);
        observer.unobserve(entry.target);
      },
      {
        threshold: 0.2,
        rootMargin: '0px 0px -10% 0px',
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [prefersReducedMotion]);

  return (
    <div
      ref={containerRef}
      data-reveal="true"
      className={cn(
        'motion-reduce:transition-none motion-reduce:transform-none transition-all duration-500 ease-out will-change-transform',
        isVisible || prefersReducedMotion ? 'translate-y-0 opacity-100' : 'translate-y-5 opacity-0',
        className
      )}
      style={
        prefersReducedMotion
          ? style
          : {
              ...style,
              transitionDelay: `${delayMs}ms`,
            }
      }
      {...props}
    >
      {children}
    </div>
  );
};

export default LandingReveal;
