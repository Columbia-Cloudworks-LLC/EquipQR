import { StandardFeaturePage } from '@/components/landing/features/StandardFeaturePage';
import { benefits, content, heroIcon, showcases, steps } from './data/googleWorkspaceData';

const GoogleWorkspaceFeature = () => (
  <StandardFeaturePage
    seoPath="/features/google-workspace"
    content={content}
    benefits={benefits}
    steps={steps}
    showcases={showcases}
    heroIcon={heroIcon}
  />
);

export default GoogleWorkspaceFeature;
