import type { HTMLAttributes } from 'react';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface LandingRevealProps extends HTMLAttributes<HTMLDivElement> {
  delayMs?: number;
}

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

function getPrefersReducedMotion() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }

  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

const LandingReveal = ({
  children,
  className,
  delayMs = 0,
  style,
  ...props
}: LandingRevealProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(() => getPrefersReducedMotion());
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => getPrefersReducedMotion());

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const mediaQuery = window.matchMedia(REDUCED_MOTION_QUERY);
    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
      if (event.matches) {
        setIsVisible(true);
      }
    };

    setPrefersReducedMotion(mediaQuery.matches);
    if (mediaQuery.matches) {
      setIsVisible(true);
    }

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }

    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);

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
