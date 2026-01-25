import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ArrowRight,
  ArrowLeft,
  Users,
  Shield,
  BarChart2,
} from 'lucide-react';
import LandingHeader from '@/components/landing/LandingHeader';
import LegalFooter from '@/components/layout/LegalFooter';

const TeamCollaborationFeature = () => {
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
                  <Users className="h-10 w-10 text-primary" />
                </div>
                <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground">
                  Team Collaboration
                </h1>
              </div>

              <p className="text-xl sm:text-2xl text-muted-foreground mb-8 max-w-3xl">
                Organize teams across multiple organizations with role-based access control. Track performance and distribute workload efficiently.
              </p>

              <Button asChild size="lg" className="text-lg px-8 py-6">
                <Link to="/auth?tab=signup">
                  Start Using Teams Free
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
                Why Use Team Collaboration?
              </h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                Give each team a dedicated view of equipment and work orders. Control who sees what with roles and permissions, and balance workload across your org.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              <Card className="border-border bg-card/50 backdrop-blur-sm hover:bg-card transition-colors">
                <CardHeader className="pb-4">
                  <div className="mb-4">
                    <Users className="h-10 w-10 text-success" />
                  </div>
                  <CardTitle className="text-2xl">Cross-Organizational Teams</CardTitle>
                  <CardDescription className="text-base">
                    One workspace, many teams
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">
                    Create teams that span your organization or map to locations, divisions, or crews. Assign equipment and work orders to teams so members see only what’s relevant to them.
                  </p>
                  <ul className="mt-4 space-y-2">
                    <li className="text-sm text-muted-foreground flex items-center">
                      <span className="w-1.5 h-1.5 bg-success rounded-full mr-2 flex-shrink-0" />
                      Team-scoped equipment
                    </li>
                    <li className="text-sm text-muted-foreground flex items-center">
                      <span className="w-1.5 h-1.5 bg-success rounded-full mr-2 flex-shrink-0" />
                      Team-scoped work orders
                    </li>
                    <li className="text-sm text-muted-foreground flex items-center">
                      <span className="w-1.5 h-1.5 bg-success rounded-full mr-2 flex-shrink-0" />
                      Flexible structure
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-border bg-card/50 backdrop-blur-sm hover:bg-card transition-colors">
                <CardHeader className="pb-4">
                  <div className="mb-4">
                    <Shield className="h-10 w-10 text-info" />
                  </div>
                  <CardTitle className="text-2xl">Role-Based Permissions</CardTitle>
                  <CardDescription className="text-base">
                    Control access by role
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">
                    Assign admin, member, or viewer roles at the organization and team level. Admins manage settings and members; members perform work; viewers see read-only data.
                  </p>
                  <ul className="mt-4 space-y-2">
                    <li className="text-sm text-muted-foreground flex items-center">
                      <span className="w-1.5 h-1.5 bg-info rounded-full mr-2 flex-shrink-0" />
                      Org and team roles
                    </li>
                    <li className="text-sm text-muted-foreground flex items-center">
                      <span className="w-1.5 h-1.5 bg-info rounded-full mr-2 flex-shrink-0" />
                      Invite and manage members
                    </li>
                    <li className="text-sm text-muted-foreground flex items-center">
                      <span className="w-1.5 h-1.5 bg-info rounded-full mr-2 flex-shrink-0" />
                      Secure by default
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-border bg-card/50 backdrop-blur-sm hover:bg-card transition-colors">
                <CardHeader className="pb-4">
                  <div className="mb-4">
                    <BarChart2 className="h-10 w-10 text-warning" />
                  </div>
                  <CardTitle className="text-2xl">Workload Balancing</CardTitle>
                  <CardDescription className="text-base">
                    Distribute work fairly
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">
                    See how work is distributed across teams and technicians. Use dashboards and filters to identify overloaded assignees and reassign or rebalance as needed.
                  </p>
                  <ul className="mt-4 space-y-2">
                    <li className="text-sm text-muted-foreground flex items-center">
                      <span className="w-1.5 h-1.5 bg-warning rounded-full mr-2 flex-shrink-0" />
                      Team dashboards
                    </li>
                    <li className="text-sm text-muted-foreground flex items-center">
                      <span className="w-1.5 h-1.5 bg-warning rounded-full mr-2 flex-shrink-0" />
                      Assignee visibility
                    </li>
                    <li className="text-sm text-muted-foreground flex items-center">
                      <span className="w-1.5 h-1.5 bg-warning rounded-full mr-2 flex-shrink-0" />
                      Performance insights
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
                Teams connect people, equipment, and work orders in one place.
              </p>
            </div>

            <div className="max-w-4xl mx-auto">
              <div className="space-y-8">
                <div className="flex gap-6">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xl">
                    1
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">Create Teams</h3>
                    <p className="text-muted-foreground">
                      Create teams that match your structure—by location, trade, or project. Add members and assign roles. Each team can have its own equipment and work order scope.
                    </p>
                  </div>
                </div>

                <div className="flex gap-6">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xl">
                    2
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">Assign Equipment & Work</h3>
                    <p className="text-muted-foreground">
                      Link equipment to teams so members see only relevant assets. Assign work orders to teams or individuals. Use filters and dashboards to view workload by team.
                    </p>
                  </div>
                </div>

                <div className="flex gap-6">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xl">
                    3
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">Collaborate in Context</h3>
                    <p className="text-muted-foreground">
                      Team members access equipment, work orders, and PMs from their team view. Admins manage members, settings, and visibility. Viewers get read-only access where configured.
                    </p>
                  </div>
                </div>

                <div className="flex gap-6">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xl">
                    4
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">Track & Rebalance</h3>
                    <p className="text-muted-foreground">
                      Monitor completion rates, overdue work, and assignee load. Reassign work or adjust team scope as needed. Use fleet efficiency and dashboard metrics to optimize allocation.
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
                See Team Collaboration in Action
              </h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                Here&apos;s what teams and permissions look like in the EquipQR™ app.
              </p>
            </div>

            <div className="max-w-5xl mx-auto space-y-12">
              <div className="bg-muted/50 rounded-xl p-8 border border-border">
                <div className="rounded-lg overflow-hidden mb-4 border border-border bg-muted aspect-video flex items-center justify-center">
                  <p className="text-sm text-muted-foreground">Screenshot placeholder — Teams list and members</p>
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Teams List & Members</h3>
                <p className="text-muted-foreground">
                  View all teams, members, and roles. Create teams, invite members, and assign equipment. Each team has a dedicated view for equipment and work orders.
                </p>
              </div>

              <div className="bg-muted/50 rounded-xl p-8 border border-border">
                <div className="rounded-lg overflow-hidden mb-4 border border-border bg-muted aspect-video flex items-center justify-center">
                  <p className="text-sm text-muted-foreground">Screenshot placeholder — Team detail and workload</p>
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Team Detail & Workload</h3>
                <p className="text-muted-foreground">
                  Drill into a team to see its equipment, work orders, and members. Monitor workload distribution and reassign work as needed. Role-based access ensures everyone sees only what they’re allowed to.
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
                Ready to Organize Your Teams?
              </h2>
              <p className="text-xl text-muted-foreground mb-8">
                Start using Team Collaboration today—completely free. Create your account, set up teams, and distribute work with clear visibility and control.
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

export default TeamCollaborationFeature;
