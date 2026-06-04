import { Warehouse } from 'lucide-react';
import { PageSEO } from '@/components/seo/PageSEO';
import { FeaturePageLayout } from '@/components/landing/features/FeaturePageLayout';
import { FeatureHero } from '@/components/landing/features/FeatureHero';
import { FeatureSection } from '@/components/landing/features/FeatureSection';
import { BenefitCard } from '@/components/landing/features/BenefitCard';
import { StepList } from '@/components/landing/features/StepList';
import { FeatureShowcaseList } from '@/components/landing/features/FeatureShowcaseList';
import { FeatureCTA } from '@/components/landing/features/FeatureCTA';
import { CapabilitiesGrid } from '@/components/landing/features/CapabilitiesGrid';
import {
  capabilities,
  benefits,
  steps,
  screenshots,
} from './data/inventoryManagementData';
import { getFeatureSeoByPath } from '@/pages/features/data/featureSeoContent';

const seo = getFeatureSeoByPath('/features/inventory')!;

const InventoryManagementFeature = () => {
  return (
    <>
      <PageSEO title={seo.pageTitle} description={seo.description} path={seo.path} />
      <FeaturePageLayout>
      <FeatureHero
        icon={Warehouse}
        title={seo.heroTitle}
        description={seo.heroDescription}
        ctaText="Start Using Inventory Management Free"
      />

      <FeatureSection
        title="Why Use Inventory Management?"
        description="Keep parts organized, avoid stockouts, and ensure the right components are available when your technicians need them. Full visibility and audit trails for every transaction."
        className="bg-muted/30"
      >
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3 max-w-6xl mx-auto">
          {benefits.map((benefit) => (
            <BenefitCard
              key={benefit.title}
              icon={benefit.icon}
              iconColor={benefit.iconColor}
              title={benefit.title}
              subtitle={benefit.subtitle}
              description={benefit.description}
              benefits={benefit.benefits}
              benefitColor={benefit.benefitColor}
            />
          ))}
        </div>
      </FeatureSection>

      <FeatureSection
        title="Key Capabilities"
        description="Everything you need to manage parts and supplies: catalog, transactions, compatibility, and alerts—all in one place."
      >
        <CapabilitiesGrid capabilities={capabilities} />
      </FeatureSection>

      <FeatureSection
        title="How It Works"
        description="Inventory Management fits into your existing workflow—from receiving parts to consuming them on work orders."
        className="bg-muted/30"
      >
        <StepList steps={steps} />
      </FeatureSection>

      <FeatureSection
        title="See Inventory Management in Action"
        description="Here's what Inventory Management looks like in the EquipQR™ app."
      >
        <FeatureShowcaseList items={screenshots} />
      </FeatureSection>

      <FeatureCTA
        title="Ready to Organize Your Parts & Supplies?"
        description="Start using Inventory Management today—completely free. Create your account and begin tracking stock right away."
        primaryCtaText="Create Free Account"
      />
      </FeaturePageLayout>
    </>
  );
};

export default InventoryManagementFeature;
