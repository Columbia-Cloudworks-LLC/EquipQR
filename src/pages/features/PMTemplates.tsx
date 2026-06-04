import { StandardFeaturePage } from '@/components/landing/features/StandardFeaturePage';
import { PmBuiltInTemplatesSection } from '@/components/landing/features/PmBuiltInTemplatesSection';
import {
  benefits,
  builtInTemplates,
  content,
  heroIcon,
  showcases,
  steps,
} from './data/pmTemplatesData';

const PMTemplatesFeature = () => (
  <StandardFeaturePage
    seoPath="/features/pm-templates"
    content={content}
    benefits={benefits}
    steps={steps}
    showcases={showcases}
    heroIcon={heroIcon}
    afterBenefits={<PmBuiltInTemplatesSection templates={builtInTemplates} />}
  />
);

export default PMTemplatesFeature;
