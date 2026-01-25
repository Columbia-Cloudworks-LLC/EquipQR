import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ArrowRight,
  ArrowLeft,
  Receipt,
  FileSpreadsheet,
  Link2,
  RefreshCw,
} from 'lucide-react';
import LandingHeader from '@/components/landing/LandingHeader';
import LegalFooter from '@/components/layout/LegalFooter';

const QuickBooksFeature = () => {
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
                  <Receipt className="h-10 w-10 text-primary" />
                </div>
                <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground">
                  QuickBooks
                </h1>
              </div>

              <p className="text-xl sm:text-2xl text-muted-foreground mb-8 max-w-3xl">
                Connect QuickBooks Online and export completed work orders as draft invoices. Map teams to customers and streamline billing from EquipQR™.
              </p>

              <Button asChild size="lg" className="text-lg px-8 py-6">
                <Link to="/auth?tab=signup">
                  Start Using QuickBooks Integration Free
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
                Why Use QuickBooks Integration?
              </h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                Turn completed work orders into QuickBooks draft invoices with one click. Map teams to customers, track export history, and keep billing in sync with your maintenance data.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              <Card className="border-border bg-card/50 backdrop-blur-sm hover:bg-card transition-colors">
                <CardHeader className="pb-4">
                  <div className="mb-4">
                    <FileSpreadsheet className="h-10 w-10 text-success" />
                  </div>
                  <CardTitle className="text-2xl">Export to Invoices</CardTitle>
                  <CardDescription className="text-base">
                    Work orders → draft invoices
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">
                    Export completed work orders to QuickBooks Online as draft invoices. Work order details, labor, and parts flow into the invoice. Review and send from QuickBooks when ready.
                  </p>
                  <ul className="mt-4 space-y-2">
                    <li className="text-sm text-muted-foreground flex items-center">
                      <span className="w-1.5 h-1.5 bg-success rounded-full mr-2 flex-shrink-0" />
                      One-click export
                    </li>
                    <li className="text-sm text-muted-foreground flex items-center">
                      <span className="w-1.5 h-1.5 bg-success rounded-full mr-2 flex-shrink-0" />
                      Draft invoices in QuickBooks
                    </li>
                    <li className="text-sm text-muted-foreground flex items-center">
                      <span className="w-1.5 h-1.5 bg-success rounded-full mr-2 flex-shrink-0" />
                      Export history & status
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-border bg-card/50 backdrop-blur-sm hover:bg-card transition-colors">
                <CardHeader className="pb-4">
                  <div className="mb-4">
                    <Link2 className="h-10 w-10 text-info" />
                  </div>
                  <CardTitle className="text-2xl">Team–Customer Mapping</CardTitle>
                  <CardDescription className="text-base">
                    Map teams to QuickBooks customers
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">
                    Equipment belongs to teams; teams map to QuickBooks customers. When you export a work order, the invoice is created for the customer linked to that equipment’s team. Set up mappings once in team settings.
                  </p>
                  <ul className="mt-4 space-y-2">
                    <li className="text-sm text-muted-foreground flex items-center">
                      <span className="w-1.5 h-1.5 bg-info rounded-full mr-2 flex-shrink-0" />
                      Team → QuickBooks customer
                    </li>
                    <li className="text-sm text-muted-foreground flex items-center">
                      <span className="w-1.5 h-1.5 bg-info rounded-full mr-2 flex-shrink-0" />
                      Search & select customers
                    </li>
                    <li className="text-sm text-muted-foreground flex items-center">
                      <span className="w-1.5 h-1.5 bg-info rounded-full mr-2 flex-shrink-0" />
                      Mappings preserved on disconnect
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-border bg-card/50 backdrop-blur-sm hover:bg-card transition-colors">
                <CardHeader className="pb-4">
                  <div className="mb-4">
                    <RefreshCw className="h-10 w-10 text-warning" />
                  </div>
                  <CardTitle className="text-2xl">OAuth Connect</CardTitle>
                  <CardDescription className="text-base">
                    Secure, simple connection
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">
                    Connect QuickBooks via OAuth in Organization Settings. Sign in with your Intuit account, authorize EquipQR™, and you’re done. Tokens refresh automatically; reconnect only if needed.
                  </p>
                  <ul className="mt-4 space-y-2">
                    <li className="text-sm text-muted-foreground flex items-center">
                      <span className="w-1.5 h-1.5 bg-warning rounded-full mr-2 flex-shrink-0" />
                      Connect in Organization Settings
                    </li>
                    <li className="text-sm text-muted-foreground flex items-center">
                      <span className="w-1.5 h-1.5 bg-warning rounded-full mr-2 flex-shrink-0" />
                      Auto token refresh
                    </li>
                    <li className="text-sm text-muted-foreground flex items-center">
                      <span className="w-1.5 h-1.5 bg-warning rounded-full mr-2 flex-shrink-0" />
                      Sandbox & production
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
                QuickBooks integration links work orders, teams, and customers to your accounting workflow.
              </p>
            </div>

            <div className="max-w-4xl mx-auto">
              <div className="space-y-8">
                <div className="flex gap-6">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xl">
                    1
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">Connect QuickBooks</h3>
                    <p className="text-muted-foreground">
                      In Organization Settings → Integrations, connect QuickBooks Online. Authorize via Intuit OAuth. Your org is linked to your QuickBooks company; connection status is shown in settings.
                    </p>
                  </div>
                </div>

                <div className="flex gap-6">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xl">
                    2
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">Map Teams to Customers</h3>
                    <p className="text-muted-foreground">
                      For each team, map to a QuickBooks customer. Work orders for equipment on that team export to that customer’s draft invoices. Use the customer search to find and select the right QuickBooks customer.
                    </p>
                  </div>
                </div>

                <div className="flex gap-6">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xl">
                    3
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">Complete Work Orders</h3>
                    <p className="text-muted-foreground">
                      Complete work orders as usual. Only work orders in “Completed” status can be exported. Ensure the equipment has a team and that team has a QuickBooks customer mapping.
                    </p>
                  </div>
                </div>

                <div className="flex gap-6">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xl">
                    4
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">Export to QuickBooks</h3>
                    <p className="text-muted-foreground">
                      From the work order detail, use “Export to QuickBooks” to create a draft invoice. View export history, open the invoice in QuickBooks, and manage billing there. Re-export is blocked once an invoice exists.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24">
          <div className="container px-4 mx-auto">
            <div className="text-center max-w-3xl mx-auto">
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
                Ready to Streamline Billing with QuickBooks?
              </h2>
              <p className="text-xl text-muted-foreground mb-8">
                Start using QuickBooks integration today—completely free. Create your account, connect QuickBooks, map teams to customers, and export work orders as draft invoices.
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

export default QuickBooksFeature;
