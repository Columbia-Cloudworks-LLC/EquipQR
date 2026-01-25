import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ArrowRight,
  ArrowLeft,
  Smartphone,
  WifiOff,
  Hand,
  MonitorSmartphone,
} from 'lucide-react';
import LandingHeader from '@/components/landing/LandingHeader';
import LegalFooter from '@/components/layout/LegalFooter';

const MobileFirstDesignFeature = () => {
  return (
    <div className="min-h-screen bg-background">
      <LandingHeader />
      <main>
        {/* Hero Section */}
        <section className="relative pt-32 pb-24 bg-gradient-to-br from-background via-background to-primary/5">
          <div className="container px-4 mx-auto">
            <div className="max-w-4xl mx-auto">
              <Link
                to="/landing#features"
                className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Features
              </Link>

              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 rounded-lg bg-primary/10">
                  <Smartphone className="h-10 w-10 text-primary" />
                </div>
                <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground">
                  Mobile-First Design
                </h1>
              </div>

              <p className="text-xl sm:text-2xl text-muted-foreground mb-8 max-w-3xl">
                Native mobile experience for field technicians. Work offline and sync when connected. Optimized for all devices.
              </p>

              <Button asChild size="lg" className="text-lg px-8 py-6">
                <Link to="/auth?tab=signup">
                  Start Using EquipQR on Mobile Free
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Key Benefits Section */}
        <section className="py-24 bg-muted/30">
          <div className="container px-4 mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
                Why Use Mobile-First Design?
              </h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                EquipQR™ is built for the field. Technicians get a fast, touch-friendly experience on phones and tablets—even when connectivity is spotty.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              <Card className="border-border bg-card/50 backdrop-blur-sm hover:bg-card transition-colors">
                <CardHeader className="pb-4">
                  <div className="mb-4">
                    <WifiOff className="h-10 w-10 text-success" />
                  </div>
                  <CardTitle className="text-2xl">Offline Capability</CardTitle>
                  <CardDescription className="text-base">
                    Work without connectivity
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">
                    View equipment, work orders, and PM checklists when you’re offline. Capture updates and complete inspections; data syncs automatically when you’re back online.
                  </p>
                  <ul className="mt-4 space-y-2">
                    <li className="text-sm text-muted-foreground flex items-center">
                      <span className="w-1.5 h-1.5 bg-success rounded-full mr-2 flex-shrink-0" />
                      Offline access to key data
                    </li>
                    <li className="text-sm text-muted-foreground flex items-center">
                      <span className="w-1.5 h-1.5 bg-success rounded-full mr-2 flex-shrink-0" />
                      Sync when connected
                    </li>
                    <li className="text-sm text-muted-foreground flex items-center">
                      <span className="w-1.5 h-1.5 bg-success rounded-full mr-2 flex-shrink-0" />
                      No lost work
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-border bg-card/50 backdrop-blur-sm hover:bg-card transition-colors">
                <CardHeader className="pb-4">
                  <div className="mb-4">
                    <Hand className="h-10 w-10 text-info" />
                  </div>
                  <CardTitle className="text-2xl">Touch-Optimized UI</CardTitle>
                  <CardDescription className="text-base">
                    Designed for small screens
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">
                    Buttons, lists, and forms are sized for touch. Navigate quickly between equipment, work orders, and PM checklists. QR scanning, form entry, and checklist completion feel natural on a phone.
                  </p>
                  <ul className="mt-4 space-y-2">
                    <li className="text-sm text-muted-foreground flex items-center">
                      <span className="w-1.5 h-1.5 bg-info rounded-full mr-2 flex-shrink-0" />
                      Tap-friendly controls
                    </li>
                    <li className="text-sm text-muted-foreground flex items-center">
                      <span className="w-1.5 h-1.5 bg-info rounded-full mr-2 flex-shrink-0" />
                      Mobile-friendly forms
                    </li>
                    <li className="text-sm text-muted-foreground flex items-center">
                      <span className="w-1.5 h-1.5 bg-info rounded-full mr-2 flex-shrink-0" />
                      Fast navigation
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-border bg-card/50 backdrop-blur-sm hover:bg-card transition-colors">
                <CardHeader className="pb-4">
                  <div className="mb-4">
                    <MonitorSmartphone className="h-10 w-10 text-warning" />
                  </div>
                  <CardTitle className="text-2xl">Cross-Platform</CardTitle>
                  <CardDescription className="text-base">
                    Phone, tablet, desktop
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">
                    Use EquipQR on any device—iOS, Android, or desktop. The same account and data everywhere. Technicians work on phones in the field; admins manage from larger screens.
                  </p>
                  <ul className="mt-4 space-y-2">
                    <li className="text-sm text-muted-foreground flex items-center">
                      <span className="w-1.5 h-1.5 bg-warning rounded-full mr-2 flex-shrink-0" />
                      Works on all devices
                    </li>
                    <li className="text-sm text-muted-foreground flex items-center">
                      <span className="w-1.5 h-1.5 bg-warning rounded-full mr-2 flex-shrink-0" />
                      Responsive layout
                    </li>
                    <li className="text-sm text-muted-foreground flex items-center">
                      <span className="w-1.5 h-1.5 bg-warning rounded-full mr-2 flex-shrink-0" />
                      One app, any screen
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="py-24">
          <div className="container px-4 mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
                How It Works
              </h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                EquipQR™ adapts to how you work—in the shop, in the field, or at a desk.
              </p>
            </div>

            <div className="max-w-4xl mx-auto">
              <div className="space-y-8">
                <div className="flex gap-6">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xl">
                    1
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">Access Anywhere</h3>
                    <p className="text-muted-foreground">
                      Log in from your phone, tablet, or computer. The same data and features are available—responsive layout ensures a good experience on any screen size.
                    </p>
                  </div>
                </div>

                <div className="flex gap-6">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xl">
                    2
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">Work Offline When Needed</h3>
                    <p className="text-muted-foreground">
                      In low-signal areas, continue viewing equipment and work orders, and complete PM checklists. Changes sync automatically when you’re back online so nothing is lost.
                    </p>
                  </div>
                </div>

                <div className="flex gap-6">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xl">
                    3
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">Use Touch-Optimized Flows</h3>
                    <p className="text-muted-foreground">
                      Scan QR codes, fill forms, complete checklists, and add parts from your phone. Large tap targets and simple navigation keep field use quick and error-free.
                    </p>
                  </div>
                </div>

                <div className="flex gap-6">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xl">
                    4
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">Switch Devices Seamlessly</h3>
                    <p className="text-muted-foreground">
                      Start on a phone in the field and pick up on a tablet or desktop later. Your account, org, and data stay in sync across all devices.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Screenshots Section */}
        <section className="py-24 bg-muted/30">
          <div className="container px-4 mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
                See Mobile-First Design in Action
              </h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                Here&apos;s what the EquipQR™ app looks like on mobile and across devices.
              </p>
            </div>

            <div className="max-w-5xl mx-auto space-y-12">
              <div className="bg-muted/50 rounded-xl p-8 border border-border">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="rounded-lg overflow-hidden border border-border">
                    <img
                      src="https://supabase.equipqr.app/storage/v1/object/public/landing-page-images/mobile-work-order-1.png"
                      alt="Mobile work order view"
                      className="w-full h-auto"
                    />
                  </div>
                  <div className="rounded-lg overflow-hidden border border-border">
                    <img
                      src="https://supabase.equipqr.app/storage/v1/object/public/landing-page-images/mobile-work-order-status.png"
                      alt="Mobile work order status update"
                      className="w-full h-auto"
                    />
                  </div>
                  <div className="rounded-lg overflow-hidden border border-border">
                    <img
                      src="https://supabase.equipqr.app/storage/v1/object/public/landing-page-images/mobile-work-order-PM-checklist.png"
                      alt="Mobile PM checklist view"
                      className="w-full h-auto"
                    />
                  </div>
                  <div className="rounded-lg overflow-hidden border border-border">
                    <img
                      src="https://supabase.equipqr.app/storage/v1/object/public/landing-page-images/mobile-work-order-PM-checklist-input.png"
                      alt="Mobile PM checklist input"
                      className="w-full h-auto"
                    />
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Mobile Work Order & PM Checklist</h3>
                <p className="text-muted-foreground">
                  View and complete work orders on a phone. PM checklists are easy to work through with touch-friendly controls. Add notes, mark items OK or flag issues, and sync when back online.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24">
          <div className="container px-4 mx-auto">
            <div className="text-center max-w-3xl mx-auto">
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
                Ready to Work Better in the Field?
              </h2>
              <p className="text-xl text-muted-foreground mb-8">
                Start using EquipQR™ today—completely free. Create your account and use it on any device, with offline support and a touch-optimized experience built for technicians.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild size="lg" className="text-lg px-8 py-6">
                  <Link to="/auth?tab=signup">
                    Create Free Account
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="text-lg px-8 py-6">
                  <Link to="/landing#features">Explore More Features</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>
      <LegalFooter />
    </div>
  );
};

export default MobileFirstDesignFeature;
