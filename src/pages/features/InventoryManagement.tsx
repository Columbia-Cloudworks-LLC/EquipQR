import { StandardFeaturePage } from '@/components/landing/features/StandardFeaturePage';
import { MarketingPhoto } from '@/components/landing/MarketingPhoto';
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
    afterBenefits={
      <section aria-labelledby="inventory-workshop-title" className="py-16 sm:py-20">
        <div className="container mx-auto grid items-center gap-8 px-4 lg:grid-cols-2 lg:gap-12">
          <MarketingPhoto photo="workshop" />
          <div>
            <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-primary">Ready for the next repair</p>
            <h2 id="inventory-workshop-title" className="mb-4 text-3xl font-bold text-foreground sm:text-4xl">
              Keep the workbench working
            </h2>
            <p className="text-lg leading-relaxed text-muted-foreground">
              The tools are ready. Make sure the parts are, too. Check what is on hand,
              find the part that fits the machine, and record what the job uses.
            </p>
            <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
              EquipQR keeps stock levels and work-order parts connected, so the next
              repair starts with a clear picture of what is available.
            </p>
          </div>
        </div>
      </section>
    }
  />
);

export default InventoryManagementFeature;
