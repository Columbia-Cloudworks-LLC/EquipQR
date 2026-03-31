import React, { Suspense, lazy, useEffect } from 'react';
import LandingHeader from '@/components/landing/LandingHeader';
import HeroSection from '@/components/landing/HeroSection';
import LandingFooter from '@/components/landing/LandingFooter';

const WhyDifferentSection = lazy(() => import('@/components/landing/WhyDifferentSection'));
const HowItWorksSection = lazy(() => import('@/components/landing/HowItWorksSection'));
const FeaturesSection = lazy(() => import('@/components/landing/FeaturesSection'));
const SocialProofSection = lazy(() => import('@/components/landing/SocialProofSection'));
const AboutSection = lazy(() => import('@/components/landing/AboutSection'));
const PricingSection = lazy(() => import('@/components/landing/PricingSection'));
const RoadmapSection = lazy(() => import('@/components/landing/RoadmapSection'));
const CTASection = lazy(() => import('@/components/landing/CTASection'));

function BelowFoldFallback() {
  return (
    <div
      className="min-h-[12rem] w-full animate-pulse bg-muted/20"
      aria-hidden
    />
  );
}

const Landing: React.FC = () => {
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
      <div className="min-h-screen bg-background">
        <LandingHeader />
        <main id="main-content">
          <HeroSection />
          <Suspense fallback={<BelowFoldFallback />}>
            <WhyDifferentSection />
            <HowItWorksSection />
            <FeaturesSection id="features" />
            <AboutSection id="about" />
            <SocialProofSection />
            <PricingSection />
            <RoadmapSection />
            <CTASection />
          </Suspense>
        </main>
        <LandingFooter />
      </div>
    </>
  );
};

export default Landing;