import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { 
  HelpCircle, 
  Users, 
  BookOpen, 
  Lightbulb,
  Wrench,
  Eye,
  UserCheck,
  Shield,
  FileText,
  MessageSquare
} from "lucide-react";
import OnboardingGuide from './OnboardingGuide';

// Shared FAQ Section Component
const FAQSection = () => {
  
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

// Shared Roles Section Component
const RolesSection = () => {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            For Administrators
            <Badge variant="secondary">Admin</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-2">
            <Users className="h-4 w-4 mt-0.5 text-muted-foreground" />
            <div>
              <p className="font-medium">Organization Setup</p>
              <p className="text-sm text-muted-foreground">Configure settings, invite members, and manage billing</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <UserCheck className="h-4 w-4 mt-0.5 text-muted-foreground" />
            <div>
              <p className="font-medium">User Management</p>
              <p className="text-sm text-muted-foreground">Control access levels and team assignments</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <FileText className="h-4 w-4 mt-0.5 text-muted-foreground" />
            <div>
              <p className="font-medium">Reports & Analytics</p>
              <p className="text-sm text-muted-foreground">Monitor equipment performance and maintenance trends</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            For Technicians
            <Badge variant="outline">Member</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-2">
            <Eye className="h-4 w-4 mt-0.5 text-muted-foreground" />
            <div>
              <p className="font-medium">Equipment Monitoring</p>
              <p className="text-sm text-muted-foreground">Track assigned equipment and maintenance schedules</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <MessageSquare className="h-4 w-4 mt-0.5 text-muted-foreground" />
            <div>
              <p className="font-medium">Work Order Updates</p>
              <p className="text-sm text-muted-foreground">Update status, add notes, and document completed work</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <HelpCircle className="h-4 w-4 mt-0.5 text-muted-foreground" />
            <div>
              <p className="font-medium">QR Code Scanning</p>
              <p className="text-sm text-muted-foreground">Quickly access equipment info and create work orders</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Shared Best Practices Section Component
const BestPracticesSection = () => {
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
const SupportTabs = () => {
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
