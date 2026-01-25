import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ArrowRight,
  Search,
  Zap,
  GitCompare,
  PackageCheck,
  DollarSign,
  Layers,
  BookOpen,
  Link2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { FeaturePageLayout } from '@/components/landing/features/FeaturePageLayout';
import { FeatureHero } from '@/components/landing/features/FeatureHero';

interface Capability {
  name: string;
  description: string;
  icon: LucideIcon;
}

const capabilities: Capability[] = [
  {
    name: 'Part Number Search',
    description: 'Search by part number, description, or keyword across your inventory. Fast, fuzzy matching helps you find what you need even with partial IDs.',
    icon: Search,
  },
  {
    name: 'Alternate Groups',
    description: 'Define groups of interchangeable parts. When one is out of stock, quickly see approved alternates and swap without guesswork.',
    icon: Layers,
  },
  {
    name: 'Cross-Reference',
    description: 'Link OEM, aftermarket, and manufacturer part numbers. Look up by any number and see all related parts in one place.',
    icon: Link2,
  },
  {
    name: 'Stock Availability',
    description: 'See real-time stock levels and locations for each part and its alternates. Know instantly what you can use on a work order.',
    icon: PackageCheck,
  },
  {
    name: 'Catalog Integration',
    description: 'Search external catalogs and alternate sources alongside your inventory. Compare availability and cost before ordering.',
    icon: BookOpen,
  },
];

const PartLookupAlternatesFeature = () => {
  return (
    <FeaturePageLayout>
      <FeatureHero
        icon={Search}
        title="Part Lookup & Alternates"
        description="Quickly find parts by part number and discover interchangeable alternatives. Search inventory, external catalogs, and alternate part groups—all in one place."
        ctaText="Start Using Part Lookup Free"
      />

        {/* Key Benefits Section */}
        <section className="py-24 bg-muted/30">
          <div className="container px-4 mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
                Why Use Part Lookup & Alternates?
              </h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                Reduce downtime by finding the right part—or an approved substitute—fast. Fewer wrong orders, less
                guesswork, and better cost visibility.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              <Card className="border-border bg-card/50 backdrop-blur-sm hover:bg-card transition-colors">
                <CardHeader className="pb-4">
                  <div className="mb-4">
                    <Zap className="h-10 w-10 text-success" />
                  </div>
                  <CardTitle className="text-2xl">Fast Part Number Search</CardTitle>
                  <CardDescription className="text-base">Find parts in seconds</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">
                    Search by part number, description, or manufacturer. Results include your inventory, alternate
                    groups, and linked cross-references so you never miss a match.
                  </p>
                  <ul className="mt-4 space-y-2">
                    <li className="text-sm text-muted-foreground flex items-center">
                      <span className="w-1.5 h-1.5 bg-success rounded-full mr-2 flex-shrink-0"></span>
                      Instant search results
                    </li>
                    <li className="text-sm text-muted-foreground flex items-center">
                      <span className="w-1.5 h-1.5 bg-success rounded-full mr-2 flex-shrink-0"></span>
                      Fuzzy matching
                    </li>
                    <li className="text-sm text-muted-foreground flex items-center">
                      <span className="w-1.5 h-1.5 bg-success rounded-full mr-2 flex-shrink-0"></span>
                      Cross-catalog lookup
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-border bg-card/50 backdrop-blur-sm hover:bg-card transition-colors">
                <CardHeader className="pb-4">
                  <div className="mb-4">
                    <GitCompare className="h-10 w-10 text-info" />
                  </div>
                  <CardTitle className="text-2xl">Alternate Part Discovery</CardTitle>
                  <CardDescription className="text-base">Swap with confidence</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">
                    Create alternate groups for interchangeable parts. When the preferred part is unavailable, see
                    approved substitutes with stock levels and use them on work orders without second-guessing.
                  </p>
                  <ul className="mt-4 space-y-2">
                    <li className="text-sm text-muted-foreground flex items-center">
                      <span className="w-1.5 h-1.5 bg-info rounded-full mr-2 flex-shrink-0"></span>
                      Approved alternates only
                    </li>
                    <li className="text-sm text-muted-foreground flex items-center">
                      <span className="w-1.5 h-1.5 bg-info rounded-full mr-2 flex-shrink-0"></span>
                      One-click substitution
                    </li>
                    <li className="text-sm text-muted-foreground flex items-center">
                      <span className="w-1.5 h-1.5 bg-info rounded-full mr-2 flex-shrink-0"></span>
                      Reduce downtime
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-border bg-card/50 backdrop-blur-sm hover:bg-card transition-colors">
                <CardHeader className="pb-4">
                  <div className="mb-4">
                    <DollarSign className="h-10 w-10 text-warning" />
                  </div>
                  <CardTitle className="text-2xl">Stock & Cost Comparison</CardTitle>
                  <CardDescription className="text-base">Make informed decisions</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">
                    See real-time stock availability and cost for each part and its alternates. Compare options before
                    committing to a work order or purchase, and optimize for availability and budget.
                  </p>
                  <ul className="mt-4 space-y-2">
                    <li className="text-sm text-muted-foreground flex items-center">
                      <span className="w-1.5 h-1.5 bg-warning rounded-full mr-2 flex-shrink-0"></span>
                      Stock visibility
                    </li>
                    <li className="text-sm text-muted-foreground flex items-center">
                      <span className="w-1.5 h-1.5 bg-warning rounded-full mr-2 flex-shrink-0"></span>
                      Cost comparison
                    </li>
                    <li className="text-sm text-muted-foreground flex items-center">
                      <span className="w-1.5 h-1.5 bg-warning rounded-full mr-2 flex-shrink-0"></span>
                      Smarter ordering
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
                Part Lookup and alternates give you one place to search, compare, and substitute parts across inventory
                and catalogs.
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
                Part Lookup and alternates integrate with Inventory Management and work orders for a seamless
                lookup-to-use workflow.
              </p>
            </div>

            <div className="max-w-4xl mx-auto">
              <div className="space-y-8">
                <div className="flex gap-6">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xl">
                    1
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">Search by Part Number</h3>
                    <p className="text-muted-foreground">
                      Enter a part number, description, or keyword in Part Lookup. Results include matching inventory
                      items, alternate groups, and cross-references. Filter by availability or equipment compatibility
                      as needed.
                    </p>
                  </div>
                </div>

                <div className="flex gap-6">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xl">
                    2
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">View Alternates & Stock</h3>
                    <p className="text-muted-foreground">
                      Open any part to see its alternate group and stock levels. Compare availability and cost across
                      preferred and alternate options. Use what’s in stock or plan reorders accordingly.
                    </p>
                  </div>
                </div>

                <div className="flex gap-6">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xl">
                    3
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">Use in Work Orders</h3>
                    <p className="text-muted-foreground">
                      When adding parts to a work order, search from Part Lookup or pick from equipment-linked
                      inventory. Select an alternate if the primary is out of stock—consumption and history stay
                      accurate.
                    </p>
                  </div>
                </div>

                <div className="flex gap-6">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xl">
                    4
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">Manage Alternate Groups</h3>
                    <p className="text-muted-foreground">
                      Create and maintain alternate groups in the app. Add or remove equivalents, set preferred parts,
                      and keep cross-references up to date. Part Lookup always reflects your latest data.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 bg-muted/30">
          <div className="container px-4 mx-auto">
            <div className="text-center max-w-3xl mx-auto">
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
                Ready to Find Parts Faster?
              </h2>
              <p className="text-xl text-muted-foreground mb-8">
                Start using Part Lookup and alternates today—completely free. Create your account and begin searching
                your inventory and building alternate groups.
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
    </FeaturePageLayout>
  );
};

export default PartLookupAlternatesFeature;
