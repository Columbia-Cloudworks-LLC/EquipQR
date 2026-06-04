import { StandardFeaturePage } from '@/components/landing/features/StandardFeaturePage';
import { benefits, content, heroIcon, showcases, steps } from './data/fleetVisualizationData';

const FleetVisualizationFeature = () => (
  <StandardFeaturePage
    seoPath="/features/fleet-visualization"
    content={content}
    benefits={benefits}
    steps={steps}
    showcases={showcases}
    heroIcon={heroIcon}
  />
);

export default FleetVisualizationFeature;
