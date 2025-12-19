import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  HelpCircle, 
  Users, 
  BookOpen, 
  Lightbulb,
  Wrench,
  Eye,
  UserCheck,
  Shield,
  Briefcase,
  UserPlus,
  GitBranch,
  Building2,
  HardHat
} from "lucide-react";
import OnboardingGuide from './OnboardingGuide';

// Shared FAQ Section Component
const FAQSection: React.FC = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HelpCircle className="h-5 w-5" />
          Frequently Asked Questions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="getting-started">
            <AccordionTrigger>How do I get started with EquipQR™?</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-3">
                <p>Getting started with EquipQR™ is easy:</p>
                <ol className="list-decimal list-inside space-y-2 ml-4">
                  <li>Set up your organization and invite team members</li>
                  <li>Add your equipment to the system</li>
                  <li>Generate QR codes for each piece of equipment</li>
                  <li>Create teams and assign equipment responsibilities</li>
                  <li>Start creating and managing work orders</li>
                </ol>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="qr-codes">
            <AccordionTrigger>How do QR codes work in EquipQR™?</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-3">
                <p>QR codes provide instant access to equipment information:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Each equipment item has a unique QR code</li>
                  <li>Scan codes with your mobile device to view equipment details</li>
                  <li>Create work orders directly from scanned equipment</li>
                  <li>Print QR codes and attach them to physical equipment</li>
                  <li>Track maintenance history and status in real-time</li>
                </ul>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="work-orders">
            <AccordionTrigger>How do I manage work orders effectively?</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-3">
                <p>Work order management is streamlined in EquipQR™:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Create work orders from equipment pages or QR scans</li>
                  <li>Assign orders to specific teams or individuals</li>
                  <li>Track progress through status updates</li>
                  <li>Add costs, notes, and images to document work</li>
                  <li>Set priorities and due dates for better planning</li>
                  <li>Generate reports for maintenance insights</li>
                </ul>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="teams">
            <AccordionTrigger>How do I organize teams and permissions?</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-3">
                <p>Team organization helps streamline workflows:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Create teams based on skills or equipment types</li>
                  <li>Assign equipment to specific teams for maintenance</li>
                  <li>Set team-based permissions for work order access</li>
                  <li>Track team workload and performance metrics</li>
                  <li>Collaborate on maintenance tasks and documentation</li>
                </ul>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
};

// Helper component for the hierarchy visualization
const HierarchyNode = ({ icon: Icon, title, name, role, badgeVariant = "secondary", children, description, isCustomer = false }: any) => (
  <div className="relative">
    <div className={`flex items-start gap-3 p-3 border rounded-lg shadow-sm z-10 relative ${isCustomer ? 'bg-orange-50/50 border-orange-100 dark:bg-orange-950/10 dark:border-orange-900/50' : 'bg-card'}`}>
      <div className="mt-1">
        <Icon className={`h-5 w-5 ${isCustomer ? 'text-orange-600 dark:text-orange-400' : 'text-muted-foreground'}`} />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm">{title}</span>
          {name && <span className="text-sm text-muted-foreground">• {name}</span>}
          {role && <Badge variant={badgeVariant} className="text-xs h-5 px-1.5">{role}</Badge>}
        </div>
        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
      </div>
    </div>
    {children && (
      <div className="pl-6 ml-3.5 border-l-2 border-border/50 pt-4 space-y-4">
        {children}
      </div>
    )}
  </div>
);

// Shared Roles Section Component
const RolesSection: React.FC = () => {
  return (
    <div className="space-y-8">
      {/* 1. Organization Level Roles */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            Organization Roles (Internal Staff)
          </h3>
          <p className="text-muted-foreground text-sm">
            These roles are for <strong>your employees</strong>. They determine what your staff can do at the company level (billing, settings, managing other users).
          </p>
        </div>
        
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                Owner
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <p>Has full control over the organization.</p>
              <ul className="list-disc list-inside text-muted-foreground text-xs space-y-1">
                <li>Manage Billing & Plans</li>
                <li>Delete Organization</li>
                <li>Transfer Ownership</li>
                <li>Everything Admins can do</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-blue-500" />
                Admin
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <p>Manages day-to-day operations.</p>
              <ul className="list-disc list-inside text-muted-foreground text-xs space-y-1">
                <li>Invite/Remove Members</li>
                <li>Create Teams (Customer Accounts)</li>
                <li>Manage Organization Settings</li>
                <li>Cannot delete the Organization</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                Member
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <p>Standard access for your technicians.</p>
              <ul className="list-disc list-inside text-muted-foreground text-xs space-y-1">
                <li>Join assigned Teams</li>
                <li>View Organization Resources</li>
                <li>No administrative access</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>

      <Separator />

      {/* 2. Visual Hierarchy Example */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <GitBranch className="h-5 w-5" />
            Example Structure: "Apex Repair Services"
          </h3>
          <p className="text-muted-foreground text-sm">
            In this example, "Apex Repair" is the service provider. They create a Team for each Customer (e.g., "ABC Construction") to manage that customer's equipment.
          </p>
        </div>

        <div className="bg-muted/30 p-6 rounded-xl border">
          <HierarchyNode 
            icon={Briefcase} 
            title="Apex Repair Services" 
            role="Organization" 
            badgeVariant="default"
            description="Your Company (The Service Provider)"
          >
            {/* Owner Level */}
            <HierarchyNode 
              icon={Shield} 
              title="Sarah" 
              role="Owner" 
              description="Sarah owns Apex Repair. She manages billing and oversees all customer accounts." 
            />

            {/* Teams Branch */}
            <div className="mt-4">
              <p className="text-xs font-semibold uppercase text-muted-foreground mb-4">Teams (Customer Accounts)</p>
              
              <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
                {/* Team A: ABC Construction */}
                <div className="relative">
                  <HierarchyNode 
                    icon={Building2} 
                    title="Customer: ABC Construction" 
                    description="A team dedicated to ABC's fleet."
                  >
                    <div className="mb-2">
                      <p className="text-[10px] font-semibold uppercase text-muted-foreground mb-2">Apex Staff (Internal)</p>
                      <HierarchyNode 
                        icon={UserCheck} 
                        title="John" 
                        role="Manager" 
                        badgeVariant="outline"
                        description="Apex Service Manager. Assigns work orders to techs."
                      />
                      <HierarchyNode 
                        icon={Wrench} 
                        title="Steve" 
                        role="Technician" 
                        badgeVariant="outline"
                        description="Apex Technician. Repairs equipment for ABC Construction."
                      />
                    </div>
                    
                    <div className="mt-4 pt-4 border-t border-dashed">
                      <p className="text-[10px] font-semibold uppercase text-orange-600/70 mb-2">Customer Staff (External)</p>
                      <HierarchyNode 
                        icon={UserPlus} 
                        title="Alice (ABC Employee)" 
                        role="Requestor" 
                        badgeVariant="secondary"
                        isCustomer={true}
                        description="Site Supervisor at ABC. She owns the equipment and requests repairs."
                      />
                      <HierarchyNode 
                        icon={Eye} 
                        title="Bob (ABC Employee)" 
                        role="Viewer" 
                        badgeVariant="secondary"
                        isCustomer={true}
                        description="Accountant at ABC. He logs in just to see maintenance history."
                      />
                    </div>
                  </HierarchyNode>
                </div>

                {/* Team B: XYZ Logistics */}
                <div className="relative">
                  <HierarchyNode 
                    icon={Building2} 
                    title="Customer: XYZ Logistics" 
                    description="A separate team for XYZ's fleet."
                  >
                    <div className="mb-2">
                      <p className="text-[10px] font-semibold uppercase text-muted-foreground mb-2">Apex Staff (Internal)</p>
                      <HierarchyNode 
                        icon={Wrench} 
                        title="Steve" 
                        role="Technician" 
                        badgeVariant="outline"
                        description="Steve (same tech) is also in this team to repair XYZ's forklifts."
                      />
                    </div>
                     <div className="mt-4 pt-4 border-t border-dashed">
                      <p className="text-[10px] font-semibold uppercase text-orange-600/70 mb-2">Customer Staff (External)</p>
                      <HierarchyNode 
                        icon={UserPlus} 
                        title="Mike (XYZ Employee)" 
                        role="Requestor" 
                        badgeVariant="secondary"
                        isCustomer={true}
                        description="Fleet Manager at XYZ. Requests work for his trucks."
                      />
                    </div>
                  </HierarchyNode>
                </div>
              </div>
            </div>
          </HierarchyNode>
        </div>
      </div>

      <Separator />

      {/* 3. Role Definitions Table */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <HardHat className="h-5 w-5" />
            Team Role Definitions
          </h3>
          <p className="text-muted-foreground text-sm">
            Permissions are scoped to the specific team.
          </p>
        </div>

        <div className="border rounded-lg overflow-hidden">
          <div className="grid grid-cols-4 bg-muted/50 p-3 text-sm font-medium border-b">
            <div>Role</div>
            <div className="col-span-3">Capabilities</div>
          </div>
          
          <div className="divide-y">
            <div className="grid grid-cols-4 p-3 text-sm">
              <div className="font-medium flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-blue-600" />
                Manager
              </div>
              <div className="col-span-3 text-muted-foreground">
                <strong>Internal Leadership.</strong> Can add members to the team, assign work orders, and manage all equipment in this team.
              </div>
            </div>

            <div className="grid grid-cols-4 p-3 text-sm">
              <div className="font-medium flex items-center gap-2">
                <Wrench className="h-4 w-4 text-green-600" />
                Technician
              </div>
              <div className="col-span-3 text-muted-foreground">
                <strong>Internal Staff.</strong> Can execute work orders, update status, and log maintenance hours. Cannot manage team settings.
              </div>
            </div>

            <div className="grid grid-cols-4 p-3 text-sm bg-orange-50/30">
              <div className="font-medium flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-orange-600" />
                Requestor
              </div>
              <div className="col-span-3 text-muted-foreground">
                <strong>Customer / Owner.</strong> Can view their equipment and <strong>request new work orders</strong>. Cannot edit existing work orders once submitted.
              </div>
            </div>

            <div className="grid grid-cols-4 p-3 text-sm bg-orange-50/30">
              <div className="font-medium flex items-center gap-2">
                <Eye className="h-4 w-4 text-gray-600" />
                Viewer
              </div>
              <div className="col-span-3 text-muted-foreground">
                <strong>Customer / Owner.</strong> Read-only access. Can view equipment details and work order history.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Common Questions */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <HelpCircle className="h-5 w-5" />
          Common Questions
        </h3>
        
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="bg-muted/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Can a technician be in multiple teams?</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Yes. Your internal technicians are typically added to multiple (or all) teams so they can service equipment across all your customer accounts.
            </CardContent>
          </Card>

          <Card className="bg-muted/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Can customers see other customers' data?</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              No. A customer added as a <strong>Requestor</strong> or <strong>Viewer</strong> to "Team A" can only see equipment and work orders belonging to Team A. They are completely isolated from Team B.
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

// Shared Best Practices Section Component
const BestPracticesSection: React.FC = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Best Practices</CardTitle>
        <CardDescription>
          Tips for getting the most out of EquipQR™
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">Equipment Management</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Keep equipment information up-to-date with accurate specifications</li>
              <li>Add detailed notes and photos for better context</li>
              <li>Regularly update equipment status and location</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-2">Work Order Efficiency</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Use clear, descriptive titles and detailed descriptions</li>
              <li>Set appropriate priorities and realistic due dates</li>
              <li>Document all work with notes, costs, and completion photos</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-2">Team Collaboration</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Assign work orders to teams based on expertise and availability</li>
              <li>Communicate progress updates regularly</li>
              <li>Share knowledge and best practices within teams</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

/**
 * Shared tabbed interface for support content
 * Used by both DashboardSupport and public Support components
 */
const SupportTabs: React.FC = () => {
  return (
    <Tabs defaultValue="guide" className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="guide" className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 hidden sm:inline" />
          <span>Guide</span>
        </TabsTrigger>
        <TabsTrigger value="faq" className="flex items-center gap-2">
          <HelpCircle className="h-4 w-4 hidden sm:inline" />
          <span>FAQ</span>
        </TabsTrigger>
        <TabsTrigger value="roles" className="flex items-center gap-2">
          <Users className="h-4 w-4 hidden sm:inline" />
          <span>Roles</span>
        </TabsTrigger>
        <TabsTrigger value="tips" className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4 hidden sm:inline" />
          <span>Tips</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="guide" className="mt-6">
        <OnboardingGuide />
      </TabsContent>

      <TabsContent value="faq" className="mt-6">
        <FAQSection />
      </TabsContent>

      <TabsContent value="roles" className="mt-6">
        <RolesSection />
      </TabsContent>

      <TabsContent value="tips" className="mt-6">
        <BestPracticesSection />
      </TabsContent>
    </Tabs>
  );
};

export default SupportTabs;
