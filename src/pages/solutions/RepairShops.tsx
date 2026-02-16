import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, QrCode, Camera, UserCircle } from 'lucide-react';
import { PageSEO } from '@/components/seo/PageSEO';
import LandingHeader from '@/components/landing/LandingHeader';
import LegalFooter from '@/components/layout/LegalFooter';

const RepairShops = () => {
  return (
    <>
      <PageSEO
        title="Built for Repair Shops - EquipQR"
        description="Streamline your repair operations with QR code tracking, photo documentation, and customer management—all completely free. Built specifically for repair shops."
        path="/solutions/repair-shops"
        keywords="repair shop software, equipment repair tracking, customer management, QR code tracking, repair shop management, free repair shop software"
      />
      <div className="min-h-screen bg-background">
        <LandingHeader />
      <main id="main-content">
        {/* Hero Section */}
        <section className="relative pt-32 pb-24 bg-gradient-to-br from-background via-background to-primary/5">
          <div className="container px-4 mx-auto">
            <div className="text-center max-w-4xl mx-auto">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground mb-6">
                Built for Repair Shops
              </h1>
              <p className="text-xl sm:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto">
                Streamline your repair operations with QR code tracking, photo documentation, and customer management—all completely free.
              </p>
              <Button asChild size="lg" className="text-lg px-8 py-6">
                <Link to="/auth?mode=signup">
                  Create Free Shop Account
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Key Workflows Section */}
        <section className="py-24 bg-muted/30">
          <div className="container px-4 mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
                Three Workflows That Transform Your Shop
              </h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                Everything you need to manage customer equipment, track repairs, and maintain service history—without the complexity or cost.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {/* Instant Intake */}
              <Card className="border-border bg-card/50 backdrop-blur-sm hover:bg-card transition-colors">
                <CardHeader className="pb-4">
                  <div className="mb-4">
                    <QrCode className="h-10 w-10 text-primary" />
                  </div>
                  <CardTitle className="text-2xl">Instant Intake</CardTitle>
                  <CardDescription className="text-base">
                    QR codes for customer equipment
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">
                    When a customer brings in equipment, scan the QR code to instantly access the complete service history. No more searching through paper files or spreadsheets. Every piece of equipment gets a unique QR code that links directly to its full record.
                  </p>
                  <ul className="mt-4 space-y-2">
                    <li className="text-sm text-muted-foreground flex items-center">
                      <span className="w-1.5 h-1.5 bg-primary rounded-full mr-2 flex-shrink-0"></span>
                      Instant equipment lookup
                    </li>
                    <li className="text-sm text-muted-foreground flex items-center">
                      <span className="w-1.5 h-1.5 bg-primary rounded-full mr-2 flex-shrink-0"></span>
                      Complete service history
                    </li>
                    <li className="text-sm text-muted-foreground flex items-center">
                      <span className="w-1.5 h-1.5 bg-primary rounded-full mr-2 flex-shrink-0"></span>
                      Mobile-optimized scanning
                    </li>
                  </ul>
                </CardContent>
              </Card>

              {/* Photo Evidence */}
              <Card className="border-border bg-card/50 backdrop-blur-sm hover:bg-card transition-colors">
                <CardHeader className="pb-4">
                  <div className="mb-4">
                    <Camera className="h-10 w-10 text-primary" />
                  </div>
                  <CardTitle className="text-2xl">Photo Evidence</CardTitle>
                  <CardDescription className="text-base">
                    Technicians uploading damage photos to work orders
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">
                    Technicians can capture and upload photos directly to work orders from their mobile devices. Document damage, repairs in progress, and completed work with visual evidence that stays permanently linked to each service record.
                  </p>
                  <ul className="mt-4 space-y-2">
                    <li className="text-sm text-muted-foreground flex items-center">
                      <span className="w-1.5 h-1.5 bg-primary rounded-full mr-2 flex-shrink-0"></span>
                      Mobile photo uploads
                    </li>
                    <li className="text-sm text-muted-foreground flex items-center">
                      <span className="w-1.5 h-1.5 bg-primary rounded-full mr-2 flex-shrink-0"></span>
                      Permanent documentation
                    </li>
                    <li className="text-sm text-muted-foreground flex items-center">
                      <span className="w-1.5 h-1.5 bg-primary rounded-full mr-2 flex-shrink-0"></span>
                      Visual service history
                    </li>
                  </ul>
                </CardContent>
              </Card>

              {/* Customer Profiles */}
              <Card className="border-border bg-card/50 backdrop-blur-sm hover:bg-card transition-colors">
                <CardHeader className="pb-4">
                  <div className="mb-4">
                    <UserCircle className="h-10 w-10 text-primary" />
                  </div>
                  <CardTitle className="text-2xl">Customer Profiles</CardTitle>
                  <CardDescription className="text-base">
                    Linking equipment to owners
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">
                    Link every piece of equipment to its owner. Build comprehensive customer profiles that show all equipment serviced, complete service history, and maintenance schedules. Know exactly what you've worked on for each customer.
                  </p>
                  <ul className="mt-4 space-y-2">
                    <li className="text-sm text-muted-foreground flex items-center">
                      <span className="w-1.5 h-1.5 bg-primary rounded-full mr-2 flex-shrink-0"></span>
                      Customer equipment tracking
                    </li>
                    <li className="text-sm text-muted-foreground flex items-center">
                      <span className="w-1.5 h-1.5 bg-primary rounded-full mr-2 flex-shrink-0"></span>
                      Complete service history
                    </li>
                    <li className="text-sm text-muted-foreground flex items-center">
                      <span className="w-1.5 h-1.5 bg-primary rounded-full mr-2 flex-shrink-0"></span>
                      Relationship management
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24">
          <div className="container px-4 mx-auto">
            <div className="text-center max-w-3xl mx-auto">
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
                Ready to Transform Your Shop?
              </h2>
              <p className="text-xl text-muted-foreground mb-8">
                Join repair shops already using EquipQR™ to streamline operations and improve customer service—completely free, forever.
              </p>
              <Button asChild size="lg" className="text-lg px-8 py-6">
                <Link to="/auth?mode=signup">
                  Create Free Shop Account
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
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

