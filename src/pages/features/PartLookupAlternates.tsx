import { StandardFeaturePage } from '@/components/landing/features/StandardFeaturePage';
import {
  benefits,
  capabilities,
  content,
  heroIcon,
  showcases,
  steps,
} from './data/partLookupAlternatesData';

const PartLookupAlternatesFeature = () => (
  <StandardFeaturePage
    seoPath="/features/part-lookup-alternates"
    content={content}
    benefits={benefits}
    steps={steps}
    showcases={showcases}
    heroIcon={heroIcon}
    capabilities={capabilities}
  />
);

export default PartLookupAlternatesFeature;
