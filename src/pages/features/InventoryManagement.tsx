import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ArrowRight,
  ArrowLeft,
  Warehouse,
  PackageCheck,
  AlertTriangle,
  Link2,
  ListChecks,
  History,
  Settings2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import LandingHeader from '@/components/landing/LandingHeader';
import LegalFooter from '@/components/layout/LegalFooter';

interface Capability {
  name: string;
  description: string;
  icon: LucideIcon;
}

const capabilities: Capability[] = [
  {
    name: 'Parts Catalog',
    description: 'Maintain a central catalog of parts and supplies with part numbers, descriptions, and preferred vendors.',
    icon: ListChecks,
  },
  {
    name: 'Transaction History',
    description: 'Track every receipt, issue, and adjustment with full audit trail. Know who moved what and when.',
    icon: History,
  },
  {
    name: 'Compatibility Rules',
    description: 'Define which parts fit which equipment. Link inventory items to specific makes, models, or equipment types.',
    icon: Link2,
  },
  {
    name: 'Low Stock Alerts',
    description: 'Set minimum quantities and get notified when stock falls below threshold. Never run out of critical parts.',
    icon: AlertTriangle,
  },
  {
    name: 'Equipment Linking',
    description: 'Associate inventory items with equipment for quick lookup during work orders and PM tasks.',
    icon: Settings2,
  },
];

const InventoryManagementFeature = () => {
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
                  <Warehouse className="h-10 w-10 text-primary" />
                </div>
                <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground">
                  Inventory Management
                </h1>
              </div>

              <p className="text-xl sm:text-2xl text-muted-foreground mb-8 max-w-3xl">
                Track parts and supplies with real-time stock levels, low stock alerts, and transaction history. Link
                inventory to equipment for compatibility tracking and streamlined work order workflows.
              </p>

              <Button asChild size="lg" className="text-lg px-8 py-6">
                <Link to="/auth?tab=signup">
                  Start Using Inventory Management Free
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
                Why Use Inventory Management?
              </h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                Keep parts organized, avoid stockouts, and ensure the right components are available when your
                technicians need them. Full visibility and audit trails for every transaction.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              <Card className="border-border bg-card/50 backdrop-blur-sm hover:bg-card transition-colors">
                <CardHeader className="pb-4">
                  <div className="mb-4">
                    <PackageCheck className="h-10 w-10 text-success" />
                  </div>
                  <CardTitle className="text-2xl">Real-Time Stock Levels</CardTitle>
                  <CardDescription className="text-base">Always know what's on hand</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">
                    Track quantities across locations with every receipt, issue, and adjustment recorded. View current
                    stock at a glance and drill into transaction history for any item.
                  </p>
                  <ul className="mt-4 space-y-2">
                    <li className="text-sm text-muted-foreground flex items-center">
                      <span className="w-1.5 h-1.5 bg-success rounded-full mr-2 flex-shrink-0"></span>
                      Live quantity updates
                    </li>
                    <li className="text-sm text-muted-foreground flex items-center">
                      <span className="w-1.5 h-1.5 bg-success rounded-full mr-2 flex-shrink-0"></span>
                      Transaction audit trail
                    </li>
                    <li className="text-sm text-muted-foreground flex items-center">
                      <span className="w-1.5 h-1.5 bg-success rounded-full mr-2 flex-shrink-0"></span>
                      Multi-location support
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-border bg-card/50 backdrop-blur-sm hover:bg-card transition-colors">
                <CardHeader className="pb-4">
                  <div className="mb-4">
                    <AlertTriangle className="h-10 w-10 text-warning" />
                  </div>
                  <CardTitle className="text-2xl">Low Stock Alerts</CardTitle>
                  <CardDescription className="text-base">Never run out of critical parts</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">
                    Set minimum quantities per item and get notified when stock falls below threshold. Proactively
                    reorder before downtime—integrate with your replenishment workflow.
                  </p>
                  <ul className="mt-4 space-y-2">
                    <li className="text-sm text-muted-foreground flex items-center">
                      <span className="w-1.5 h-1.5 bg-warning rounded-full mr-2 flex-shrink-0"></span>
                      Custom thresholds
                    </li>
                    <li className="text-sm text-muted-foreground flex items-center">
                      <span className="w-1.5 h-1.5 bg-warning rounded-full mr-2 flex-shrink-0"></span>
                      In-app notifications
                    </li>
                    <li className="text-sm text-muted-foreground flex items-center">
                      <span className="w-1.5 h-1.5 bg-warning rounded-full mr-2 flex-shrink-0"></span>
                      Reorder visibility
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-border bg-card/50 backdrop-blur-sm hover:bg-card transition-colors">
                <CardHeader className="pb-4">
                  <div className="mb-4">
                    <Link2 className="h-10 w-10 text-info" />
                  </div>
                  <CardTitle className="text-2xl">Equipment Compatibility</CardTitle>
                  <CardDescription className="text-base">Link parts to equipment</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">
                    Define which parts fit which equipment via compatibility rules. Technicians see only relevant
                    inventory when working on a unit, and work orders can consume linked parts with one click.
                  </p>
                  <ul className="mt-4 space-y-2">
                    <li className="text-sm text-muted-foreground flex items-center">
                      <span className="w-1.5 h-1.5 bg-info rounded-full mr-2 flex-shrink-0"></span>
                      Make/model rules
                    </li>
                    <li className="text-sm text-muted-foreground flex items-center">
                      <span className="w-1.5 h-1.5 bg-info rounded-full mr-2 flex-shrink-0"></span>
                      Equipment-specific parts
                    </li>
                    <li className="text-sm text-muted-foreground flex items-center">
                      <span className="w-1.5 h-1.5 bg-info rounded-full mr-2 flex-shrink-0"></span>
                      Work order integration
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Key Capabilities Section */}
        <section className="py-24">
          <div className="container px-4 mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">Key Capabilities</h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                Everything you need to manage parts and supplies: catalog, transactions, compatibility, and alerts—all in
                one place.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {capabilities.map((cap) => (
                <Card key={cap.name} className="border-border bg-card hover:bg-card/80 transition-colors">
                  <CardHeader>
                    <div className="flex items-center gap-3 mb-2">
                      <cap.icon className="h-6 w-6 text-primary" />
                      <CardTitle className="text-lg">{cap.name}</CardTitle>
                    </div>
                    <CardDescription>{cap.description}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="py-24 bg-muted/30">
          <div className="container px-4 mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">How It Works</h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                Inventory Management fits into your existing workflow—from receiving parts to consuming them on work
                orders.
              </p>
            </div>

            <div className="max-w-4xl mx-auto">
              <div className="space-y-8">
                <div className="flex gap-6">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xl">
                    1
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">Add Inventory Items</h3>
                    <p className="text-muted-foreground">
                      Create items with part numbers, descriptions, and optional min/max quantities. Organize with
                      categories or custom fields to match your catalog structure.
                    </p>
                  </div>
                </div>

                <div className="flex gap-6">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xl">
                    2
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">Record Transactions</h3>
                    <p className="text-muted-foreground">
                      Log receipts when stock arrives, issues when parts are used, and adjustments for counts or
                      corrections. Every change is tracked with timestamp and user.
                    </p>
                  </div>
                </div>

                <div className="flex gap-6">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xl">
                    3
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">Link to Equipment</h3>
                    <p className="text-muted-foreground">
                      Define compatibility rules so the right parts show up for each equipment type. Use Part Lookup and
                      alternates when creating work orders to pull from inventory quickly.
                    </p>
                  </div>
                </div>

                <div className="flex gap-6">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xl">
                    4
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">Stay Ahead of Stockouts</h3>
                    <p className="text-muted-foreground">
                      Rely on low-stock alerts to reorder before you run out. View dashboards and reports to analyze
                      usage patterns and optimize replenishment.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Screenshots Section */}
        <section className="py-24">
          <div className="container px-4 mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
                See Inventory Management in Action
              </h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                Here&apos;s what Inventory Management looks like in the EquipQR™ app.
              </p>
            </div>

            <div className="max-w-5xl mx-auto space-y-12">
              <div className="bg-muted/50 rounded-xl p-8 border border-border">
                <div className="rounded-lg overflow-hidden mb-4 border border-border">
                  <img
                    src="https://supabase.equipqr.app/storage/v1/object/public/landing-page-images/inventory-list.png"
                    alt="Inventory list view showing parts with stock levels, SKUs, and low stock indicators"
                    className="w-full h-auto"
                  />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Inventory List View</h3>
                <p className="text-muted-foreground">
                  Browse all inventory items with part numbers, descriptions, current stock levels, and low-stock
                  indicators. Filter, sort, and search to find what you need quickly.
                </p>
              </div>

              <div className="bg-muted/50 rounded-xl p-8 border border-border">
                <div className="rounded-lg overflow-hidden mb-4 border border-border">
                  <img
                    src="https://supabase.equipqr.app/storage/v1/object/public/landing-page-images/inventory-detail.png"
                    alt="Inventory item detail page showing stock information and transaction history"
                    className="w-full h-auto"
                  />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Item Detail & Transaction History</h3>
                <p className="text-muted-foreground">
                  Open any item to see full details, compatibility rules, linked equipment, and a complete transaction
                  history. Add receipts, issues, and adjustments from one place.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 bg-muted/30">
          <div className="container px-4 mx-auto">
            <div className="text-center max-w-3xl mx-auto">
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
                Ready to Organize Your Parts & Supplies?
              </h2>
              <p className="text-xl text-muted-foreground mb-8">
                Start using Inventory Management today—completely free. Create your account and begin tracking stock
                right away.
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

export default InventoryManagementFeature;
