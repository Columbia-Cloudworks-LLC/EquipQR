import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';
import { useSimpleOrganization } from '@/hooks/useSimpleOrganization';

interface RestrictedBillingAccessProps {
  currentOrganizationName: string;
}

const RestrictedBillingAccess: React.FC<RestrictedBillingAccessProps> = () => {
  const { organizations, switchOrganization } = useSimpleOrganization();
  const navigate = useNavigate();

  // Find organizations where the user is an owner or admin
  const managedOrganizations = organizations.filter(
    org => org.userRole === 'owner' || org.userRole === 'admin'
  );

  const handleSwitchToManagedOrganization = () => {
    if (managedOrganizations.length > 0) {
      const firstManagedOrg = managedOrganizations[0];
      switchOrganization(firstManagedOrg.id);
      // Navigate to billing page for the organization they manage
      navigate('/dashboard/billing');
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <Card className="border-destructive/20 bg-destructive/5">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
            <div className="space-y-3 flex-1">
              <div className="text-sm text-foreground">
                <strong>Access Restricted:</strong> You need to be an organization owner or admin to view billing information.
              </div>
              <div className="text-sm text-muted-foreground">
                Contact an organization owner or admin if you need billing information{managedOrganizations.length > 0 ? ', or' : '.'}
                {managedOrganizations.length > 0 && (
                  <>
                    {' '}
                    <button
                      onClick={handleSwitchToManagedOrganization}
                      className="text-primary underline hover:no-underline"
                    >
                      view billing for your organization
                    </button>
                    {' '}instead.
                  </>
                )}
              </div>
              {managedOrganizations.length > 0 && (
                <Button 
                  onClick={handleSwitchToManagedOrganization}
                  variant="outline"
                  size="sm"
                  className="mt-3"
                >
                  Switch to {managedOrganizations[0].name}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RestrictedBillingAccess;