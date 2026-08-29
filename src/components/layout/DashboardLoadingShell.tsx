import { PageSkeleton } from '@/components/ui/PageSkeleton';
import { Skeleton } from '@/components/ui/skeleton';

interface DashboardLoadingShellProps {
  statusLabel?: string;
  message?: string;
}

export default function DashboardLoadingShell({
  statusLabel = 'Loading dashboard',
  message = 'Loading dashboard content.',
}: DashboardLoadingShellProps) {
  return (
    <div data-testid="dashboard-loading-shell" className="flex min-h-screen w-full bg-background">
      <aside
        aria-label="Dashboard navigation loading"
        data-testid="dashboard-loading-sidebar"
        className="hidden w-64 shrink-0 border-r bg-sidebar md:flex md:flex-col"
      >
        <div className="border-b p-4">
          <Skeleton className="h-8 w-32" />
        </div>
        <div className="flex-1 space-y-3 p-3">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-11/12" />
          <Skeleton className="h-8 w-10/12" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-9/12" />
        </div>
      </aside>

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <header
          aria-label="Dashboard header loading"
          data-testid="dashboard-loading-header"
          className="flex h-14 shrink-0 items-center gap-3 border-b px-4 sm:h-16"
        >
          <Skeleton className="h-8 w-8 rounded-md md:hidden" />
          <Skeleton className="h-6 w-40" />
          <Skeleton className="ml-auto h-8 w-24" />
        </header>

        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 overflow-auto pb-16 md:pb-0 outline-none"
        >
          <div role="status" aria-label={statusLabel} className="sr-only">
            {message}
          </div>
          <PageSkeleton />
        </main>
      </div>
    </div>
  );
}
