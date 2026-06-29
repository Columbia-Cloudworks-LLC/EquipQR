import React from 'react';
import { Loader2 } from 'lucide-react';
import Page from '@/components/layout/Page';
import PageHeader from '@/components/layout/PageHeader';
import { useInventoryAccess } from '@/features/inventory/hooks/useInventoryAccess';

type InventoryAccessGuardProps = {
  children: React.ReactNode;
  title?: string;
};

export function InventoryAccessGuard({
  children,
  title = 'Inventory access required',
}: InventoryAccessGuardProps) {
  const { canView, isLoading } = useInventoryAccess();

  if (isLoading) {
    return (
      <Page maxWidth="7xl" padding="responsive">
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-label="Checking inventory access" />
        </div>
      </Page>
    );
  }

  if (!canView) {
    return (
      <Page maxWidth="7xl" padding="responsive">
        <PageHeader
          title={title}
          description="You do not have permission to view inventory, alternate parts, or part lookup for this organization. Ask an owner or admin to grant Parts Consumer or Parts Manager access."
        />
      </Page>
    );
  }

  return <>{children}</>;
}
