import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import PageHeader from '@/components/layout/PageHeader';

const EquipmentLoadingState = () => {
  return (
    <div className="space-y-6">
      <PageHeader 
        title="Equipment" 
        description="Loading..." 
      />
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-32 w-full rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default EquipmentLoadingState;