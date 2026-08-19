import type { FeatureSeoEntry } from '@/lib/featureSeoContent';
import { FEATURE_SEO_BY_PATH } from '@/lib/featureSeoContent';
import type { MarketingRoute } from '@/lib/marketingRouteTypes';

export type FeatureMarketingRouteShell = {
  path: string;
  priority: string;
  changefreq: string;
  navLabel?: string;
  extraBodyParagraphs: readonly [string, ...string[]];
};

export type VisibleHowToStep = {
  title: string;
  description: string;
};

export function deriveFeatureMarketingRoute(
  shell: FeatureMarketingRouteShell,
): MarketingRoute {
  const seo = FEATURE_SEO_BY_PATH[shell.path];
  if (!seo) {
    throw new Error(`Missing FEATURE_SEO_BY_PATH entry for ${shell.path}`);
  }

  return {
    path: shell.path,
    priority: shell.priority,
    changefreq: shell.changefreq,
    title: seo.pageTitle,
    description: seo.description,
    heading: seo.heroTitle,
    navLabel: shell.navLabel,
    bodyParagraphs: [seo.description, ...shell.extraBodyParagraphs],
  };
}

export function mapVisibleStepsToHowTo(
  steps: readonly VisibleHowToStep[],
): { name: string; text: string }[] {
  return steps.map((step) => ({ name: step.title, text: step.description }));
}

export function assertFeatureMarketingParity(args: {
  routes: readonly MarketingRoute[];
  seoByPath: Record<string, FeatureSeoEntry>;
  visibleStepsByPath: Record<string, readonly VisibleHowToStep[]>;
}): void {
  const { routes, seoByPath, visibleStepsByPath } = args;
  const seoPaths = Object.keys(seoByPath).sort();
  const routeFeaturePaths = routes
    .filter((route) => route.path.startsWith('/features/'))
    .map((route) => route.path)
    .sort();
  const stepPaths = Object.keys(visibleStepsByPath).sort();

  if (seoPaths.join('\0') !== routeFeaturePaths.join('\0')) {
    throw new Error(
      `Feature path mismatch between FEATURE_SEO_BY_PATH [${seoPaths.join(', ')}] and MARKETING_ROUTES [${routeFeaturePaths.join(', ')}]`,
    );
  }

  if (seoPaths.join('\0') !== stepPaths.join('\0')) {
    throw new Error(
      `Feature path mismatch between FEATURE_SEO_BY_PATH [${seoPaths.join(', ')}] and visible steps [${stepPaths.join(', ')}]`,
    );
  }

  for (const path of seoPaths) {
    const seo = seoByPath[path];
    const route = routes.find((candidate) => candidate.path === path);
    if (!route) {
      throw new Error(`Missing MARKETING_ROUTES entry for ${path}`);
    }
    if (route.title !== seo.pageTitle) {
      throw new Error(`title drift for ${path}`);
    }
    if (route.description !== seo.description) {
      throw new Error(`description drift for ${path}`);
    }
    if (route.heading !== seo.heroTitle) {
      throw new Error(`heading drift for ${path}`);
    }
    if (route.bodyParagraphs[0] !== seo.description) {
      throw new Error(`bodyParagraphs[0] drift for ${path}`);
    }
    if (!seo.howTo) {
      throw new Error(`Missing howTo name/description for ${path}`);
    }

    const steps = visibleStepsByPath[path];
    if (!steps?.length) {
      throw new Error(`Missing visible steps for ${path}`);
    }

    const mapped = mapVisibleStepsToHowTo(steps);
    if (mapped.some((step) => !step.name || !step.text)) {
      throw new Error(`Empty HowTo step mapping for ${path}`);
    }
  }
}
