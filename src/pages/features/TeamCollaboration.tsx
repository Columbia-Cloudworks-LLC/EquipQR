import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ArrowRight,
  Users,
  Shield,
  BarChart2,
} from 'lucide-react';
import { PageSEO } from '@/components/seo/PageSEO';
import { FeaturePageLayout } from '@/components/landing/features/FeaturePageLayout';
import { FeatureHero } from '@/components/landing/features/FeatureHero';
import { landingImage } from '@/lib/landingImage';

const TeamCollaborationFeature = () => {
  return (
    <>
      <PageSEO
        title="Team Collaboration"
        description="Organize teams across multiple organizations with role-based access control. Track performance and distribute workload efficiently."
        path="/features/team-collaboration"
        keywords="team collaboration, role-based access control, equipment management teams, fleet management teams, CMMS collaboration"
      />
      <FeaturePageLayout>
      <FeatureHero
        icon={Users}
        title="Team Collaboration"
        description="Organize teams across multiple organizations with role-based access control. Track performance and distribute workload efficiently."
        ctaText="Start Using Teams Free"
      />

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

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3 max-w-6xl mx-auto">
              <Card className="border-border bg-card shadow-sm hover:border-primary/30 hover:bg-muted/40 transition-colors">
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
                    Create teams that span your organization or map to locations, divisions, or crews. Assign equipment and work orders to teams so members see only what's relevant to them.
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

              <Card className="border-border bg-card shadow-sm hover:border-primary/30 hover:bg-muted/40 transition-colors">
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

              <Card className="border-border bg-card shadow-sm hover:border-primary/30 hover:bg-muted/40 transition-colors">
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

        {/* Roles & Permissions Matrix */}
        <section className="py-24">
          <div className="container px-4 mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
                Roles &amp; Permissions
              </h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                EquipQR uses a two-tier role system: organization-level roles that govern your whole account,
                and team-level roles that control access within each team.
              </p>
            </div>

            <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Org roles */}
              <div className="rounded-xl border border-border bg-card p-6">
                <h3 className="text-lg font-bold text-foreground mb-1">Organization Roles</h3>
                <p className="text-sm text-muted-foreground mb-5">
                  Set once per member when they join your organization.
                </p>
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">O</span>
                    <div>
                      <p className="text-sm font-semibold text-foreground">Owner</p>
                      <p className="text-xs text-muted-foreground">Full account control. Manages billing, integrations, and all organization settings. Can promote or remove any member.</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-info text-xs font-bold text-info-foreground">A</span>
                    <div>
                      <p className="text-sm font-semibold text-foreground">Admin</p>
                      <p className="text-xs text-muted-foreground">Manages members, teams, and equipment organization-wide. Cannot change billing or owner-level settings.</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-foreground">M</span>
                    <div>
                      <p className="text-sm font-semibold text-foreground">Member</p>
                      <p className="text-xs text-muted-foreground">Works within the teams they belong to. Sees only the equipment and work orders assigned to their teams.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Team roles */}
              <div className="rounded-xl border border-border bg-card p-6">
                <h3 className="text-lg font-bold text-foreground mb-1">Team Roles</h3>
                <p className="text-sm text-muted-foreground mb-5">
                  Assigned independently per team, giving fine-grained control within each crew.
                </p>
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-success text-xs font-bold text-success-foreground">M</span>
                    <div>
                      <p className="text-sm font-semibold text-foreground">Manager</p>
                      <p className="text-xs text-muted-foreground">Manages team members, equipment assignments, and QuickBooks customer mappings. Can create and close work orders.</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-warning text-xs font-bold text-warning-foreground">T</span>
                    <div>
                      <p className="text-sm font-semibold text-foreground">Technician</p>
                      <p className="text-xs text-muted-foreground">Creates and updates work orders, completes PM checklists, and logs scan activity for their team's equipment.</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-info text-xs font-bold text-info-foreground">R</span>
                    <div>
                      <p className="text-sm font-semibold text-foreground">Requestor</p>
                      <p className="text-xs text-muted-foreground">Designed for trusted customers. A Requestor can scan a machine's QR code to submit a work order request directly — no phone call required.</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-foreground">V</span>
                    <div>
                      <p className="text-sm font-semibold text-foreground">Viewer</p>
                      <p className="text-xs text-muted-foreground">Read-only access to team equipment and work orders. Useful for customers, inspectors, or stakeholders who need visibility without edit rights.</p>
                    </div>
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
                <div className="rounded-lg overflow-hidden mb-4 border border-border">
                  <img
                    src={landingImage('teams-list-2026-04.png')}
                    alt="Teams list showing all teams with member counts and roles"
                    className="w-full h-auto"
                    loading="lazy"
                  />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Organization Teams</h3>
                <p className="text-muted-foreground">
                  View all teams in your organization at a glance. See team descriptions, member counts, and quickly identify who belongs to each team. Create new teams or manage existing ones from a single dashboard.
                </p>
              </div>

              <div className="bg-muted/50 rounded-xl p-8 border border-border">
                <div className="rounded-lg overflow-hidden mb-4 border border-border">
                  <img
                    src={landingImage('team-detail-2026-04.png')}
                    alt="Team detail page showing role assignments for team members"
                    className="w-full h-auto"
                    loading="lazy"
                  />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Role-Based Team Access</h3>
                <p className="text-muted-foreground">
                  Assign each team member a role — Manager, Technician, or Viewer. Managers oversee the team and handle work order flow; Technicians perform and log work; Viewers get read-only access. Every action is attributed by role so you always know who did what.
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
      </FeaturePageLayout>
    </>
  );
};

export default TeamCollaborationFeature;
