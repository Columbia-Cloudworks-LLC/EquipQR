import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Forklift, ClipboardList, Zap } from 'lucide-react';

interface TeamQuickActionsProps {
  teamId: string;
  teamName: string;
}

/**
 * Quick actions component for team details page
 * Provides direct navigation to equipment and work orders filtered by team
 */
const TeamQuickActions: React.FC<TeamQuickActionsProps> = ({ teamId, teamName }) => {
  return (
    <Card className="shadow-elevation-2">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Zap className="h-5 w-5" />
          Quick Actions
        </CardTitle>
        <CardDescription>
          Navigate to {teamName}'s resources
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            asChild
            variant="outline"
            className="flex-1 justify-start gap-2"
          >
            <Link to={`/dashboard/equipment?team=${teamId}`}>
              <Forklift className="h-4 w-4" />
              View Equipment
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="flex-1 justify-start gap-2"
          >
            <Link to={`/dashboard/work-orders?team=${teamId}`}>
              <ClipboardList className="h-4 w-4" />
              View Work Orders
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default TeamQuickActions;
