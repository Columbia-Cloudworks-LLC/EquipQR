import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-md bg-muted relative overflow-hidden",
        "before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-background/10 before:to-transparent before:animate-shimmer",
        className
      )}
      {...props}
    />
  )
}

// Card skeleton for work orders and equipment lists
function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-lg border bg-card p-4 space-y-3", className)}>
      <div className="flex items-start justify-between">
        <div className="space-y-2 flex-1">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
      <div className="flex items-center gap-4 pt-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-24" />
      </div>
    </div>
  )
}

// Work order card skeleton matching WorkOrderCard structure
function SkeletonWorkOrderCard({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-lg border-l-4 border-l-muted border bg-card", className)}>
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2 flex-1">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
        <div className="rounded-md bg-muted/50 p-2.5 flex items-center gap-2.5">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="flex items-center justify-between gap-3 pt-3 border-t">
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-6 rounded-full" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-4 w-20" />
        </div>
      </div>
    </div>
  )
}

// Equipment card skeleton matching EquipmentCard structure
function SkeletonEquipmentCard({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-lg border-l-4 border-l-muted border bg-card", className)}>
      {/* Mobile layout */}
      <div className="md:hidden flex">
        <Skeleton className="h-24 w-24 flex-shrink-0 rounded-l-md" />
        <div className="flex-1 p-3 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1 flex-1">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-7 w-7 rounded" />
          </div>
          <div className="flex items-center justify-between gap-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
        </div>
      </div>
      {/* Desktop layout */}
      <div className="hidden md:block p-4 space-y-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-8 w-8 rounded" />
        </div>
        <Skeleton className="aspect-video w-full rounded-md" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
    </div>
  )
}

// List of skeleton cards
function SkeletonList({ 
  count = 3, 
  type = 'card' 
}: { 
  count?: number
  type?: 'card' | 'work-order' | 'equipment'
}) {
  const Component = type === 'work-order' 
    ? SkeletonWorkOrderCard 
    : type === 'equipment'
    ? SkeletonEquipmentCard
    : SkeletonCard

  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <Component key={i} className="animate-stagger-in" style={{ animationDelay: `${i * 50}ms` } as React.CSSProperties} />
      ))}
    </div>
  )
}

export { 
  Skeleton,
  SkeletonCard,
  SkeletonWorkOrderCard,
  SkeletonEquipmentCard,
  SkeletonList
}