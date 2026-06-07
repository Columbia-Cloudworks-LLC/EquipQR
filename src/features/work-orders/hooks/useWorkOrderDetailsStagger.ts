import { useEffect, useState } from 'react';

export function useWorkOrderDetailsStagger() {
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setHasAnimated(true), 500);
    return () => clearTimeout(timer);
  }, []);

  const stagger = (index: number) =>
    !hasAnimated
      ? {
          className: 'animate-stagger-in',
          style: { animationDelay: `${index * 60}ms` } as React.CSSProperties,
        }
      : {};

  return { stagger };
}
