import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ArrowRight,
  ArrowLeft,
  QrCode,
  Smartphone,
  ScanLine,
  Tags,
} from 'lucide-react';
import LandingHeader from '@/components/landing/LandingHeader';
import LegalFooter from '@/components/layout/LegalFooter';

const QRCodeIntegrationFeature = () => {
  return (
    <div className="min-h-screen bg-background">
      <LandingHeader />
      <main>
        {/* Hero Section */}
        <section className="relative pt-32 pb-24 bg-gradient-to-br from-background via-background to-primary/5">
          <div className="container px-4 mx-auto">
            <div className="max-w-4xl mx-auto">
              <Link
                to="/#features"
                className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Features
              </Link>

              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 rounded-lg bg-primary/10">
                  <QrCode className="h-10 w-10 text-primary" />
                </div>
                <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground">
                  QR Code Integration
                </h1>
              </div>

              <p className="text-xl sm:text-2xl text-muted-foreground mb-8 max-w-3xl">
                Instantly access equipment details, work orders, and maintenance history with QR code scanning. Generate labels and streamline field operations from any device.
              </p>

              <Button asChild size="lg" className="text-lg px-8 py-6">
                <Link to="/auth?tab=signup">
                  Start Using QR Codes Free
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
                Why Use QR Code Integration?
              </h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                Eliminate manual lookup and data entry. Technicians scan a code and land directly on the right equipment or work order—no typing, no lost time.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              <Card className="border-border bg-card/50 backdrop-blur-sm hover:bg-card transition-colors">
                <CardHeader className="pb-4">
                  <div className="mb-4">
                    <ScanLine className="h-10 w-10 text-success" />
                  </div>
                  <CardTitle className="text-2xl">Instant Equipment Access</CardTitle>
                  <CardDescription className="text-base">
                    One scan, full context
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">
                    Scan a QR label on any asset to open its details, service history, and active work orders. No need to search by ID or serial number—everything is one tap away.
                  </p>
                  <ul className="mt-4 space-y-2">
                    <li className="text-sm text-muted-foreground flex items-center">
                      <span className="w-1.5 h-1.5 bg-success rounded-full mr-2 flex-shrink-0" />
                      Zero manual lookup
                    </li>
                    <li className="text-sm text-muted-foreground flex items-center">
                      <span className="w-1.5 h-1.5 bg-success rounded-full mr-2 flex-shrink-0" />
                      Full equipment context
                    </li>
                    <li className="text-sm text-muted-foreground flex items-center">
                      <span className="w-1.5 h-1.5 bg-success rounded-full mr-2 flex-shrink-0" />
                      Works on any smartphone
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-border bg-card/50 backdrop-blur-sm hover:bg-card transition-colors">
                <CardHeader className="pb-4">
                  <div className="mb-4">
                    <Smartphone className="h-10 w-10 text-info" />
                  </div>
                  <CardTitle className="text-2xl">Automated Tracking</CardTitle>
                  <CardDescription className="text-base">
                    Built-in audit trail
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">
                    Every scan can be logged for compliance and analytics. Know when and where equipment was accessed, and link scans to work order check-in or PM completion.
                  </p>
                  <ul className="mt-4 space-y-2">
                    <li className="text-sm text-muted-foreground flex items-center">
                      <span className="w-1.5 h-1.5 bg-info rounded-full mr-2 flex-shrink-0" />
                      Scan-to-work-order flow
                    </li>
                    <li className="text-sm text-muted-foreground flex items-center">
                      <span className="w-1.5 h-1.5 bg-info rounded-full mr-2 flex-shrink-0" />
                      Mobile-optimized scanning
                    </li>
                    <li className="text-sm text-muted-foreground flex items-center">
                      <span className="w-1.5 h-1.5 bg-info rounded-full mr-2 flex-shrink-0" />
                      Fast, reliable redirects
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-border bg-card/50 backdrop-blur-sm hover:bg-card transition-colors">
                <CardHeader className="pb-4">
                  <div className="mb-4">
                    <Tags className="h-10 w-10 text-warning" />
                  </div>
                  <CardTitle className="text-2xl">Generate Labels</CardTitle>
                  <CardDescription className="text-base">
                    Print and apply with ease
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">
                    Generate QR labels for equipment and inventory from the app. Print standard sizes, apply to assets, and start scanning. Labels work with any QR reader or the built-in scanner.
                  </p>
                  <ul className="mt-4 space-y-2">
                    <li className="text-sm text-muted-foreground flex items-center">
                      <span className="w-1.5 h-1.5 bg-warning rounded-full mr-2 flex-shrink-0" />
                      Equipment & inventory labels
                    </li>
                    <li className="text-sm text-muted-foreground flex items-center">
                      <span className="w-1.5 h-1.5 bg-warning rounded-full mr-2 flex-shrink-0" />
                      Printable formats
                    </li>
                    <li className="text-sm text-muted-foreground flex items-center">
                      <span className="w-1.5 h-1.5 bg-warning rounded-full mr-2 flex-shrink-0" />
                      In-app scanner
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
                QR codes connect your physical assets to EquipQR™ in seconds.
              </p>
            </div>

            <div className="max-w-4xl mx-auto">
              <div className="space-y-8">
                <div className="flex gap-6">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xl">
                    1
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">Generate QR Labels</h3>
                    <p className="text-muted-foreground">
                      From the equipment or inventory detail view, generate a QR code. Print labels at your preferred size and apply them to assets, bins, or parts.
                    </p>
                  </div>
                </div>

                <div className="flex gap-6">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xl">
                    2
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">Scan in the Field</h3>
                    <p className="text-muted-foreground">
                      Use your phone camera or the in-app QR scanner to scan any label. You’re redirected directly to that equipment’s or item’s page—no login required for public links when configured.
                    </p>
                  </div>
                </div>

                <div className="flex gap-6">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xl">
                    3
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">View Details & History</h3>
                    <p className="text-muted-foreground">
                      Access specs, maintenance history, active work orders, and linked documents. Create or accept work orders from the same screen when signed in.
                    </p>
                  </div>
                </div>

                <div className="flex gap-6">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xl">
                    4
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">Streamline Operations</h3>
                    <p className="text-muted-foreground">
                      Reduce errors and speed up check-ins, PMs, and parts lookup. QR codes work for equipment, inventory items, and custom workflows you build on top.
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
                See QR Code Integration in Action
              </h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                Here&apos;s what QR scanning and label generation look like in the EquipQR™ app.
              </p>
            </div>

            <div className="max-w-5xl mx-auto space-y-12">
              {/* Equipment QR Code */}
              <div className="bg-muted/50 rounded-xl p-8 border border-border">
                <div className="rounded-lg overflow-hidden mb-4 border border-border">
                  <img 
                    src="https://supabase.equipqr.app/storage/v1/object/public/landing-page-images/equipment-qr-codes.png"
                    alt="EquipQR Equipment QR Code modal showing scannable QR code with equipment URL and download options"
                    className="w-full h-auto"
                    loading="lazy"
                  />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Equipment QR Codes</h3>
                <p className="text-muted-foreground">
                  Each piece of equipment gets its own unique QR code. Technicians scan the code with any smartphone camera to instantly access equipment details, maintenance history, and active work orders—no app download required.
                </p>
              </div>

              {/* QR Code Modal - Generate & Print */}
              <div className="bg-muted/50 rounded-xl p-8 border border-border">
                <div className="rounded-lg overflow-hidden mb-4 border border-border">
                  <img 
                    src="https://supabase.equipqr.app/storage/v1/object/public/landing-page-images/generate-and-print-qr-labels.png"
                    alt="EquipQR QR Code generation modal with download and print options"
                    className="w-full h-auto"
                    loading="lazy"
                  />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Generate & Print Labels</h3>
                <p className="text-muted-foreground">
                  Generate QR codes from equipment or inventory detail views. Download in PNG format, print at standard sizes, apply to assets, and start scanning. Labels work with any QR reader or the app scanner.
                </p>
              </div>

              {/* Equipment List with QR Buttons */}
              <div className="bg-muted/50 rounded-xl p-8 border border-border">
                <div className="rounded-lg overflow-hidden mb-4 border border-border">
                  <img 
                    src="https://supabase.equipqr.app/storage/v1/object/public/landing-page-images/qr-quick-access-from-equipment-list.png"
                    alt="EquipQR Equipment list showing QR code buttons on each equipment card"
                    className="w-full h-auto"
                    loading="lazy"
                  />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Quick Access from Equipment List</h3>
                <p className="text-muted-foreground">
                  Every equipment card includes a QR code button for instant access. View, download, or print QR codes directly from your equipment list without navigating to individual detail pages.
                </p>
              </div>

              {/* Equipment Detail with QR Code */}
              <div className="bg-muted/50 rounded-xl p-8 border border-border">
                <div className="rounded-lg overflow-hidden mb-4 border border-border">
                  <img 
                    src="https://supabase.equipqr.app/storage/v1/object/public/landing-page-images/equipment-details-at-a-glance.png"
                    alt="EquipQR Equipment detail page with QR code button and full equipment information"
                    className="w-full h-auto"
                    loading="lazy"
                  />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Equipment Details at a Glance</h3>
                <p className="text-muted-foreground">
                  When technicians scan a QR code, they land directly on the equipment detail page with all relevant information: specs, maintenance history, work orders, and custom attributes—no searching required.
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
                Ready to Speed Up Field Operations?
              </h2>
              <p className="text-xl text-muted-foreground mb-8">
                Start using QR Code Integration today—completely free. Create your account, generate labels, and scan your way to faster workflows.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild size="lg" className="text-lg px-8 py-6">
                  <Link to="/auth?tab=signup">
                    Create Free Account
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="text-lg px-8 py-6">
                  <Link to="/#features">Explore More Features</Link>
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

export default QRCodeIntegrationFeature;
