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
} from "lucide-react";
import { ExternalLink } from "@/components/ui/external-link";
import LandingHeader from "@/components/landing/LandingHeader";
import LegalFooter from "@/components/layout/LegalFooter";
import SupportTabs from "@/components/support/SupportTabs";
import Page from "@/components/layout/Page";
import PageHeader from "@/components/layout/PageHeader";
import MyTickets from "@/features/tickets/components/MyTickets";
import { useBugReport } from "@/features/tickets/context/BugReportContext";

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

/**
 * Dashboard variant. Rendered inside the authenticated dashboard shell, so we
 * also render `MyTickets` and the bug report CTA.
 */
export const DashboardSupport: React.FC = () => {
  const { openBugReport } = useBugReport();

  return (
    <Page maxWidth="7xl" padding="responsive">
      <div className="space-y-6">
        <PageHeader
          title="Support & Documentation"
          description="Step-by-step guides, role references, and direct support — organized by role and workflow."
        />

        <ContactSection withBugReport onReportIssue={openBugReport} />

        {/* My Tickets renders conditionally only when the user has tickets. */}
        <MyTickets />

        <SupportTabs includeDashboardOnly={true} />
      </div>
    </Page>
  );
};

/**
 * Public variant at /support. No dashboard shell, no ticket controls; we show
 * only content that applies to visitors and users who are not signed in.
 */
const Support: React.FC = () => {
  return (
    <div className="min-h-screen bg-background">
      <LandingHeader />
      <div className="container mx-auto p-6 max-w-4xl mt-16">
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold">Support & Documentation</h1>
            <p className="text-muted-foreground">
              Step-by-step guides and role references for everyone using
              EquipQR — technicians in the field, managers in the shop, and
              customers who own the equipment.
            </p>
          </div>

          <ContactSection />

          <SupportTabs includeDashboardOnly={false} />

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
