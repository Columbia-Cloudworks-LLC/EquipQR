
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Crown, Mail } from 'lucide-react';
import { OrganizationAdmin } from '@/hooks/useOrganizationAdmins';
import { getRoleBadgeVariant } from '@/utils/badgeVariants';

interface AdminsTabContentProps {
  admins: OrganizationAdmin[];
  isLoading: boolean;
}

const AdminsTabContent: React.FC<AdminsTabContentProps> = ({ admins, isLoading }) => {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-4">
          <div className="text-center py-6 sm:py-8">
            <div className="text-xs sm:text-sm text-muted-foreground">Loading administrators...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (admins.length === 0) {
    return (
      <Card>
        <CardContent className="pt-4">
          <div className="text-center py-6 sm:py-8">
            <Crown className="h-8 w-8 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-3 sm:mb-4" />
            <h3 className="text-base sm:text-lg font-semibold mb-2">No administrators found</h3>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto">
              Invite members with admin privileges to help manage your organization.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="space-y-3">
          {admins.map((admin) => (
            <div key={admin.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 border rounded-lg gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium text-sm sm:text-base truncate">{admin.name}</h4>
                  <Badge variant={getRoleBadgeVariant(admin.role)} className="text-xs flex-shrink-0">
                    {admin.role === 'owner' ? 'Owner' : 'Admin'}
                  </Badge>
                </div>
                <div className="flex items-center gap-1 text-xs sm:text-sm text-muted-foreground">
                  <Mail className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">{admin.email}</span>
                </div>
              </div>
            </div>
          ))}
          
          <div className="mt-4 p-3 sm:p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs sm:text-sm text-blue-800">
              <strong>Work Order Assignment:</strong> These administrators can receive work order assignments 
              for equipment that doesn't have an assigned team.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminsTabContent;
