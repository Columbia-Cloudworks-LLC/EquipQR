import React from "react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface DashboardNoTeamsCardProps {
  organizationName: string;
}

export const DashboardNoTeamsCard: React.FC<DashboardNoTeamsCardProps> = ({ organizationName }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Welcome to {organizationName}</CardTitle>
        <CardDescription>
          You are not yet a member of any teams in {organizationName}. Contact an organization administrator to give you
          a role on a team to see equipment and work orders for that team.
        </CardDescription>
      </CardHeader>
    </Card>
  );
};

