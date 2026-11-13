import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { BenefitCard } from '@/components/landing/features/BenefitCard';
import { CustomerTestimonialCard } from '@/components/landing/CustomerTestimonialCard';
import { repairShopWorkflows } from '@/pages/solutions/repairShopsWorkflows';
import { PageSEO } from '@/components/seo/PageSEO';
import LandingHeader from '@/components/landing/LandingHeader';
import LegalFooter from '@/components/layout/LegalFooter';
import { MarketingPhoto } from '@/components/landing/MarketingPhoto';

const RepairShops = () => {
  return (
    <>
      <PageSEO
        title="Built for Repair Shops"
        description="Scan a machine at drop-off and pull its service record on the phone. Photos stay on the work order. Close the job and send a QuickBooks draft."
        path="/solutions/repair-shops"
      />
      <div className="min-h-screen bg-background">
        <LandingHeader />
      <main
        id="main-content"
        tabIndex={-1}
        className="outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        {/* Hero Section */}
        <section className="relative pt-32 pb-24 bg-linear-to-br from-background via-background to-primary/5">
          <div className="container mx-auto grid items-center gap-10 px-4 lg:grid-cols-2 lg:gap-12">
            <div className="max-w-4xl text-left">
              <h1
                data-route-heading="true"
                tabIndex={-1}
                className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground mb-6 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                Built for Repair Shops
              </h1>
              <p className="text-xl sm:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto">
                A loader hits the lot. You scan the sticker. Last service, open issues, and photos are on the phone. Nobody walks back to the office to hunt a folder.
              </p>
              <div className="flex flex-col items-start gap-3">
                <Button asChild size="lg" className="text-lg px-8 py-6">
                  <Link to="/auth?tab=signup">
                    Get Started Free
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <p className="text-sm text-muted-foreground">No credit card. First scan in 20 minutes.</p>
              </div>
            </div>
            <MarketingPhoto photo="equipment" priority />
          </div>
        </section>

        {/* Proof strip */}
        <section className="py-10 bg-muted/20 border-y border-border/50">
          <div className="container px-4 mx-auto">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-8 sm:gap-16 text-center">
              <div>
                <p className="text-3xl font-bold text-primary">100%</p>
                <p className="text-sm text-muted-foreground mt-1">Field adoption</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-primary">50%</p>
                <p className="text-sm text-muted-foreground mt-1">Faster work order close</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-primary">$0</p>
                <p className="text-sm text-muted-foreground mt-1">To get started</p>
              </div>
            </div>
          </div>
        </section>

        {/* Key Workflows Section */}
        <section className="py-24 bg-muted/30">
          <div className="container px-4 mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
                Four jobs the shop already does
              </h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                Scan at drop-off. Photograph the damage. Open the owner and see what you have worked on. Close the job and send the QuickBooks draft.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 max-w-5xl mx-auto">
              {repairShopWorkflows.map((workflow) => (
                <BenefitCard key={workflow.title} {...workflow} />
              ))}
            </div>
          </div>
        </section>

        {/* 3-A Equipment Testimonial */}
        <section className="py-24 bg-background">
          <div className="container px-4 mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
                Trusted by Heavy Equipment Repair Shops
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Real results from shops already using EquipQR daily.
              </p>
            </div>

            <div className="flex justify-center">
              <CustomerTestimonialCard className="w-full" />
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 bg-muted/30">
          <div className="container px-4 mx-auto">
            <div className="text-center max-w-3xl mx-auto">
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
                Stick a QR on the next machine that rolls in
              </h2>
              <p className="text-xl text-muted-foreground mb-8">
                Your techs scan it on the floor. The work order closes from the same phone.
              </p>
              <div className="flex flex-col items-center gap-3">
                <Button asChild size="lg" className="text-lg px-8 py-6">
                  <Link to="/auth?tab=signup">
                    Get Started Free
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <p className="text-sm text-muted-foreground">No credit card. First scan in 20 minutes.</p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <LegalFooter />
      </div>
    </>
  );
};

export default RepairShops;
