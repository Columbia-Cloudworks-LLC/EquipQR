import { QrCode } from 'lucide-react';
import { PageSEO } from '@/components/seo/PageSEO';
import { FeaturePageLayout } from '@/components/landing/features/FeaturePageLayout';
import { FeatureHero } from '@/components/landing/features/FeatureHero';
import { FeatureSection } from '@/components/landing/features/FeatureSection';
import { BenefitCard } from '@/components/landing/features/BenefitCard';
import { StepList } from '@/components/landing/features/StepList';
import { ScreenshotBlock } from '@/components/landing/features/ScreenshotBlock';
import { FeatureCTA } from '@/components/landing/features/FeatureCTA';
import { benefits, steps, screenshots } from './data/qrCodeIntegrationData';

const QRCodeIntegrationFeature = () => {
  return (
    <>
      <PageSEO
        title="QR Code Integration - EquipQR"
        description="Instantly access equipment details, work orders, and maintenance history with QR code scanning. Generate labels and streamline field operations from any device."
        path="/features/qr-code-integration"
        keywords="QR code tracking, equipment QR codes, QR code scanning, asset tracking QR codes, maintenance QR codes"
      />
      <FeaturePageLayout>
      <FeatureHero
        icon={QrCode}
        title="QR Code Integration"
        description="Instantly access equipment details, work orders, and maintenance history with QR code scanning. Generate labels and streamline field operations from any device."
        ctaText="Start Using QR Codes Free"
      />

      <FeatureSection
        title="Why Use QR Code Integration?"
        description="Eliminate manual lookup and data entry. Technicians scan a code and land directly on the right equipment or work order—no typing, no lost time."
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
        title="How It Works"
        description="QR codes connect your physical assets to EquipQR™ in seconds."
      >
        <StepList steps={steps} />
      </FeatureSection>

      <FeatureSection
        title="See QR Code Integration in Action"
        description="Here's what QR scanning and label generation look like in the EquipQR™ app."
        className="bg-muted/30"
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
        title="Ready to Speed Up Field Operations?"
        description="Start using QR Code Integration today—completely free. Create your account, generate labels, and scan your way to faster workflows."
        primaryCtaText="Create Free Account"
      />
      </FeaturePageLayout>
    </>
  );
};

export default QRCodeIntegrationFeature;
