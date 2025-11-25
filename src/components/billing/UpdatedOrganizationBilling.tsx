
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Users, HardDrive, CreditCard, Info } from 'lucide-react';
import { useOrganizationMembers } from '@/hooks/useOrganizationMembers';
import { useOrganization } from '@/contexts/OrganizationContext';
import { calculateBilling, isFreeOrganization } from '@/utils/billing';
import { getOrganizationRestrictions, getRestrictionMessage } from '@/utils/organizationRestrictions';

interface UpdatedOrganizationBillingProps {
  storageUsedGB: number;
  onUpgradeToMultiUser: () => void;
}

const UpdatedOrganizationBilling: React.FC<UpdatedOrganizationBillingProps> = ({
  storageUsedGB,
  onUpgradeToMultiUser
}) => {
  const { currentOrganization } = useOrganization();
  const { data: members = [] } = useOrganizationMembers(currentOrganization?.id || '');

  const billing = calculateBilling({ members, storageGB: storageUsedGB, fleetMapEnabled: true });
  const isFree = isFreeOrganization(members);
  const restrictions = getOrganizationRestrictions(members);

  return (
    <div className="space-y-6">
      {/* Free Organization Alert */}
      {isFree && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            You're currently on a free single-user plan. Invite team members to unlock team management, 
            image uploads, storage, and other collaboration features.
            <Button 
              variant="link" 
              className="p-0 h-auto ml-2"
              onClick={onUpgradeToMultiUser}
            >
              Invite Members →
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Billing Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Monthly Billing Overview
            <Badge variant={isFree ? 'secondary' : 'default'}>
              {isFree ? 'Free Plan' : 'Pay-as-you-go'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold">${billing.userSlots.totalCost.toFixed(2)}</div>
              <div className="text-sm text-muted-foreground">User Licenses</div>
              <div className="text-xs text-muted-foreground mt-1">
                {billing.userSlots.billableUsers} billable × $10
              </div>
            </div>
            
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold">${billing.storage.cost.toFixed(2)}</div>
              <div className="text-sm text-muted-foreground">Storage</div>
              <div className="text-xs text-muted-foreground mt-1">
                {isFree ? 'Not available' : `${billing.storage.overageGB.toFixed(1)}GB × $0.10`}
              </div>
            </div>
            
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold">${billing.features.fleetMap.cost.toFixed(2)}</div>
              <div className="text-sm text-muted-foreground">Fleet Map</div>
              <div className="text-xs text-muted-foreground mt-1">
                {billing.features.fleetMap.enabled ? 'Active' : 'Inactive'}
              </div>
            </div>
            
            <div className="text-center p-4 border-2 border-primary rounded-lg">
              <div className="text-2xl font-bold text-primary">${billing.totals.monthlyTotal.toFixed(2)}</div>
              <div className="text-sm text-muted-foreground">Total Monthly</div>
              <div className="text-xs text-muted-foreground mt-1">
                {isFree ? 'Free forever' : `Next billing: ${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}`}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* User Licenses */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            User Licenses
            {isFree && <Badge variant="outline">Free</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Team Members</div>
                <div className="text-sm text-muted-foreground">
                  First user is always free, additional users are $10/month each
                </div>
              </div>
              <Badge variant="outline">{billing.userSlots.totalUsers} / {restrictions.maxMembers} allowed</Badge>
            </div>
            
            <div className="bg-muted p-4 rounded-lg">
              <div className="flex justify-between items-center">
                <span>Free user (owner)</span>
                <span className="font-mono">$0.00</span>
              </div>
              {billing.userSlots.billableUsers > 0 && (
                <div className="flex justify-between items-center">
                  <span>Additional users ({billing.userSlots.billableUsers})</span>
                  <span className="font-mono">${billing.userSlots.totalCost.toFixed(2)}</span>
                </div>
              )}
              <div className="border-t pt-2 mt-2 flex justify-between items-center font-semibold">
                <span>Total User Licenses</span>
                <span className="font-mono">${billing.userSlots.totalCost.toFixed(2)}</span>
              </div>
            </div>

            {isFree && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="text-sm text-blue-800 mb-2 font-medium">
                  Unlock Team Collaboration
                </div>
                <div className="text-xs text-blue-700 mb-3">
                  Invite team members to access team management, equipment assignment, and more features.
                </div>
                <Button size="sm" onClick={onUpgradeToMultiUser}>
                  Invite Team Members
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Storage Usage */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5" />
            Storage Usage
            {isFree && <Badge variant="secondary">Not Available</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">File Storage</div>
                <div className="text-sm text-muted-foreground">
                  {isFree ? 'Available for multi-user organizations only' : '5GB included free, $0.10/GB for additional storage'}
                </div>
              </div>
              <Badge variant="outline">
                {isFree ? 'Disabled' : `${billing.storage.usedGB.toFixed(1)} GB / ${restrictions.maxStorage} GB`}
              </Badge>
            </div>
            
            {!isFree && (
              <>
                <div className="w-full bg-muted h-2 rounded-full">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, (billing.storage.usedGB / 10) * 100)}%` }}
                  />
                </div>
                
                <div className="bg-muted p-4 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span>Free storage (5GB)</span>
                    <span className="font-mono">$0.00</span>
                  </div>
                  {billing.storage.overageGB > 0 && (
                    <div className="flex justify-between items-center">
                      <span>Additional storage ({billing.storage.overageGB.toFixed(1)}GB)</span>
                      <span className="font-mono">${billing.storage.cost.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="border-t pt-2 mt-2 flex justify-between items-center font-semibold">
                    <span>Total Storage Cost</span>
                    <span className="font-mono">${billing.storage.cost.toFixed(2)}</span>
                  </div>
                </div>
              </>
            )}

            {isFree && (
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="text-sm text-gray-600">
                  {getRestrictionMessage('canUploadImages')}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {(!restrictions.canManageTeams || !restrictions.canUploadImages || !restrictions.canAccessFleetMap) && (
        <Card>
          <CardHeader>
            <CardTitle>Feature Availability</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            {!restrictions.canManageTeams && <p>{getRestrictionMessage('canManageTeams')}</p>}
            {!restrictions.canUploadImages && <p>{getRestrictionMessage('canUploadImages')}</p>}
            {!restrictions.canAccessFleetMap && <p>{getRestrictionMessage('canAccessFleetMap')}</p>}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default UpdatedOrganizationBilling;
