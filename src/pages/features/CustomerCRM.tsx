import { StandardFeaturePage } from '@/components/landing/features/StandardFeaturePage';
import { benefits, content, heroIcon, showcases, steps } from './data/customerCrmData';

const CustomerCRMFeature = () => (
  <StandardFeaturePage
    seoPath="/features/customer-crm"
    content={content}
    benefits={benefits}
    steps={steps}
    showcases={showcases}
    heroIcon={heroIcon}
  />
);

export default CustomerCRMFeature;
