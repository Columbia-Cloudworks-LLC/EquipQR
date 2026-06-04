import type { LucideIcon } from 'lucide-react';

export interface Capability {
  name: string;
  description: string;
  icon: LucideIcon;
}

export interface Benefit {
  icon: LucideIcon;
  iconColor: 'success' | 'warning' | 'info';
  title: string;
  subtitle: string;
  description: string;
  benefits: string[];
  benefitColor: 'success' | 'warning' | 'info';
}

export interface Step {
  number: number;
  title: string;
  description: string;
}

export interface ImageScreenshot {
  kind: 'image';
  imageUrl: string;
  imageAlt: string;
  title: string;
  description: string;
}

export interface DemoVideoScreenshot {
  kind: 'demo-video';
  baseName: string;
  alt: string;
  title: string;
  description: string;
}

export interface ImageGridScreenshot {
  kind: 'image-grid';
  images: { imageUrl: string; imageAlt: string }[];
  title: string;
  description: string;
}

export type ShowcaseItem = ImageScreenshot | DemoVideoScreenshot | ImageGridScreenshot;

export interface FeaturePageContent {
  benefitsTitle: string;
  benefitsDescription: string;
  capabilitiesTitle?: string;
  capabilitiesDescription?: string;
  stepsTitle: string;
  stepsDescription: string;
  stepsClassName?: string;
  showcaseTitle: string;
  showcaseDescription: string;
  showcaseClassName?: string;
  ctaTitle: string;
  ctaDescription: string;
  ctaPrimaryText?: string;
  ctaClassName?: string;
}
