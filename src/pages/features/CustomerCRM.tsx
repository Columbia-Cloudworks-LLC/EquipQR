import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ArrowRight,
  ArrowLeft,
  UserCircle,
  Building2,
  History,
  Wrench,
} from 'lucide-react';
import LandingHeader from '@/components/landing/LandingHeader';
import LegalFooter from '@/components/layout/LegalFooter';

const CustomerCRMFeature = () => {
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
                  <UserCircle className="h-10 w-10 text-primary" />
                </div>
                <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground">
                  Customer CRM
                </h1>
              </div>

              <p className="text-xl sm:text-2xl text-muted-foreground mb-8 max-w-3xl">
                Link equipment to specific customers. Maintain a permanent service history for every client asset.
              </p>

              <Button asChild size="lg" className="text-lg px-8 py-6">
                <Link to="/auth?tab=signup">
                  Start Using Customer CRM Free
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
                Why Use Customer CRM?
              </h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                Know who owns what. Track service history per customer, streamline reporting, and keep client relationships organized.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              <Card className="border-border bg-card/50 backdrop-blur-sm hover:bg-card transition-colors">
                <CardHeader className="pb-4">
                  <div className="mb-4">
                    <Building2 className="h-10 w-10 text-success" />
                  </div>
                  <CardTitle className="text-2xl">Customer Profiles</CardTitle>
                  <CardDescription className="text-base">
                    Organize by client
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">
                    Create customer records and link equipment to each client. View all assets and contact info in one place. Perfect for rental companies, dealers, and service providers who manage client equipment.
                  </p>
                  <ul className="mt-4 space-y-2">
                    <li className="text-sm text-muted-foreground flex items-center">
                      <span className="w-1.5 h-1.5 bg-success rounded-full mr-2 flex-shrink-0" />
                      Customer-linked equipment
                    </li>
                    <li className="text-sm text-muted-foreground flex items-center">
                      <span className="w-1.5 h-1.5 bg-success rounded-full mr-2 flex-shrink-0" />
                      Contact and details
                    </li>
                    <li className="text-sm text-muted-foreground flex items-center">
                      <span className="w-1.5 h-1.5 bg-success rounded-full mr-2 flex-shrink-0" />
                      Single view per customer
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-border bg-card/50 backdrop-blur-sm hover:bg-card transition-colors">
                <CardHeader className="pb-4">
                  <div className="mb-4">
                    <History className="h-10 w-10 text-info" />
                  </div>
                  <CardTitle className="text-2xl">Service History Tracking</CardTitle>
                  <CardDescription className="text-base">
                    Permanent record per asset
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">
                    Every work order and PM completion is stored on the equipment. When equipment is linked to a customer, you have a full service history for that client’s assets—ideal for warranty, audits, and reporting.
                  </p>
                  <ul className="mt-4 space-y-2">
                    <li className="text-sm text-muted-foreground flex items-center">
                      <span className="w-1.5 h-1.5 bg-info rounded-full mr-2 flex-shrink-0" />
                      Work order history
                    </li>
                    <li className="text-sm text-muted-foreground flex items-center">
                      <span className="w-1.5 h-1.5 bg-info rounded-full mr-2 flex-shrink-0" />
                      PM records
                    </li>
                    <li className="text-sm text-muted-foreground flex items-center">
                      <span className="w-1.5 h-1.5 bg-info rounded-full mr-2 flex-shrink-0" />
                      Audit-ready documentation
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-border bg-card/50 backdrop-blur-sm hover:bg-card transition-colors">
                <CardHeader className="pb-4">
                  <div className="mb-4">
                    <Wrench className="h-10 w-10 text-warning" />
                  </div>
                  <CardTitle className="text-2xl">Equipment Ownership</CardTitle>
                  <CardDescription className="text-base">
                    Clear ownership visibility
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">
                    See at a glance which equipment belongs to which customer. Filter work orders and reports by customer. Use this for billing, maintenance summaries, and client-specific dashboards.
                  </p>
                  <ul className="mt-4 space-y-2">
                    <li className="text-sm text-muted-foreground flex items-center">
                      <span className="w-1.5 h-1.5 bg-warning rounded-full mr-2 flex-shrink-0" />
                      Ownership attribution
                    </li>
                    <li className="text-sm text-muted-foreground flex items-center">
                      <span className="w-1.5 h-1.5 bg-warning rounded-full mr-2 flex-shrink-0" />
                      Filter by customer
                    </li>
                    <li className="text-sm text-muted-foreground flex items-center">
                      <span className="w-1.5 h-1.5 bg-warning rounded-full mr-2 flex-shrink-0" />
                      Client reporting
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
                Customer CRM connects clients, equipment, and service history in one place.
              </p>
            </div>

            <div className="max-w-4xl mx-auto">
              <div className="space-y-8">
                <div className="flex gap-6">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xl">
                    1
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">Create Customers</h3>
                    <p className="text-muted-foreground">
                      Add customer records with name, contact info, and any custom fields. Organize clients by type or segment as needed.
                    </p>
                  </div>
                </div>

                <div className="flex gap-6">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xl">
                    2
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">Link Equipment</h3>
                    <p className="text-muted-foreground">
                      Assign equipment to customers. Each asset is tied to an owner, so you can filter and report by client. Equipment retains its full service history.
                    </p>
                  </div>
                </div>

                <div className="flex gap-6">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xl">
                    3
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">Track Service</h3>
                    <p className="text-muted-foreground">
                      Work orders and PMs are completed as usual. All activity is recorded on the equipment and, by extension, visible in the context of the owning customer.
                    </p>
                  </div>
                </div>

                <div className="flex gap-6">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xl">
                    4
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">Report by Customer</h3>
                    <p className="text-muted-foreground">
                      Filter work orders, equipment, and reports by customer. Use service history for warranty claims, audits, and client-specific maintenance summaries.
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
                See Customer CRM in Action
              </h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                Here&apos;s what customer-linked equipment and service history look like in the EquipQR™ app.
              </p>
            </div>

            <div className="max-w-5xl mx-auto space-y-12">
              <div className="bg-muted/50 rounded-xl p-8 border border-border">
                <div className="rounded-lg overflow-hidden mb-4 border border-border bg-muted aspect-video flex items-center justify-center">
                  <p className="text-sm text-muted-foreground">Screenshot placeholder — Customers list and equipment per customer</p>
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Customers & Linked Equipment</h3>
                <p className="text-muted-foreground">
                  View all customers and their linked equipment. Open a customer to see contact details and every asset you maintain for them. Create and edit customers, then assign equipment.
                </p>
              </div>

              <div className="bg-muted/50 rounded-xl p-8 border border-border">
                <div className="rounded-lg overflow-hidden mb-4 border border-border bg-muted aspect-video flex items-center justify-center">
                  <p className="text-sm text-muted-foreground">Screenshot placeholder — Equipment detail with customer and service history</p>
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Equipment Detail & Service History</h3>
                <p className="text-muted-foreground">
                  On each equipment record, see the owning customer and full service history: work orders, PM completions, and notes. Use this for warranty support, client reporting, and audits.
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
                Ready to Organize by Customer?
              </h2>
              <p className="text-xl text-muted-foreground mb-8">
                Start using Customer CRM today—completely free. Create your account, add customers, link equipment, and maintain a permanent service history for every client asset.
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

export default CustomerCRMFeature;
