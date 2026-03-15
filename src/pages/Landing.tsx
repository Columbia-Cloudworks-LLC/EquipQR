import React, { useEffect } from 'react';
import { PageSEO } from '@/components/seo/PageSEO';
import LandingHeader from '@/components/landing/LandingHeader';
import HeroSection from '@/components/landing/HeroSection';
import WhyDifferentSection from '@/components/landing/WhyDifferentSection';
import FeaturesSection from '@/components/landing/FeaturesSection';
import SocialProofSection from '@/components/landing/SocialProofSection';
import AboutSection from '@/components/landing/AboutSection';
import PricingSection from '@/components/landing/PricingSection';
import RoadmapSection from '@/components/landing/RoadmapSection';
import CTASection from '@/components/landing/CTASection';
import LandingFooter from '@/components/landing/LandingFooter';

interface LandingProps {
  /** When true, skip rendering PageSEO (used when embedded in SmartLanding) */
  skipSEO?: boolean;
}

const Landing: React.FC<LandingProps> = ({ skipSEO = false }) => {
  useEffect(() => {
    const rawHash = window.location.hash;
    if (!rawHash) return;

    const sectionId = rawHash.startsWith('#') ? rawHash.slice(1) : rawHash;
    if (!sectionId) return;

    let decodedId: string;
    try {
      decodedId = decodeURIComponent(sectionId);
    } catch {
      return;
    }

    const target = document.getElementById(decodedId);
    if (!target) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    target.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth' });
  }, []);

  return (
    <>
      {!skipSEO && (
        <PageSEO
          title="EquipQR | Heavy Equipment Repair Work Order Software with QR Tracking"
          description="Stop losing money to lost work orders. EquipQR gives heavy equipment repair shops secure QR code equipment tracking, team-based access, and one-click QuickBooks work order invoicing."
          path="/landing"
          keywords="heavy equipment repair work order software, QR code equipment tracking, QuickBooks work order integration, equipment maintenance software, shop work order management"
        />
      )}
      <div className="min-h-screen bg-background">
        <LandingHeader />
        <main id="main-content">
          <HeroSection />
          <WhyDifferentSection />
          <FeaturesSection id="features" />
          <AboutSection id="about" />
          <SocialProofSection />
          <PricingSection />
          <RoadmapSection />
          <CTASection />
        </main>
        <LandingFooter />
      </div>
    </>
  );
};

export default Landing;