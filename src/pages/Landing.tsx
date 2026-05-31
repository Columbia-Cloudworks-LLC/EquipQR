import React, { Suspense, lazy, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
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
  const location = useLocation();
  const prefersReducedMotion = usePrefersReducedMotion();
  // Snapshot reduced-motion preference in a ref so the hash-scroll effect
  // reads the current value without depending on it. Toggles to OS
  // accessibility settings must not re-run this effect (only hash changes should).
  const prefersReducedMotionRef = useRef(prefersReducedMotion);
  prefersReducedMotionRef.current = prefersReducedMotion;

  useEffect(() => {
    const rawHash = location.hash;
    if (!rawHash) return;

    const sectionId = rawHash.startsWith('#') ? rawHash.slice(1) : rawHash;
    if (!sectionId) return;

    let decodedId: string;
    try {
      decodedId = decodeURIComponent(sectionId);
    } catch {
      return;
    }

    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 60;

    const tryScroll = (): void => {
      if (cancelled || attempts++ > maxAttempts) return;

      const target = document.getElementById(decodedId);
      if (!target) {
        requestAnimationFrame(tryScroll);
        return;
      }

      target.scrollIntoView({
        behavior: prefersReducedMotionRef.current ? 'auto' : 'smooth',
      });
    };

    tryScroll();

    return () => {
      cancelled = true;
    };
  }, [location.hash]);

  return (
    <>
      <div className="min-h-screen bg-background">
        <LandingHeader />
        <main
          id="main-content"
          tabIndex={-1}
          className="outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
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