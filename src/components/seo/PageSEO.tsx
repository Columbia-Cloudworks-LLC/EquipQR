import { useEffect, type FC } from 'react';
import { resolveDocumentTitle } from '@/lib/resolveDocumentTitle';

interface PageSEOIndexedProps {
  title: string;
  description: string;
  path: string;
  ogImage?: string;
  noindex?: false;
}

interface PageSEONoindexProps {
  title: string;
  description?: string;
  path?: string;
  ogImage?: string;
  noindex: true;
}

type PageSEOProps = PageSEOIndexedProps | PageSEONoindexProps;

const BASE_URL = 'https://equipqr.app';
const DEFAULT_OG_IMAGE = `${BASE_URL}/og-image.png`;

const MANAGED_ATTR = 'data-equipqr-page-seo';

function resolveFullTitle(title: string, path?: string): string {
  if (path === '/' || /\bEquipQR\b/.test(title)) {
    return title;
  }

  return `${title} | EquipQR`;
}

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

function removeAllKeywordsMetas(head: HTMLHeadElement): void {
  head.querySelectorAll<HTMLMetaElement>('meta[name="keywords"]').forEach((n) => n.remove());
}

function upsertManagedHeadElement<T extends HTMLElement>(
  head: HTMLHeadElement,
  selector: string,
  create: () => T,
  apply: (el: T) => void,
  createdNodes: Element[],
  reusedRestores: Array<{ el: Element; snapshot: AttrSnapshot }>,
): T {
  let el = head.querySelector<T>(`${selector}[${MANAGED_ATTR}]`);
  if (!el) {
    el = head.querySelector<T>(selector);
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

/**
 * PageSEO component for managing per-route metadata
 *
 * Provides unique title, description, canonical URL, and Open Graph tags
 * for each marketing page to improve SEO and social sharing.
 * Uses direct document updates (no react-helmet-async) for React 18 compatibility.
 *
 * Deprecated meta keywords are never written; any existing keywords tags are removed while mounted.
 * Public QR/token pages pass `noindex` to keep secret links out of search indexes.
 */
export const PageSEO: FC<PageSEOProps> = ({
  title,
  description,
  path,
  ogImage = DEFAULT_OG_IMAGE,
  noindex = false,
}) => {
  const canonicalUrl = path !== undefined ? `${BASE_URL}${path}` : undefined;
  const fullTitle = resolveFullTitle(title, path);

  useEffect(() => {
    const previousTitle = document.title;
    const head = document.head;
    const createdNodes: Element[] = [];
    const reusedRestores: Array<{ el: Element; snapshot: AttrSnapshot }> = [];

    const upsertMeta = (
      selector: string,
      create: () => HTMLMetaElement,
      apply: (el: HTMLMetaElement) => void,
    ) =>
      upsertManagedHeadElement(head, selector, create, apply, createdNodes, reusedRestores);

    const upsertLink = (
      selector: string,
      create: () => HTMLLinkElement,
      apply: (el: HTMLLinkElement) => void,
    ) =>
      upsertManagedHeadElement(head, selector, create, apply, createdNodes, reusedRestores);

    document.title = fullTitle;

    removeAllKeywordsMetas(head);

    if (noindex) {
      upsertMeta('meta[name="robots"]', () => {
        const m = document.createElement('meta');
        m.name = 'robots';
        return m;
      }, (el) => {
        el.content = 'noindex, nofollow';
      });
    }

    if (description !== undefined) {
      upsertMeta('meta[name="description"]', () => {
        const m = document.createElement('meta');
        m.name = 'description';
        return m;
      }, (el) => {
        el.content = description;
      });
    }

    if (canonicalUrl !== undefined) {
      upsertLink('link[rel="canonical"]', () => document.createElement('link'), (el) => {
        el.rel = 'canonical';
        el.href = canonicalUrl;
      });
    }

    if (description !== undefined && canonicalUrl !== undefined) {
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
    }

    return () => {
      document.title = previousTitle;

      for (const el of createdNodes) {
        el.remove();
      }

      for (const { el, snapshot } of reusedRestores) {
        restoreAttributes(el, snapshot);
        el.removeAttribute(MANAGED_ATTR);
      }
    };
  }, [title, description, path, ogImage, noindex, canonicalUrl, fullTitle]);

  return null;
};
