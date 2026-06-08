import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { PageSEO } from '@/components/seo/PageSEO';
import { FeaturePageLayout } from '@/components/landing/features/FeaturePageLayout';
import { FeatureHero } from '@/components/landing/features/FeatureHero';
import { FeatureSection } from '@/components/landing/features/FeatureSection';
import { BenefitCard } from '@/components/landing/features/BenefitCard';
import { StepList } from '@/components/landing/features/StepList';
import { FeatureShowcaseList } from '@/components/landing/features/FeatureShowcaseList';
import { FeatureCTA } from '@/components/landing/features/FeatureCTA';
import { CapabilitiesGrid } from '@/components/landing/features/CapabilitiesGrid';
import { getFeatureSeoByPath } from '@/pages/features/data/featureSeoContent';
import type {
  Benefit,
  Capability,
  FeaturePageContent,
  ShowcaseItem,
  Step,
} from '@/pages/features/data/featurePageTypes';

const DEFAULT_PRIMARY_CTA = 'Create Free Account';

export interface StandardFeaturePageProps {
  seoPath: string;
  content: FeaturePageContent;
  benefits: Benefit[];
  steps: Step[];
  showcases: ShowcaseItem[];
  heroIcon: LucideIcon;
  primaryCtaText?: string;
  capabilities?: Capability[];
  afterBenefits?: ReactNode;
  afterSteps?: ReactNode;
}

export const StandardFeaturePage = ({
  seoPath,
  content,
  benefits,
  steps,
  showcases,
  heroIcon,
  primaryCtaText = DEFAULT_PRIMARY_CTA,
  capabilities,
  afterBenefits,
  afterSteps,
}: StandardFeaturePageProps) => {
  const seo = getFeatureSeoByPath(seoPath);
  if (!seo) {
    throw new Error(`Missing feature SEO config for path: ${seoPath}`);
  }

  return (
    <>
      <PageSEO title={seo.pageTitle} description={seo.description} path={seo.path} />
      <FeaturePageLayout>
        <FeatureHero
          icon={heroIcon}
          title={seo.heroTitle}
          description={seo.heroDescription}
          ctaText={content.ctaPrimaryText ?? primaryCtaText}
        />

        <FeatureSection
          title={content.benefitsTitle}
          description={content.benefitsDescription}
          className="bg-muted/30"
        >
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3 max-w-6xl mx-auto">
            {benefits.map((benefit) => (
              <BenefitCard key={benefit.title} {...benefit} />
            ))}
          </div>
        </FeatureSection>

        {afterBenefits}

        {capabilities && capabilities.length > 0 && (
          <FeatureSection
            title={content.capabilitiesTitle!}
            description={content.capabilitiesDescription!}
          >
            <CapabilitiesGrid capabilities={capabilities} />
          </FeatureSection>
        )}

        <FeatureSection
          title={content.stepsTitle}
          description={content.stepsDescription}
          className={content.stepsClassName}
        >
          <StepList steps={steps} />
        </FeatureSection>

        {afterSteps}

        <FeatureSection
          title={content.showcaseTitle}
          description={content.showcaseDescription}
          className={content.showcaseClassName}
        >
          <FeatureShowcaseList items={showcases} />
        </FeatureSection>

        <FeatureCTA
          title={content.ctaTitle}
          description={content.ctaDescription}
          primaryCtaText={primaryCtaText}
          className={content.ctaClassName}
        />
      </FeaturePageLayout>
    </>
  );
};
