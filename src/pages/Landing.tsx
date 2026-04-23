import React, { Suspense, lazy, useEffect, useRef } from 'react';
import LandingHeader from '@/components/landing/LandingHeader';
import HeroAnimation from '@/components/landing/HeroAnimation';
import LandingFooter from '@/components/landing/LandingFooter';
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion';

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
  const prefersReducedMotion = usePrefersReducedMotion();
  // Snapshot reduced-motion preference in a ref so the hash-scroll effect
  // reads the current value without depending on it. This keeps the effect
  // a one-shot mount handler — toggling the OS accessibility setting must
  // not re-scroll the page back to the hash target.
  const prefersReducedMotionRef = useRef(prefersReducedMotion);
  prefersReducedMotionRef.current = prefersReducedMotion;

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

    target.scrollIntoView({
      behavior: prefersReducedMotionRef.current ? 'auto' : 'smooth',
    });
  }, []);

  return (
    <>
      <div className="min-h-screen bg-background">
        <LandingHeader />
        <main id="main-content">
          <HeroAnimation />
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