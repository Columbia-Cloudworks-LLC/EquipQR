import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileSpreadsheet, ShieldX, Building2 } from 'lucide-react';
import Page from '@/components/layout/Page';
import PageHeader from '@/components/layout/PageHeader';

interface ReportsConsoleStateProps {
  variant: 'no-organization' | 'access-restricted';
}

/**
 * Empty/restricted states styled to match the Fleet Export Console.
 */
export const ReportsConsoleState: React.FC<ReportsConsoleStateProps> = ({ variant }) => {
  const isNoOrg = variant === 'no-organization';

  return (
    <Page maxWidth="7xl" padding="responsive">
      <div className="space-y-6">
        <PageHeader
          title="Fleet Export Console"
          description={
            isNoOrg
              ? 'Select an organization to access fleet export modules.'
              : 'Export detailed reports for your fleet management data.'
          }
          meta={
            <Badge variant="outline" className="font-mono text-[10px] uppercase tracking-wide">
              Export Console
            </Badge>
          }
        />

        <Card className="border-border/60 texture-grain">
          <CardContent className="py-10">
            <div className="mx-auto max-w-md text-center">
              {isNoOrg ? (
                <Building2 className="mx-auto mb-4 h-12 w-12 text-muted-foreground" aria-hidden />
              ) : (
                <ShieldX className="mx-auto mb-4 h-12 w-12 text-muted-foreground" aria-hidden />
              )}
              <h2 className="text-lg font-semibold">
                {isNoOrg ? 'No Organization Selected' : 'Access Restricted'}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {isNoOrg
                  ? 'Choose an organization from the header to view available export modules and record counts.'
                  : 'Only organization owners and admins can export reports. Contact your administrator for access.'}
              </p>
              {!isNoOrg && (
                <div className="mt-4 flex justify-center">
                  <FileSpreadsheet className="h-5 w-5 text-muted-foreground/50" aria-hidden />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </Page>
  );
};
