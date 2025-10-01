
import React from 'react';

interface OrganizationHeaderProps {
  organizationName: string;
  currentUserRole?: 'owner' | 'admin' | 'member';
}

const OrganizationHeader: React.FC<OrganizationHeaderProps> = ({ 
  organizationName
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight break-words">
          Organization Management
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-1 break-words">
          Manage {organizationName} members, invitations, and settings
        </p>
      </div>
    </div>
  );
};

export default OrganizationHeader;
