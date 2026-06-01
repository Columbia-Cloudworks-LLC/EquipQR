import type React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Mail,
  MessageSquare,
  Clock,
  ArrowRight,
  Bug,
  Activity,
  BookOpen,
} from "lucide-react";
import { ExternalLink } from "@/components/ui/external-link";
import LandingHeader from "@/components/landing/LandingHeader";
import LegalFooter from "@/components/layout/LegalFooter";
import Page from "@/components/layout/Page";
import PageHeader from "@/components/layout/PageHeader";
import MyTickets from "@/features/tickets/components/MyTickets";
import { useBugReport } from "@/features/tickets/context/BugReportContext";
import { SUPPORT_DOCS_URL } from "@/lib/documentationUrl";

interface ContactSectionProps {
  /**
   * When true, show the dashboard-only bug report CTA.
   */
  withBugReport?: boolean;
  /**
   * Callback used by the dashboard variant to open the ticket dialog.
   */
  onReportIssue?: () => void;
}

/**
 * Shared "Get Help" card with channels, response time, and (optionally) the
 * Report an Issue CTA that only exists on the dashboard variant.
 */
const ContactSection: React.FC<ContactSectionProps> = ({
  withBugReport = false,
  onReportIssue,
}) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Mail className="h-5 w-5" />
        Get Help
      </CardTitle>
      <CardDescription>
        Need assistance? We&apos;re here to help you get the most out of EquipQR.
      </CardDescription>
    </CardHeader>
    <CardContent>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            <span>Check our </span>
            <ExternalLink href="https://status.equipqr.app" className="text-primary">
              system status page
            </ExternalLink>
            <span> for real-time service availability</span>
          </div>
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
            <span>Email support: </span>
            <a
              href="mailto:nicholas.king@columbiacloudworks.com"
              className="text-primary hover:underline"
            >
              nicholas.king@columbiacloudworks.com
            </a>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>Response time: Within 24 hours</span>
          </div>
        </div>
        {withBugReport && onReportIssue ? (
          <div className="pt-2 border-t">
            <p className="text-sm text-muted-foreground mb-3">
              Found a bug or something not working as expected? Let us know
              directly — session diagnostics attach automatically, no personal
              data included.
            </p>
            <Button variant="outline" onClick={onReportIssue}>
              <Bug className="mr-2 h-4 w-4" />
              Report an Issue
            </Button>
          </div>
        ) : null}
      </div>
    </CardContent>
  </Card>
);

const HelpCenterCard: React.FC = () => (
  <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-accent/5">
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <BookOpen className="h-5 w-5" />
        EquipQR Help Center
      </CardTitle>
      <CardDescription>
        Step-by-step guides for technicians, managers, admins, and equipment
        owners — organized by role and workflow.
      </CardDescription>
    </CardHeader>
    <CardContent>
      <Button asChild>
        <ExternalLink
          href={SUPPORT_DOCS_URL}
          className="inline-flex items-center gap-2"
          showIcon={false}
        >
          Browse guides
          <ArrowRight className="h-4 w-4" />
        </ExternalLink>
      </Button>
    </CardContent>
  </Card>
);

/**
 * Dashboard variant. Ticket hub for signed-in users (report issue, my tickets).
 * Documentation lives on equipqr.info.
 */
export const DashboardSupport: React.FC = () => {
  const { openBugReport } = useBugReport();

  return (
    <Page maxWidth="7xl" padding="responsive">
      <div className="space-y-6">
        <PageHeader
          title="Support"
          description="Report issues, track your tickets, and reach the EquipQR team. Product guides live on the Help Center."
        />

        <HelpCenterCard />

        <ContactSection withBugReport onReportIssue={openBugReport} />

        <MyTickets />
      </div>
    </Page>
  );
};

/**
 * Public variant at /support. Contact channels and link to the Help Center;
 * no ticket controls (those require a signed-in account).
 */
const Support: React.FC = () => {
  return (
    <div className="min-h-screen bg-background">
      <LandingHeader />
      <div className="container mx-auto p-6 max-w-4xl mt-16">
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold">Support</h1>
            <p className="text-muted-foreground">
              Contact the EquipQR team or browse the Help Center for guides
              covering field work, work orders, equipment, inventory, and roles.
            </p>
          </div>

          <HelpCenterCard />

          <ContactSection />

          <Card className="bg-gradient-to-r from-primary/5 to-accent/5 border-primary/20">
            <CardContent className="p-6 text-center">
              <h3 className="text-xl font-semibold mb-2">Ready to get started?</h3>
              <p className="text-muted-foreground mb-4">
                Create a free EquipQR account and start tracking your
                equipment, work orders, and teams in minutes.
              </p>
              <Button asChild>
                <a href="/auth" className="inline-flex items-center gap-2">
                  Get Started
                  <ArrowRight className="h-4 w-4" />
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
      <LegalFooter />
    </div>
  );
};

export default Support;
