import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface AutoAssignmentBannerProps {
  unassignedCount: number;
  onAssignAll: () => void;
  isAssigning: boolean;
}

export const AutoAssignmentBanner: React.FC<AutoAssignmentBannerProps> = ({
  unassignedCount,
  onAssignAll,
  isAssigning
}) => {
  if (unassignedCount === 0) return null;

  return (
    <Card className="border-info/30 bg-info/10 dark:border-info/40 dark:bg-info/15">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-info dark:text-info">
              {unassignedCount} unassigned work order{unassignedCount !== 1 ? 's' : ''} found
            </h3>
            <p className="text-sm text-info dark:text-info mt-1">
              Since you're the only member, these can be automatically assigned to you.
            </p>
          </div>
          <Button
            onClick={onAssignAll}
            disabled={isAssigning}
            className="bg-info hover:bg-info/90 text-primary-foreground"
          >
            {isAssigning ? 'Assigning...' : 'Assign All to Me'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};


