import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Mail, 
  MessageSquare, 
  Clock, 
  ArrowRight,
  Bug,
} from "lucide-react";
import LandingHeader from '@/components/landing/LandingHeader';
import LegalFooter from '@/components/layout/LegalFooter';
import SupportTabs from '@/components/support/SupportTabs';
import Page from '@/components/layout/Page';
import PageHeader from '@/components/layout/PageHeader';
import SubmitTicketDialog from '@/features/tickets/components/SubmitTicketDialog';

// Shared Contact Section Component
const ContactSection: React.FC = () => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Mail className="h-5 w-5" />
        Get Help
      </CardTitle>
      <CardDescription>
        Need assistance? We're here to help you get the most out of EquipQR™.
      </CardDescription>
    </CardHeader>
    <CardContent>
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
          <span>Email support: </span>
          <a href="mailto:nicholas.king@columbiacloudworks.com" className="text-primary hover:underline">
            nicholas.king@columbiacloudworks.com
          </a>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span>Response time: Within 24 hours</span>
        </div>
      </div>
    </CardContent>
  </Card>
);

// Dashboard version - embedded in dashboard layout
export const DashboardSupport: React.FC = () => {
  const [ticketDialogOpen, setTicketDialogOpen] = useState(false);

  return (
    <Page maxWidth="7xl" padding="responsive">
      <div className="space-y-6">
        <PageHeader 
          title="Support & Documentation"
          description="Find answers to common questions and learn how to use EquipQR™ effectively"
        />

        {/* Contact & Bug Report Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Get Help
            </CardTitle>
            <CardDescription>
              Need assistance? We're here to help you get the most out of EquipQR™.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  <span>Email support: </span>
                  <a href="mailto:nicholas.king@columbiacloudworks.com" className="text-primary hover:underline">
                    nicholas.king@columbiacloudworks.com
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>Response time: Within 24 hours</span>
                </div>
              </div>
              <div className="pt-2 border-t">
                <p className="text-sm text-muted-foreground mb-3">
                  Found a bug or something not working as expected? Let us know directly.
                </p>
                <Button
                  variant="outline"
                  onClick={() => setTicketDialogOpen(true)}
                >
                  <Bug className="mr-2 h-4 w-4" />
                  Report an Issue
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Shared Tabbed Content */}
        <SupportTabs />
      </div>

      <SubmitTicketDialog
        open={ticketDialogOpen}
        onOpenChange={setTicketDialogOpen}
      />
    </Page>
  );
};

// Public version - with landing header and footer
const Support: React.FC = () => {
  return (
    <div className="min-h-screen bg-background">
      <LandingHeader />
      <div className="container mx-auto p-6 max-w-4xl mt-16">
        <div className="space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold">Support & Documentation</h1>
            <p className="text-muted-foreground">
              Find answers to common questions and learn how to use EquipQR™ effectively
            </p>
          </div>

          {/* Contact Section - Always visible */}
          <ContactSection />

          {/* Shared Tabbed Content */}
          <SupportTabs />

          {/* Call to Action for Public Users */}
          <Card className="bg-gradient-to-r from-primary/5 to-accent/5 border-primary/20">
            <CardContent className="p-6 text-center">
              <h3 className="text-xl font-semibold mb-2">Ready to Get Started?</h3>
              <p className="text-muted-foreground mb-4">
                Join thousands of teams using EquipQR™ to streamline their equipment management
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
