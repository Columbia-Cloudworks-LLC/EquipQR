import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, ArrowLeft, FileCheck, CheckCircle2, Settings2, ClipboardCheck, Wrench, Truck } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import LandingHeader from '@/components/landing/LandingHeader';
import LegalFooter from '@/components/layout/LegalFooter';

interface BuiltInTemplate {
  name: string;
  items: number;
  sections: number;
  description: string;
  icon: LucideIcon;
}

const builtInTemplates: BuiltInTemplate[] = [
  {
    name: 'Forklift PM',
    items: 103,
    sections: 12,
    description: 'Complete inspection covering visual checks, engine, hydraulics, brakes, electrical, and safety systems.',
    icon: Truck,
  },
  {
    name: 'Excavator PM',
    items: 84,
    sections: 10,
    description: 'Comprehensive checklist for track-type excavators including undercarriage, boom, and bucket inspection.',
    icon: Wrench,
  },
  {
    name: 'Scissor Lift PM',
    items: 74,
    sections: 9,
    description: 'Safety-focused checklist covering platform, hydraulics, electrical, and emergency systems.',
    icon: ClipboardCheck,
  },
  {
    name: 'Skid Steer PM',
    items: 80,
    sections: 10,
    description: 'Full inspection template for skid steer loaders including loader arms, hydraulics, and controls.',
    icon: Wrench,
  },
  {
    name: 'Pull Trailer PM',
    items: 65,
    sections: 8,
    description: 'DOT-compliant trailer inspection covering lights, brakes, tires, and coupling systems.',
    icon: Truck,
  },
  {
    name: 'Compressor PM',
    items: 58,
    sections: 7,
    description: 'Industrial compressor maintenance checklist for air systems, filters, and safety valves.',
    icon: Settings2,
  },
];

const PMTemplatesFeature = () => {
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
                  <FileCheck className="h-10 w-10 text-primary" />
                </div>
                <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground">
                  PM Templates
                </h1>
              </div>
              
              <p className="text-xl sm:text-2xl text-muted-foreground mb-8 max-w-3xl">
                Standardize preventative maintenance across your fleet with pre-built checklists for common equipment types, or create custom templates tailored to your specific needs.
              </p>
              
              <Button asChild size="lg" className="text-lg px-8 py-6">
                <Link to="/auth?tab=signup">
                  Start Using PM Templates Free
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
                Why Use PM Templates?
              </h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                Preventative maintenance templates ensure consistent inspections, reduce missed items, and create a permanent maintenance record for every piece of equipment.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {/* Consistency */}
              <Card className="border-border bg-card/50 backdrop-blur-sm hover:bg-card transition-colors">
                <CardHeader className="pb-4">
                  <div className="mb-4">
                    <CheckCircle2 className="h-10 w-10 text-success" />
                  </div>
                  <CardTitle className="text-2xl">Consistent Inspections</CardTitle>
                  <CardDescription className="text-base">
                    Never miss a check item
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">
                    Every technician follows the same comprehensive checklist, ensuring consistent quality across all inspections. No more guesswork or forgotten items—just thorough, standardized maintenance every time.
                  </p>
                  <ul className="mt-4 space-y-2">
                    <li className="text-sm text-muted-foreground flex items-center">
                      <span className="w-1.5 h-1.5 bg-success rounded-full mr-2 flex-shrink-0"></span>
                      Standardized procedures
                    </li>
                    <li className="text-sm text-muted-foreground flex items-center">
                      <span className="w-1.5 h-1.5 bg-success rounded-full mr-2 flex-shrink-0"></span>
                      Training simplified
                    </li>
                    <li className="text-sm text-muted-foreground flex items-center">
                      <span className="w-1.5 h-1.5 bg-success rounded-full mr-2 flex-shrink-0"></span>
                      Quality assurance
                    </li>
                  </ul>
                </CardContent>
              </Card>

              {/* Documentation */}
              <Card className="border-border bg-card/50 backdrop-blur-sm hover:bg-card transition-colors">
                <CardHeader className="pb-4">
                  <div className="mb-4">
                    <ClipboardCheck className="h-10 w-10 text-info" />
                  </div>
                  <CardTitle className="text-2xl">Complete Records</CardTitle>
                  <CardDescription className="text-base">
                    Permanent maintenance history
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">
                    Every completed checklist is saved as a permanent record attached to the work order. Track what was inspected, who did it, and when—perfect for compliance, audits, and warranty documentation.
                  </p>
                  <ul className="mt-4 space-y-2">
                    <li className="text-sm text-muted-foreground flex items-center">
                      <span className="w-1.5 h-1.5 bg-info rounded-full mr-2 flex-shrink-0"></span>
                      Audit-ready records
                    </li>
                    <li className="text-sm text-muted-foreground flex items-center">
                      <span className="w-1.5 h-1.5 bg-info rounded-full mr-2 flex-shrink-0"></span>
                      Warranty protection
                    </li>
                    <li className="text-sm text-muted-foreground flex items-center">
                      <span className="w-1.5 h-1.5 bg-info rounded-full mr-2 flex-shrink-0"></span>
                      Compliance tracking
                    </li>
                  </ul>
                </CardContent>
              </Card>

              {/* Customization */}
              <Card className="border-border bg-card/50 backdrop-blur-sm hover:bg-card transition-colors">
                <CardHeader className="pb-4">
                  <div className="mb-4">
                    <Settings2 className="h-10 w-10 text-warning" />
                  </div>
                  <CardTitle className="text-2xl">Fully Customizable</CardTitle>
                  <CardDescription className="text-base">
                    Build your own templates
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">
                    Start with our built-in templates and customize them to match your specific requirements, or create entirely new templates from scratch. Add sections, items, and descriptions that fit your workflow.
                  </p>
                  <ul className="mt-4 space-y-2">
                    <li className="text-sm text-muted-foreground flex items-center">
                      <span className="w-1.5 h-1.5 bg-warning rounded-full mr-2 flex-shrink-0"></span>
                      Custom templates
                    </li>
                    <li className="text-sm text-muted-foreground flex items-center">
                      <span className="w-1.5 h-1.5 bg-warning rounded-full mr-2 flex-shrink-0"></span>
                      Flexible sections
                    </li>
                    <li className="text-sm text-muted-foreground flex items-center">
                      <span className="w-1.5 h-1.5 bg-warning rounded-full mr-2 flex-shrink-0"></span>
                      Equipment-specific
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Built-in Templates Section */}
        <section className="py-24">
          <div className="container px-4 mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
                Built-in Templates
              </h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                Get started immediately with professionally designed checklists for common equipment types. Each template includes comprehensive inspection items organized by category.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {builtInTemplates.map((template) => (
                <Card key={template.name} className="border-border bg-card hover:bg-card/80 transition-colors">
                  <CardHeader>
                    <div className="flex items-center gap-3 mb-2">
                      <template.icon className="h-6 w-6 text-primary" />
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                    </div>
                    <CardDescription>{template.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <span className="font-semibold text-foreground">{template.items}</span>
                        <span className="text-muted-foreground">items</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="font-semibold text-foreground">{template.sections}</span>
                        <span className="text-muted-foreground">sections</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="py-24 bg-muted/30">
          <div className="container px-4 mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
                How It Works
              </h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                PM Templates integrate seamlessly with work orders for a streamlined maintenance workflow.
              </p>
            </div>

            <div className="max-w-4xl mx-auto">
              <div className="space-y-8">
                <div className="flex gap-6">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xl">
                    1
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">Create Work Order</h3>
                    <p className="text-muted-foreground">
                      When creating a new work order for preventative maintenance, select a PM template from your available templates. The template is automatically attached to the work order.
                    </p>
                  </div>
                </div>

                <div className="flex gap-6">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xl">
                    2
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">Complete Checklist</h3>
                    <p className="text-muted-foreground">
                      Work through the checklist items organized by section. Mark items as OK, flag issues that need attention, or add notes for specific items. Use "Set All OK" to quickly mark completed sections.
                    </p>
                  </div>
                </div>

                <div className="flex gap-6">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xl">
                    3
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">Save Progress</h3>
                    <p className="text-muted-foreground">
                      Your checklist progress is saved automatically. Come back later to continue where you left off, or complete the inspection in one session. All data is preserved until the work order is completed.
                    </p>
                  </div>
                </div>

                <div className="flex gap-6">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xl">
                    4
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">Permanent Record</h3>
                    <p className="text-muted-foreground">
                      When the work order is completed, the PM checklist becomes a permanent record. Access the full inspection details anytime from the work order history or equipment service records.
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
                See PM Templates in Action
              </h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                Here's what PM Templates look like in the EquipQR™ app.
              </p>
            </div>

            <div className="max-w-5xl mx-auto space-y-12">
              {/* Screenshot 1: PM Templates List */}
              <div className="bg-muted/50 rounded-xl p-8 border border-border">
                <div className="rounded-lg overflow-hidden mb-4 border border-border">
                  <img 
                    src="https://supabase.equipqr.app/storage/v1/object/public/landing-page-images/pm-templates-list.png" 
                    alt="PM Templates List showing 6 global templates including Forklift, Excavator, and Scissor Lift" 
                    className="w-full h-auto"
                    loading="lazy"
                  />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Browse Available Templates</h3>
                <p className="text-muted-foreground">
                  View all available PM templates in your organization. Each card shows the template name, description, section count, and quick actions like Apply to Equipment, Clone, or Configure.
                </p>
              </div>

              {/* Screenshot 2: PM Template Detail */}
              <div className="bg-muted/50 rounded-xl p-8 border border-border">
                <div className="rounded-lg overflow-hidden mb-4 border border-border">
                  <img 
                    src="https://supabase.equipqr.app/storage/v1/object/public/landing-page-images/pm-template-detail.png" 
                    alt="Forklift PM template detail view showing 12 sections and 103 checklist items" 
                    className="w-full h-auto"
                    loading="lazy"
                  />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Detailed Template View</h3>
                <p className="text-muted-foreground">
                  Drill into any template to see the full structure. The Forklift PM template includes 12 sections with 103 total items covering visual inspection, engine, hydraulics, brakes, electrical systems, and more.
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
                Ready to Standardize Your Maintenance?
              </h2>
              <p className="text-xl text-muted-foreground mb-8">
                Start using PM Templates today—completely free. Create your account and access all built-in templates immediately.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild size="lg" className="text-lg px-8 py-6">
                  <Link to="/auth?tab=signup">
                    Create Free Account
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="text-lg px-8 py-6">
                  <Link to="/#features">
                    Explore More Features
                  </Link>
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

export default PMTemplatesFeature;
