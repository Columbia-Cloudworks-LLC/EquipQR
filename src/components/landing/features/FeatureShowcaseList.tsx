import type { ReactNode } from 'react';
import { DemoVideo } from '@/components/landing/features/DemoVideo';
import { ScreenshotBlock } from '@/components/landing/features/ScreenshotBlock';
import { landingVideo } from '@/lib/landingVideo';
import type { ShowcaseItem } from '@/pages/features/data/featurePageTypes';

interface FeatureShowcaseListProps {
  items: ShowcaseItem[];
}

function renderShowcaseItem(item: ShowcaseItem): ReactNode {
  switch (item.kind) {
    case 'image':
      return (
        <ScreenshotBlock
          key={item.title}
          imageUrl={item.imageUrl}
          imageAlt={item.imageAlt}
          title={item.title}
          description={item.description}
        />
      );
    case 'demo-video':
      return (
        <div key={item.title} className="bg-muted/50 rounded-xl p-8 border border-border">
          <div className="mb-4">
            <DemoVideo baseName={item.baseName} buildUrl={landingVideo} alt={item.alt} />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">{item.title}</h3>
          <p className="text-muted-foreground">{item.description}</p>
        </div>
      );
    case 'image-grid':
      return (
        <div key={item.title} className="bg-muted/50 rounded-xl p-8 border border-border">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {item.images.map((image) => (
              <div key={image.imageAlt} className="rounded-lg overflow-hidden border border-border">
                <img src={image.imageUrl} alt={image.imageAlt} className="w-full h-auto" loading="lazy" />
              </div>
            ))}
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">{item.title}</h3>
          <p className="text-muted-foreground">{item.description}</p>
        </div>
      );
    default:
      return null;
  }
}

export const FeatureShowcaseList = ({ items }: FeatureShowcaseListProps) => (
  <div className="max-w-5xl mx-auto space-y-12">{items.map(renderShowcaseItem)}</div>
);
