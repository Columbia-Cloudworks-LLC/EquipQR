import { useEffect, useId, type FC } from 'react';

const MANAGED_ATTR = 'data-equipqr-jsonld';

export interface JsonLdProps {
  /** Stable unique id for this script node (multiple JsonLd instances per document). */
  id?: string;
  /** Schema.org-compatible JSON object or array (serialized with JSON.stringify). */
  data: Record<string, unknown> | Record<string, unknown>[];
}

/**
 * Injects or updates a single JSON-LD script in document.head and removes it on unmount.
 * Uses a stable id attribute so rerenders update the same node instead of duplicating.
 */
export const JsonLd: FC<JsonLdProps> = ({ id: explicitId, data }) => {
  const reactId = useId().replace(/:/g, '');
  const scriptId = explicitId ?? `equipqr-jsonld-${reactId}`;
  const serialized = JSON.stringify(data);

  useEffect(() => {
    const head = document.head;
    const selector = `script[type="application/ld+json"][${MANAGED_ATTR}="${scriptId}"]`;
    let el = head.querySelector<HTMLScriptElement>(selector);

    if (!el) {
      el = document.createElement('script');
      el.type = 'application/ld+json';
      el.setAttribute(MANAGED_ATTR, scriptId);
      head.appendChild(el);
    }

    el.textContent = serialized;

    return () => {
      el?.remove();
    };
  }, [scriptId, serialized]);

  return null;
};
