import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ArrowRight,
  ArrowLeft,
  Building2,
  Users,
  RefreshCw,
  Shield,
} from 'lucide-react';
import LandingHeader from '@/components/landing/LandingHeader';
import LegalFooter from '@/components/layout/LegalFooter';

const GoogleWorkspaceFeature = () => {
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
                  <Building2 className="h-10 w-10 text-primary" />
                </div>
                <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground">
                  Google Workspace
                </h1>
              </div>

              <p className="text-xl sm:text-2xl text-muted-foreground mb-8 max-w-3xl">
                Connect your Google Workspace to import users from your directory. Sync members, assign roles, and let users sign in with Google for seamless access.
              </p>

              <Button asChild size="lg" className="text-lg px-8 py-6">
                <Link to="/auth?tab=signup">
                  Start Using Google Workspace Integration Free
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
                Why Use Google Workspace Integration?
              </h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                Import and manage organization members directly from your Google Workspace directory. No manual invites—sync users, assign roles, and rely on Google sign-in for access.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              <Card className="border-border bg-card/50 backdrop-blur-sm hover:bg-card transition-colors">
                <CardHeader className="pb-4">
                  <div className="mb-4">
                    <RefreshCw className="h-10 w-10 text-success" />
                  </div>
                  <CardTitle className="text-2xl">Directory Sync</CardTitle>
                  <CardDescription className="text-base">
                    One source of truth
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">
                    Connect your Workspace domain and sync users from your Google directory. Pull in everyone who belongs to your organization so you can add them as EquipQR™ members with a few clicks.
                  </p>
                  <ul className="mt-4 space-y-2">
                    <li className="text-sm text-muted-foreground flex items-center">
                      <span className="w-1.5 h-1.5 bg-success rounded-full mr-2 flex-shrink-0" />
                      Sync from Google directory
                    </li>
                    <li className="text-sm text-muted-foreground flex items-center">
                      <span className="w-1.5 h-1.5 bg-success rounded-full mr-2 flex-shrink-0" />
                      Re-sync when roster changes
                    </li>
                    <li className="text-sm text-muted-foreground flex items-center">
                      <span className="w-1.5 h-1.5 bg-success rounded-full mr-2 flex-shrink-0" />
                      Domain-scoped access
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-border bg-card/50 backdrop-blur-sm hover:bg-card transition-colors">
                <CardHeader className="pb-4">
                  <div className="mb-4">
                    <Users className="h-10 w-10 text-info" />
                  </div>
                  <CardTitle className="text-2xl">Import Members</CardTitle>
                  <CardDescription className="text-base">
                    Select who joins your org
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">
                    After syncing, choose which directory users to add as organization members. Select individuals or bulk-add. Pending users appear until they sign in with Google—then they’re automatically added.
                  </p>
                  <ul className="mt-4 space-y-2">
                    <li className="text-sm text-muted-foreground flex items-center">
                      <span className="w-1.5 h-1.5 bg-info rounded-full mr-2 flex-shrink-0" />
                      Pick users from directory
                    </li>
                    <li className="text-sm text-muted-foreground flex items-center">
                      <span className="w-1.5 h-1.5 bg-info rounded-full mr-2 flex-shrink-0" />
                      Pending until sign-in
                    </li>
                    <li className="text-sm text-muted-foreground flex items-center">
                      <span className="w-1.5 h-1.5 bg-info rounded-full mr-2 flex-shrink-0" />
                      Assign roles on add
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-border bg-card/50 backdrop-blur-sm hover:bg-card transition-colors">
                <CardHeader className="pb-4">
                  <div className="mb-4">
                    <Shield className="h-10 w-10 text-warning" />
                  </div>
                  <CardTitle className="text-2xl">Google Sign-In</CardTitle>
                  <CardDescription className="text-base">
                    Secure, familiar login
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">
                    Members sign in with their Google account. Admin access is granted after they authenticate with a Workspace identity. No separate EquipQR™ passwords to manage—just Google.
                  </p>
                  <ul className="mt-4 space-y-2">
                    <li className="text-sm text-muted-foreground flex items-center">
                      <span className="w-1.5 h-1.5 bg-warning rounded-full mr-2 flex-shrink-0" />
                      Sign in with Google
                    </li>
                    <li className="text-sm text-muted-foreground flex items-center">
                      <span className="w-1.5 h-1.5 bg-warning rounded-full mr-2 flex-shrink-0" />
                      Workspace identity
                    </li>
                    <li className="text-sm text-muted-foreground flex items-center">
                      <span className="w-1.5 h-1.5 bg-warning rounded-full mr-2 flex-shrink-0" />
                      No extra passwords
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
                Google Workspace integration connects your directory to EquipQR™ in a few steps.
              </p>
            </div>

            <div className="max-w-4xl mx-auto">
              <div className="space-y-8">
                <div className="flex gap-6">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xl">
                    1
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">Connect Google Workspace</h3>
                    <p className="text-muted-foreground">
                      In Organization Settings → Integrations, connect your Google Workspace. Authorize EquipQR™ to access your organization’s directory. Your domain is linked to your EquipQR™ org.
                    </p>
                  </div>
                </div>

                <div className="flex gap-6">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xl">
                    2
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">Sync Directory</h3>
                    <p className="text-muted-foreground">
                      Sync users from your Google directory. The list populates with everyone in your Workspace. Re-sync anytime to reflect new hires or departures.
                    </p>
                  </div>
                </div>

                <div className="flex gap-6">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xl">
                    3
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">Import Members</h3>
                    <p className="text-muted-foreground">
                      Open “Import from Google Workspace” and select which users to add. Assign roles (admin, member, viewer). Selected users show as pending until they sign in with Google.
                    </p>
                  </div>
                </div>

                <div className="flex gap-6">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xl">
                    4
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">Sign In & Access</h3>
                    <p className="text-muted-foreground">
                      Invited users sign in with their Google account. Once authenticated, they’re added to the organization and can access EquipQR™ based on their role. No manual invite emails required.
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
                See Google Workspace Integration in Action
              </h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                Here&apos;s what connecting and importing from Google Workspace looks like in the EquipQR™ app.
              </p>
            </div>

            <div className="max-w-5xl mx-auto space-y-12">
              <div className="bg-muted/50 rounded-xl p-8 border border-border">
                <div className="rounded-lg overflow-hidden mb-4 border border-border">
                  <img
                    src="https://supabase.equipqr.app/storage/v1/object/public/landing-page-images/google-workspace-connect.png"
                    alt="Organization Settings showing Google Workspace integration with connected domain"
                    className="w-full h-auto"
                    loading="lazy"
                  />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Connect & Sync Directory</h3>
                <p className="text-muted-foreground">
                  Connect your Google Workspace in Organization Settings. After authorization, sync your directory to load users. View connected domain and use “Sync Directory” to refresh the list.
                </p>
              </div>

              <div className="bg-muted/50 rounded-xl p-8 border border-border">
                <div className="rounded-lg overflow-hidden mb-4 border border-border">
                  <img
                    src="https://supabase.equipqr.app/storage/v1/object/public/landing-page-images/google-workspace-import.png"
                    alt="Import from Google Workspace dialog showing directory sync and user import"
                    className="w-full h-auto"
                    loading="lazy"
                  />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Import from Google Workspace</h3>
                <p className="text-muted-foreground">
                  Select users from your synced directory to add as organization members. Choose roles, then confirm. Pending users appear in the members list until they sign in with Google.
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
                Ready to Import Your Team from Google?
              </h2>
              <p className="text-xl text-muted-foreground mb-8">
                Start using Google Workspace integration today—completely free. Create your account, connect your Workspace, and import members in minutes.
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

export default GoogleWorkspaceFeature;
