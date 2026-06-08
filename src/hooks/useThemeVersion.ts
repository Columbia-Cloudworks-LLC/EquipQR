import { useEffect, useMemo, useState } from 'react';

/** Re-renders when documentElement class/style changes (light/dark theme toggle). */
export function useThemeVersion(): number {
  const [themeVersion, setThemeVersion] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const observer = new MutationObserver(() => setThemeVersion((value) => value + 1));
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'style'],
    });
    return () => observer.disconnect();
  }, []);

  return themeVersion;
}

export function useIsDarkTheme(themeVersion: number): boolean {
  return useMemo(
    () =>
      typeof document !== 'undefined' &&
      document.documentElement.classList.contains('dark'),
    // themeVersion intentionally forces re-evaluation on theme toggle
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [themeVersion],
  );
}
