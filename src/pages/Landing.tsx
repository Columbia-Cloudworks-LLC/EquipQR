import React, { useEffect } from 'react';
import { PageSEO } from '@/components/seo/PageSEO';
import LandingHeader from '@/components/landing/LandingHeader';
import HeroSection from '@/components/landing/HeroSection';
import FeaturesSection from '@/components/landing/FeaturesSection';
import SocialProofSection from '@/components/landing/SocialProofSection';
import AboutSection from '@/components/landing/AboutSection';
import CTASection from '@/components/landing/CTASection';
import LegalFooter from '@/components/layout/LegalFooter';

const Landing = () => {
  useEffect(() => {
    const hash = window.location.hash;
    if (hash) {
      const el = document.querySelector(hash);
      el?.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  return (
    <>
      <PageSEO
        title="EquipQR - Fleet Equipment Management Platform"
        description="Streamline equipment operations with QR code tracking, intelligent work order management, and enterprise-grade team collaboration. Trusted by industry leaders."
        path="/landing"
        keywords="fleet management, equipment tracking, QR code, work orders, CMMS, maintenance management, team collaboration, mobile-first, enterprise"
      />
      <div className="min-h-screen bg-background">
        <LandingHeader />
      <main>
        <HeroSection />
        <FeaturesSection id="features" />
        <div id="pricing">
          <SocialProofSection />
        </div>
        <AboutSection id="about" />
        <CTASection />
      </main>
      <LegalFooter />
      </div>
    </>
  );
};

export default Landing;