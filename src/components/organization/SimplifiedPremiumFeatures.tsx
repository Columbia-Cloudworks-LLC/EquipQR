import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, Users, DollarSign } from 'lucide-react';
import { SessionOrganization } from '@/contexts/SessionContext';
import { useOrganizationMembers } from '@/hooks/useOrganizationMembers';
import { calculateBilling, isFreeOrganization } from '@/utils/billing';

interface SimplifiedPremiumFeaturesProps {
  organization: SessionOrganization;
  onUpgrade: () => void;
}

const SimplifiedPremiumFeatures: React.FC<SimplifiedPremiumFeaturesProps> = ({
  organization,
  onUpgrade,
}) => {
  const { data: members = [] } = useOrganizationMembers(organization.id);
  const billing = calculateBilling({ members, storageGB: 0, fleetMapEnabled: false });
  const isFree = isFreeOrganization(members);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-green-600" />
          Pay-as-you-go Billing
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Current billing status */}
          <div className="p-4 rounded-lg border bg-card">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Current Monthly Cost</span>
              <span className="text-xs text-muted-foreground">
                {isFree ? 'Single-user plan' : 'Active subscription'}
              </span>
            </div>
            <div className="text-2xl font-bold">${billing.totals.monthlyTotal.toFixed(2)}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {isFree 
                ? 'Single-user plan is free forever'
                : `${billing.userSlots.billableUsers} users × $10 + storage + add-ons`
              }
            </div>
          </div>

          {/* Team collaboration features */}
          <div className="space-y-3">
            <div className="flex items-start space-x-3 p-3 rounded-lg border">
              <Users className={`h-5 w-5 mt-0.5 ${!isFree ? 'text-green-600' : 'text-muted-foreground'}`} />
              <div className="flex-1">
                <div className="font-medium">Team Collaboration</div>
                <div className="text-sm text-muted-foreground">
                  Invite unlimited team members at $10/month each
                </div>
                <div className="text-xs text-primary mt-1">
                  {isFree ? 'Invite your first team member to unlock' : `${billing.userSlots.totalUsers} team members`}
                </div>
              </div>
            </div>

            {/* Fleet Map add-on */}
            <div className="flex items-start space-x-3 p-3 rounded-lg border">
              <MapPin className="h-5 w-5 mt-0.5 text-muted-foreground" />
              <div className="flex-1">
                <div className="font-medium">Fleet Map (Add-on)</div>
                <div className="text-sm text-muted-foreground">
                  Interactive equipment location tracking
                </div>
                <div className="text-xs text-primary mt-1">
                  +$10/month • Enable in billing settings
                </div>
              </div>
            </div>
          </div>

          {/* Action button */}
          <div className="pt-4 border-t">
            {isFree ? (
              <div className="text-center space-y-2">
                <div className="text-sm font-medium">
                  Simple transparent pricing
                </div>
                <div className="text-xs text-muted-foreground">
                  No upfront costs • Pay only for what you use
                </div>
                <Button onClick={onUpgrade} className="w-full mt-3" variant="default">
                  <Users className="mr-2 h-4 w-4" />
                  Invite Team Members
                </Button>
              </div>
            ) : (
              <div className="text-center space-y-2">
                <div className="text-sm font-medium text-green-600">
                  ✓ Pay-as-you-go Active
                </div>
                <div className="text-xs text-muted-foreground">
                  Billing updates automatically as you add/remove users
                </div>
                <Button variant="outline" size="sm" className="w-full">
                  Manage Billing
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SimplifiedPremiumFeatures;