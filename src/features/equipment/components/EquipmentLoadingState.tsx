import React from 'react';
import { Skeleton } from "@/components/ui/skeleton";
import PageHeader from '@/components/layout/PageHeader';

/** Single shimmer row matching the mobile equipment card layout */
const MobileSkeletonRow = () => (
  <div className="grid min-w-0 grid-cols-[4.5rem_1fr_auto] gap-x-2.5 gap-y-0.5 overflow-hidden rounded-lg border bg-card p-3">
    <div className="row-span-4 self-center">
      <Skeleton className="aspect-[4/5] w-full rounded-md" />
    </div>
    <div className="col-start-2 row-start-1 flex min-w-0 items-center gap-2">
      <Skeleton className="h-4 flex-1 rounded" />
    </div>
    <Skeleton className="col-start-3 row-start-1 h-8 w-8 rounded" />
    <Skeleton className="col-start-2 row-start-2 h-3 w-24 rounded" />
    <Skeleton className="col-start-2 row-start-3 h-3 w-2/3 rounded" />
    <Skeleton className="col-start-2 row-start-4 h-3 w-1/2 rounded" />
  </div>
);

/** Single shimmer card matching desktop grid layout */
const DesktopSkeletonCard = () => (
  <div className="overflow-hidden rounded-lg border bg-card">
    <div className="p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div className="space-y-1.5 flex-1">
          <Skeleton className="h-5 w-2/3 rounded" />
          <Skeleton className="h-3 w-1/3 rounded" />
          <Skeleton className="h-4 w-16 rounded-full" />
        </div>
        <Skeleton className="h-9 w-9 rounded" />
      </div>
      <Skeleton className="aspect-video w-full rounded-md" />
      <div className="space-y-2">
        <Skeleton className="h-3 w-full rounded" />
        <Skeleton className="h-3 w-3/4 rounded" />
      </div>
    </div>
  </div>
);

const EquipmentLoadingState = () => {
  return (
    <div className="space-y-4 md:space-y-6">
      <PageHeader title="Equipment" />
      {/* Mobile skeletons — list-style rows */}
      <div className="flex flex-col gap-2 md:hidden">
        {[...Array(5)].map((_, i) => (
          <MobileSkeletonRow key={i} />
        ))}
      </div>
      {/* Desktop skeletons — grid cards */}
      <div className="hidden md:grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <DesktopSkeletonCard key={i} />
        ))}
      </div>
    </div>
  );
};

export default EquipmentLoadingState;