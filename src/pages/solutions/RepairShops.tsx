import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ExternalLink } from '@/components/ui/external-link';
import { ArrowRight, QrCode, Camera, UserCircle, Receipt } from 'lucide-react';
import { PageSEO } from '@/components/seo/PageSEO';
import LandingHeader from '@/components/landing/LandingHeader';
import LegalFooter from '@/components/layout/LegalFooter';

const RepairShops = () => {
  return (
    <>
      <PageSEO
        title="Built for Repair Shops"
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
              <div className="flex flex-col items-center gap-3">
                <Button asChild size="lg" className="text-lg px-8 py-6">
                  <Link to="/auth?tab=signup">
                    Create Free Shop Account
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <p className="text-sm text-muted-foreground">No credit card. First scan in 20 minutes.</p>
              </div>
            </div>
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
                Three Workflows That Transform Your Shop
              </h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                Everything you need to manage customer equipment, track repairs, and maintain service history—without the complexity or cost.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3 max-w-6xl mx-auto">
              {/* Instant Intake */}
              <Card className="border-border bg-card shadow-sm hover:border-primary/30 hover:bg-muted/40 transition-colors">
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
              <Card className="border-border bg-card shadow-sm hover:border-primary/30 hover:bg-muted/40 transition-colors">
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
              <Card className="border-border bg-card shadow-sm hover:border-primary/30 hover:bg-muted/40 transition-colors">
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

              {/* QuickBooks */}
              <Card className="border-border bg-card shadow-sm hover:border-primary/30 hover:bg-muted/40 transition-colors">
                <CardHeader className="pb-4">
                  <div className="mb-4">
                    <Receipt className="h-10 w-10 text-primary" />
                  </div>
                  <CardTitle className="text-2xl">QuickBooks Invoicing</CardTitle>
                  <CardDescription className="text-base">
                    Finished job → invoice in one click
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">
                    When a work order is complete, export it directly to QuickBooks Online as a draft invoice. Work order details, labor, and parts flow in automatically. No re-entering data in your accounting software.
                  </p>
                  <ul className="mt-4 space-y-2">
                    <li className="text-sm text-muted-foreground flex items-center">
                      <span className="w-1.5 h-1.5 bg-primary rounded-full mr-2 flex-shrink-0"></span>
                      One-click QB export
                    </li>
                    <li className="text-sm text-muted-foreground flex items-center">
                      <span className="w-1.5 h-1.5 bg-primary rounded-full mr-2 flex-shrink-0"></span>
                      Team → customer mapping
                    </li>
                    <li className="text-sm text-muted-foreground flex items-center">
                      <span className="w-1.5 h-1.5 bg-primary rounded-full mr-2 flex-shrink-0"></span>
                      Export history &amp; status
                    </li>
                  </ul>
                </CardContent>
              </Card>
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
              <Card className="max-w-3xl border-primary/20 bg-primary/5 w-full">
                <CardContent className="p-8">
                  <div className="flex items-start gap-4 mb-6">
                    <div className="flex-shrink-0">
                      <img
                        src="/branded-logos/3A-Equipment-Logo-Medium.png"
                        alt="3-A Equipment Logo"
                        className="h-20 w-20 object-contain"
                      />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-foreground mb-2">
                        <ExternalLink
                          href="https://3aequip.com"
                          className="text-primary hover:text-primary/80 transition-colors"
                        >
                          3-A Equipment
                        </ExternalLink>
                      </h3>
                      <Badge variant="secondary" className="mb-4">Heavy Equipment Repair Shop</Badge>
                      <p className="text-muted-foreground leading-relaxed">
                        &ldquo;We used to track PMs on paper and hope nothing slipped through. Now every machine has a QR code &mdash; scanning it proves exactly where it was dropped off and pulls up the full inspection history. I can see at a glance that every item was checked for defects, and so can my customers.&rdquo;
                      </p>
                      <p className="text-sm font-medium text-foreground mt-3">
                        &mdash; Matt Hankins, Owner, 3-A Equipment
                      </p>
                    </div>
                  </div>

                  <ul
                    aria-label="Customer results"
                    className="grid grid-cols-1 gap-4 border-t border-border pt-6 sm:grid-cols-2"
                  >
                    <li className="list-none">
                      <div className="rounded-2xl border border-primary/20 bg-primary/10 p-4 text-left shadow-sm shadow-primary/10">
                        <p className="text-4xl font-bold tracking-tight text-primary sm:text-5xl">100%</p>
                        <p className="mt-2 text-sm font-semibold uppercase tracking-[0.18em] text-foreground/90">Field adoption</p>
                        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Every technician on the team uses EquipQR daily.</p>
                      </div>
                    </li>
                    <li className="list-none">
                      <div className="rounded-2xl border border-primary/20 bg-primary/10 p-4 text-left shadow-sm shadow-primary/10">
                        <p className="text-4xl font-bold tracking-tight text-primary sm:text-5xl">50%</p>
                        <p className="mt-2 text-sm font-semibold uppercase tracking-[0.18em] text-foreground/90">Faster close times</p>
                        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Work orders close faster after moving the process into EquipQR.</p>
                      </div>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 bg-muted/30">
          <div className="container px-4 mx-auto">
            <div className="text-center max-w-3xl mx-auto">
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
                Ready to Transform Your Shop?
              </h2>
              <p className="text-xl text-muted-foreground mb-8">
                Join repair shops already using EquipQR™ to streamline operations and improve customer service — completely free to start.
              </p>
              <div className="flex flex-col items-center gap-3">
                <Button asChild size="lg" className="text-lg px-8 py-6">
                  <Link to="/auth?tab=signup">
                    Create Free Shop Account
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

