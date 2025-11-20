import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrganization } from '@/contexts/OrganizationContext';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface RestrictedOrganizationAccessProps {
  currentOrganizationName: string;
}

const RestrictedOrganizationAccess: React.FC<RestrictedOrganizationAccessProps> = ({
  currentOrganizationName
}) => {
  const { organizations, switchOrganization } = useOrganization();
  const navigate = useNavigate();

  // Find organizations where user is an owner
  const ownedOrganizations = organizations.filter(org => org.userRole === 'owner');

  const handleSwitchToOwnedOrganization = () => {
    if (ownedOrganizations.length > 0) {
      const firstOwnedOrg = ownedOrganizations[0];
      switchOrganization(firstOwnedOrg.id);
      // Navigate to organization page for the organization they own
      navigate('/dashboard/organization');
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-0">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Organization Management</h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-1">
          Access restricted for {currentOrganizationName}
        </p>
      </div>

      <Card className="max-w-2xl">
        <CardContent className="pt-6">
          <div className="flex items-start space-x-4">
            <AlertCircle className="h-6 w-6 text-warning mt-0.5 flex-shrink-0" />
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-foreground">
                  Administrator Access Required
                </h3>
                <p className="text-muted-foreground mt-2">
                  You need to be an organization administrator to manage this page. 
                  Contact an existing organization admin if you require access to this page
                  {ownedOrganizations.length > 0 && (
                    <>
                      , or{' '}
                      <Button
                        variant="link"
                        className="p-0 h-auto font-normal text-primary underline"
                        onClick={handleSwitchToOwnedOrganization}
                      >
                        see the settings for your organization instead
                      </Button>
                      .
                    </>
                  )}
                  {ownedOrganizations.length === 0 && '.'}
                </p>
              </div>
              
              {ownedOrganizations.length === 0 && (
                <div className="text-sm text-muted-foreground">
                  You are currently a member of {currentOrganizationName} but do not own any organizations.
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RestrictedOrganizationAccess;