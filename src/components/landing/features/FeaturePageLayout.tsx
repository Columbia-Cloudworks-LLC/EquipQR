import { ReactNode } from 'react';
import LandingHeader from '@/components/landing/LandingHeader';
import LegalFooter from '@/components/layout/LegalFooter';

interface FeaturePageLayoutProps {
  children: ReactNode;
}

export const FeaturePageLayout = ({ children }: FeaturePageLayoutProps) => {
  return (
    <div className="min-h-screen bg-background">
      <LandingHeader />
      <main>{children}</main>
      <LegalFooter />
    </div>
  );
};
