import { StandardFeaturePage } from '@/components/landing/features/StandardFeaturePage';
import { benefits, content, heroIcon, showcases, steps } from './data/qrCodeIntegrationData';

const QRCodeIntegrationFeature = () => (
  <StandardFeaturePage
    seoPath="/features/qr-code-integration"
    content={content}
    benefits={benefits}
    steps={steps}
    showcases={showcases}
    heroIcon={heroIcon}
  />
);

export default QRCodeIntegrationFeature;
