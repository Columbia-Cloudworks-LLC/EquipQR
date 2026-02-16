import { Warehouse } from 'lucide-react';
import { PageSEO } from '@/components/seo/PageSEO';
import { FeaturePageLayout } from '@/components/landing/features/FeaturePageLayout';
import { FeatureHero } from '@/components/landing/features/FeatureHero';
import { FeatureSection } from '@/components/landing/features/FeatureSection';
import { BenefitCard } from '@/components/landing/features/BenefitCard';
import { StepList } from '@/components/landing/features/StepList';
import { ScreenshotBlock } from '@/components/landing/features/ScreenshotBlock';
import { FeatureCTA } from '@/components/landing/features/FeatureCTA';
import { CapabilitiesGrid } from '@/components/landing/features/CapabilitiesGrid';
import {
  capabilities,
  benefits,
  steps,
  screenshots,
} from './data/inventoryManagementData';

const InventoryManagementFeature = () => {
  return (
    <>
      <PageSEO
        title="Inventory Management - EquipQR"
        description="Track parts, materials, and supplies with real-time stock levels, location management, and equipment compatibility rules. Never run out of critical parts."
        path="/features/inventory"
        keywords="inventory management, parts tracking, equipment parts, stock management, CMMS inventory, parts inventory software"
      />
      <FeaturePageLayout>
      <FeatureHero
        icon={Warehouse}
        title="Inventory Management"
        description="Track parts and supplies with real-time stock levels, low stock alerts, and transaction history. Link inventory to equipment for compatibility tracking and streamlined work order workflows."
        ctaText="Start Using Inventory Management Free"
      />

      <FeatureSection
        title="Why Use Inventory Management?"
        description="Keep parts organized, avoid stockouts, and ensure the right components are available when your technicians need them. Full visibility and audit trails for every transaction."
        className="bg-muted/30"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
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
        <div className="max-w-5xl mx-auto space-y-12">
          {screenshots.map((screenshot) => (
            <ScreenshotBlock
              key={screenshot.title}
              imageUrl={screenshot.imageUrl}
              imageAlt={screenshot.imageAlt}
              title={screenshot.title}
              description={screenshot.description}
            />
          ))}
        </div>
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
