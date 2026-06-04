import { StandardFeaturePage } from '@/components/landing/features/StandardFeaturePage';
import {
  benefits,
  capabilities,
  content,
  heroIcon,
  showcases,
  steps,
} from './data/inventoryManagementData';

const InventoryManagementFeature = () => (
  <StandardFeaturePage
    seoPath="/features/inventory"
    content={content}
    benefits={benefits}
    steps={steps}
    showcases={showcases}
    heroIcon={heroIcon}
    capabilities={capabilities}
  />
);

export default InventoryManagementFeature;
