import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ArrowRight,
  ArrowLeft,
  ClipboardList,
  UserCheck,
  Calendar,
  ListChecks,
} from 'lucide-react';
import LandingHeader from '@/components/landing/LandingHeader';
import LegalFooter from '@/components/layout/LegalFooter';

const WorkOrderManagementFeature = () => {
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
                  <ClipboardList className="h-10 w-10 text-primary" />
                </div>
                <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground">
                  Work Order Management
                </h1>
              </div>

              <p className="text-xl sm:text-2xl text-muted-foreground mb-8 max-w-3xl">
                Create, assign, and track work orders with intelligent workflows. Monitor progress and ensure nothing falls through the cracks—from request to completion.
              </p>

              <Button asChild size="lg" className="text-lg px-8 py-6">
                <Link to="/auth?tab=signup">
                  Start Using Work Orders Free
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
                Why Use Work Order Management?
              </h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                Keep maintenance organized with clear statuses, assignments, and due dates. Reduce missed tasks and improve visibility across your team.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              <Card className="border-border bg-card/50 backdrop-blur-sm hover:bg-card transition-colors">
                <CardHeader className="pb-4">
                  <div className="mb-4">
                    <UserCheck className="h-10 w-10 text-success" />
                  </div>
                  <CardTitle className="text-2xl">Smart Assignment Rules</CardTitle>
                  <CardDescription className="text-base">
                    Assign work efficiently
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">
                    Assign work orders to technicians or teams based on skills, availability, or location. Use acceptance workflows so assignees confirm before starting, and reassign when needed.
                  </p>
                  <ul className="mt-4 space-y-2">
                    <li className="text-sm text-muted-foreground flex items-center">
                      <span className="w-1.5 h-1.5 bg-success rounded-full mr-2 flex-shrink-0" />
                      Team-based assignment
                    </li>
                    <li className="text-sm text-muted-foreground flex items-center">
                      <span className="w-1.5 h-1.5 bg-success rounded-full mr-2 flex-shrink-0" />
                      Acceptance workflow
                    </li>
                    <li className="text-sm text-muted-foreground flex items-center">
                      <span className="w-1.5 h-1.5 bg-success rounded-full mr-2 flex-shrink-0" />
                      Reassignment support
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-border bg-card/50 backdrop-blur-sm hover:bg-card transition-colors">
                <CardHeader className="pb-4">
                  <div className="mb-4">
                    <ListChecks className="h-10 w-10 text-info" />
                  </div>
                  <CardTitle className="text-2xl">Progress Tracking</CardTitle>
                  <CardDescription className="text-base">
                    See status at a glance
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">
                    Track work orders from draft to in progress, completed, or cancelled. Filter by status, priority, equipment, or assignee. Attach PM checklists, parts, and notes for full context.
                  </p>
                  <ul className="mt-4 space-y-2">
                    <li className="text-sm text-muted-foreground flex items-center">
                      <span className="w-1.5 h-1.5 bg-info rounded-full mr-2 flex-shrink-0" />
                      Clear status workflow
                    </li>
                    <li className="text-sm text-muted-foreground flex items-center">
                      <span className="w-1.5 h-1.5 bg-info rounded-full mr-2 flex-shrink-0" />
                      PM checklist integration
                    </li>
                    <li className="text-sm text-muted-foreground flex items-center">
                      <span className="w-1.5 h-1.5 bg-info rounded-full mr-2 flex-shrink-0" />
                      Parts and notes
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-border bg-card/50 backdrop-blur-sm hover:bg-card transition-colors">
                <CardHeader className="pb-4">
                  <div className="mb-4">
                    <Calendar className="h-10 w-10 text-warning" />
                  </div>
                  <CardTitle className="text-2xl">Due Date Management</CardTitle>
                  <CardDescription className="text-base">
                    Stay on schedule
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">
                    Set due dates and priorities so urgent work rises to the top. Use filters and dashboards to spot overdue or upcoming work and keep maintenance on track.
                  </p>
                  <ul className="mt-4 space-y-2">
                    <li className="text-sm text-muted-foreground flex items-center">
                      <span className="w-1.5 h-1.5 bg-warning rounded-full mr-2 flex-shrink-0" />
                      Priority and due dates
                    </li>
                    <li className="text-sm text-muted-foreground flex items-center">
                      <span className="w-1.5 h-1.5 bg-warning rounded-full mr-2 flex-shrink-0" />
                      Overdue visibility
                    </li>
                    <li className="text-sm text-muted-foreground flex items-center">
                      <span className="w-1.5 h-1.5 bg-warning rounded-full mr-2 flex-shrink-0" />
                      Dashboard summaries
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
                Work orders tie equipment, teams, PM templates, and inventory into one workflow.
              </p>
            </div>

            <div className="max-w-4xl mx-auto">
              <div className="space-y-8">
                <div className="flex gap-6">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xl">
                    1
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">Create a Work Order</h3>
                    <p className="text-muted-foreground">
                      Link the work order to equipment, add a description, and optionally attach a PM template. Set priority, due date, and assign to a technician or team.
                    </p>
                  </div>
                </div>

                <div className="flex gap-6">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xl">
                    2
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">Assign & Accept</h3>
                    <p className="text-muted-foreground">
                      Assignees receive notifications and can accept or decline. Once accepted, they see the full work order with PM checklist, parts, and equipment details.
                    </p>
                  </div>
                </div>

                <div className="flex gap-6">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xl">
                    3
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">Complete the Work</h3>
                    <p className="text-muted-foreground">
                      Work through the checklist, log parts used, add notes or photos, and update status. Progress saves automatically so nothing is lost.
                    </p>
                  </div>
                </div>

                <div className="flex gap-6">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xl">
                    4
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">Close & Record</h3>
                    <p className="text-muted-foreground">
                      Mark the work order complete. The PM record and service history are stored permanently on the equipment for compliance and future reference.
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
                See Work Order Management in Action
              </h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                Here&apos;s what work orders look like in the EquipQR™ app.
              </p>
            </div>

            <div className="max-w-5xl mx-auto space-y-12">
              <div className="bg-muted/50 rounded-xl p-8 border border-border">
                <div className="rounded-lg overflow-hidden mb-4 border border-border">
                  <img
                    src="https://supabase.equipqr.app/storage/v1/object/public/landing-page-images/work-orders-list.png"
                    alt="Work orders list with filters by status, priority, and assignee"
                    className="w-full h-auto"
                  />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Work Orders List</h3>
                <p className="text-muted-foreground">
                  View all work orders with filters by status, priority, assignee, or equipment. Quickly spot overdue items and drill into details. Create and assign new work from the same view.
                </p>
              </div>

              <div className="bg-muted/50 rounded-xl p-8 border border-border">
                <div className="rounded-lg overflow-hidden mb-4 border border-border">
                  <img
                    src="https://supabase.equipqr.app/storage/v1/object/public/landing-page-images/work-order-details.png"
                    alt="Work order detail page with equipment info, assignee, and PM checklist"
                    className="w-full h-auto"
                  />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Work Order Detail & PM Checklist</h3>
                <p className="text-muted-foreground">
                  Open any work order to see full context: equipment, assignee, due date, and attached PM template. Complete checklist items, add parts, notes, and photos, then mark complete.
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
                Ready to Organize Your Maintenance?
              </h2>
              <p className="text-xl text-muted-foreground mb-8">
                Start using Work Order Management today—completely free. Create your account and keep every repair and PM tracked from start to finish.
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

export default WorkOrderManagementFeature;
