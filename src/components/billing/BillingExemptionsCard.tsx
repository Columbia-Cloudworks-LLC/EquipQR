import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Info } from 'lucide-react';
import { format } from 'date-fns';
import { useMemo } from 'react';
import { getBillingSnapshot } from '@/services/billingSnapshotService';
import { useQuery } from '@tanstack/react-query';

interface BillingExemptionsCardProps {
  organizationId: string;
}

const BillingExemptionsCard = ({ organizationId }: BillingExemptionsCardProps) => {
  const { data: billingSnapshot } = useQuery({
    queryKey: ['billing-snapshot', organizationId],
    queryFn: () => getBillingSnapshot(organizationId),
    enabled: !!organizationId,
  });

  const activeExemptions = useMemo(() => {
    if (!billingSnapshot?.exemptions) return [];
    
    const now = new Date();
    return billingSnapshot.exemptions.filter(exemption => {
      if (!exemption.expires_at) return true; // No expiration, always active
      return new Date(exemption.expires_at) > now;
    });
  }, [billingSnapshot]);

  // Don't render if no exemptions
  if (!activeExemptions || activeExemptions.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg sm:text-xl">Billing Exemptions</CardTitle>
        <CardDescription>
          Additional capacity granted to your organization
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Exemptions provide additional license slots at no extra cost. These do not reduce your billing charges,
            but allow you to add more users without purchasing additional licenses.
          </AlertDescription>
        </Alert>

        <div className="space-y-3">
          {activeExemptions.map((exemption) => {
            const isExpiring = exemption.expires_at && 
              new Date(exemption.expires_at).getTime() - Date.now() < 30 * 24 * 60 * 60 * 1000; // 30 days
            
            return (
              <div
                key={exemption.exemption_type}
                className="border rounded-lg p-4 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="font-medium capitalize">
                      {exemption.exemption_type.replace(/_/g, ' ')}
                    </div>
                    {exemption.reason && (
                      <div className="text-sm text-muted-foreground">
                        {exemption.reason}
                      </div>
                    )}
                  </div>
                  <Badge variant="secondary" className="text-lg font-semibold px-3 py-1">
                    +{exemption.exemption_value}
                  </Badge>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  {exemption.expires_at ? (
                    <>
                      <span>
                        Expires: {format(new Date(exemption.expires_at), 'MMM d, yyyy')}
                      </span>
                      {isExpiring && (
                        <Badge variant="outline" className="text-orange-600 border-orange-600">
                          Expiring Soon
                        </Badge>
                      )}
                    </>
                  ) : (
                    <span>No expiration</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default BillingExemptionsCard;

