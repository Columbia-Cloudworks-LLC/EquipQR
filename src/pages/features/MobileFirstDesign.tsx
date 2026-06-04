import { StandardFeaturePage } from '@/components/landing/features/StandardFeaturePage';
import { benefits, content, heroIcon, showcases, steps } from './data/mobileFirstDesignData';

const MobileFirstDesignFeature = () => (
  <StandardFeaturePage
    seoPath="/features/mobile-first-design"
    content={content}
    benefits={benefits}
    steps={steps}
    showcases={showcases}
    heroIcon={heroIcon}
  />
);

export default MobileFirstDesignFeature;
