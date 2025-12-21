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
    <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-blue-900 dark:text-blue-100">
              {unassignedCount} unassigned work order{unassignedCount !== 1 ? 's' : ''} found
            </h3>
            <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
              Since you're the only member, these can be automatically assigned to you.
            </p>
          </div>
          <Button
            onClick={onAssignAll}
            disabled={isAssigning}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isAssigning ? 'Assigning...' : 'Assign All to Me'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

