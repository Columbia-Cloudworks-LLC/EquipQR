import { PageSEO } from '@/components/seo/PageSEO';
import { FeaturePageLayout } from '@/components/landing/features/FeaturePageLayout';
import { FeatureHero } from '@/components/landing/features/FeatureHero';
import { FeatureSection } from '@/components/landing/features/FeatureSection';
import { BenefitCard } from '@/components/landing/features/BenefitCard';
import { StepList } from '@/components/landing/features/StepList';
import { FeatureShowcaseList } from '@/components/landing/features/FeatureShowcaseList';
import { FeatureCTA } from '@/components/landing/features/FeatureCTA';
import { PmBuiltInTemplatesSection } from '@/components/landing/features/PmBuiltInTemplatesSection';
import { getFeatureSeoByPath } from '@/pages/features/data/featureSeoContent';
import {
  benefits,
  builtInTemplates,
  content,
  heroIcon,
  showcases,
  steps,
} from './data/pmTemplatesData';

const seo = getFeatureSeoByPath('/features/pm-templates')!;

const PMTemplatesFeature = () => (
  <>
    <PageSEO title={seo.pageTitle} description={seo.description} path={seo.path} />
    <FeaturePageLayout>
      <FeatureHero
        icon={heroIcon}
        title={seo.heroTitle}
        description={seo.heroDescription}
        ctaText={content.ctaPrimaryText!}
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

      <PmBuiltInTemplatesSection templates={builtInTemplates} />

      <FeatureSection
        title={content.stepsTitle}
        description={content.stepsDescription}
        className={content.stepsClassName}
      >
        <StepList steps={steps} />
      </FeatureSection>

      <FeatureSection title={content.showcaseTitle} description={content.showcaseDescription}>
        <FeatureShowcaseList items={showcases} />
      </FeatureSection>

      <FeatureCTA
        title={content.ctaTitle}
        description={content.ctaDescription}
        primaryCtaText="Create Free Account"
        className={content.ctaClassName}
      />
    </FeaturePageLayout>
  </>
);

export default PMTemplatesFeature;
