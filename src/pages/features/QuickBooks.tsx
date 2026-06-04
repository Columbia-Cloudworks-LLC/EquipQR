import { StandardFeaturePage } from '@/components/landing/features/StandardFeaturePage';
import { benefits, content, heroIcon, showcases, steps } from './data/quickBooksData';

const QuickBooksFeature = () => (
  <StandardFeaturePage
    seoPath="/features/quickbooks"
    content={content}
    benefits={benefits}
    steps={steps}
    showcases={showcases}
    heroIcon={heroIcon}
  />
);

export default QuickBooksFeature;
