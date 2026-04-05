
import React from 'react';

interface OrganizationHeaderProps {
  organizationName: string;
  currentUserRole?: 'owner' | 'admin' | 'member';
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const OrganizationHeader: React.FC<OrganizationHeaderProps> = ({ organizationName }) => {
  return (
    <div className="pb-4 border-b">
      <h1 className="text-xl font-semibold tracking-tight">
        Organization Settings
      </h1>
    </div>
  );
};

export default OrganizationHeader;

