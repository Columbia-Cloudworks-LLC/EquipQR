import { useEffect, useRef, type FC } from 'react';

interface PageSEOProps {
  title: string;
  description: string;
  path: string;
  ogImage?: string;
  keywords?: string;
}

const BASE_URL = 'https://equipqr.app';
const DEFAULT_OG_IMAGE = `${BASE_URL}/og-image.png`;

const MANAGED_ATTR = 'data-equipqr-page-seo';

/** Attribute pairs excluding the managed marker (captured before we set MANAGED_ATTR). */
type AttrSnapshot = Array<[string, string]>;

function captureAttributes(el: Element): AttrSnapshot {
  const out: AttrSnapshot = [];
  for (let i = 0; i < el.attributes.length; i++) {
    const a = el.attributes[i]!;
    if (a.name === MANAGED_ATTR) continue;
    out.push([a.name, a.value]);
  }
  return out;
}

function restoreAttributes(el: Element, attrs: AttrSnapshot): void {
  for (const name of el.getAttributeNames()) {
    el.removeAttribute(name);
  }
  for (const [k, v] of attrs) {
    el.setAttribute(k, v);
  }
}

/**
 * PageSEO component for managing per-route metadata
 *
 * Provides unique title, description, canonical URL, and Open Graph tags
 * for each marketing page to improve SEO and social sharing.
 * Uses direct document updates (no react-helmet-async) for React 18 compatibility.
 */
export const PageSEO: FC<PageSEOProps> = ({
  title,
  description,
  path,
  ogImage = DEFAULT_OG_IMAGE,
  keywords,
}) => {
  const canonicalUrl = `${BASE_URL}${path}`;
  const fullTitle = path === '/' ? title : `${title} | EquipQR`;
  const previousTitleRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    const head = document.head;
    const createdNodes: Element[] = [];
    const reusedRestores: Array<{ el: Element; snapshot: AttrSnapshot }> = [];
    const removedKeywordSnapshots: AttrSnapshot[] = [];

    function upsertMeta(
      selector: string,
      create: () => HTMLMetaElement,
      apply: (el: HTMLMetaElement) => void
    ): HTMLMetaElement {
      let el = head.querySelector<HTMLMetaElement>(`${selector}[${MANAGED_ATTR}]`);
      if (!el) {
        el = head.querySelector<HTMLMetaElement>(selector);
      }
      if (!el) {
        el = create();
        head.appendChild(el);
        createdNodes.push(el);
      } else if (!el.hasAttribute(MANAGED_ATTR)) {
        reusedRestores.push({ el, snapshot: captureAttributes(el) });
      }
      el.setAttribute(MANAGED_ATTR, 'true');
      apply(el);
      return el;
    }

    function upsertLink(
      selector: string,
      create: () => HTMLLinkElement,
      apply: (el: HTMLLinkElement) => void
    ): HTMLLinkElement {
      let el = head.querySelector<HTMLLinkElement>(`${selector}[${MANAGED_ATTR}]`);
      if (!el) {
        el = head.querySelector<HTMLLinkElement>(selector);
      }
      if (!el) {
        el = create();
        head.appendChild(el);
        createdNodes.push(el);
      } else if (!el.hasAttribute(MANAGED_ATTR)) {
        reusedRestores.push({ el, snapshot: captureAttributes(el) });
      }
      el.setAttribute(MANAGED_ATTR, 'true');
      apply(el);
      return el;
    }

    function removeAllKeywordsMetas(): void {
      head.querySelectorAll<HTMLMetaElement>('meta[name="keywords"]').forEach((n) => {
        removedKeywordSnapshots.push(captureAttributes(n));
        n.remove();
      });
    }

    previousTitleRef.current = document.title;
    document.title = fullTitle;

    upsertMeta('meta[name="description"]', () => {
      const m = document.createElement('meta');
      m.name = 'description';
      return m;
    }, (el) => {
      el.content = description;
    });

    if (keywords) {
      upsertMeta('meta[name="keywords"]', () => {
        const m = document.createElement('meta');
        m.name = 'keywords';
        return m;
      }, (el) => {
        el.content = keywords;
      });
    } else {
      removeAllKeywordsMetas();
    }

    upsertLink('link[rel="canonical"]', () => document.createElement('link'), (el) => {
      el.rel = 'canonical';
      el.href = canonicalUrl;
    });

    const ogPairs: Array<[string, string]> = [
      ['og:type', 'website'],
      ['og:url', canonicalUrl],
      ['og:title', fullTitle],
      ['og:description', description],
      ['og:image', ogImage],
      ['og:image:width', '1200'],
      ['og:image:height', '630'],
      ['og:image:alt', `${title} - EquipQR`],
    ];

    for (const [prop, content] of ogPairs) {
      upsertMeta(
        `meta[property="${prop}"]`,
        () => {
          const m = document.createElement('meta');
          m.setAttribute('property', prop);
          return m;
        },
        (el) => {
          el.setAttribute('property', prop);
          el.content = content;
        }
      );
    }

    const twitterPairs: Array<[string, string]> = [
      ['twitter:card', 'summary_large_image'],
      ['twitter:site', '@equipqr'],
      ['twitter:title', fullTitle],
      ['twitter:description', description],
      ['twitter:image', ogImage],
    ];

    for (const [name, content] of twitterPairs) {
      upsertMeta(
        `meta[name="${name}"]`,
        () => {
          const m = document.createElement('meta');
          m.name = name;
          return m;
        },
        (el) => {
          el.name = name;
          el.content = content;
        }
      );
    }

    return () => {
      if (previousTitleRef.current !== undefined) {
        document.title = previousTitleRef.current;
      }

      for (const el of createdNodes) {
        el.remove();
      }

      for (const { el, snapshot } of reusedRestores) {
        restoreAttributes(el, snapshot);
        el.removeAttribute(MANAGED_ATTR);
      }

      for (const attrs of removedKeywordSnapshots) {
        const m = document.createElement('meta');
        restoreAttributes(m, attrs);
        head.appendChild(m);
      }
    };
  }, [title, description, path, ogImage, keywords, canonicalUrl, fullTitle]);

  return null;
};
