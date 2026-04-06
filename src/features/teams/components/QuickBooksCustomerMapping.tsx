/**
 * QuickBooks Customer Mapping Component
 *
 * Three flows:
 *  1. Import — search QB customers, create a local `customers` row and link to the team.
 *  2. Refresh — re-fetch QB data for the already-linked customer and merge QB-sourced fields.
 *  3. Link Existing — attach an existing local customer account to the team.
 *
 * Backward compat: still writes to `quickbooks_team_customers` for legacy invoice export
 * until the full resolution chain is adopted.
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Link2,
  Search,
  X,
  Building2,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Download,
} from 'lucide-react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getConnectionStatus,
  getTeamCustomerMapping,
  updateTeamCustomerMapping,
  clearTeamCustomerMapping,
  searchCustomers,
  type QuickBooksCustomer,
} from '@/services/quickbooks';
import { isQuickBooksEnabled } from '@/lib/flags';
import { useQuickBooksAccess } from '@/hooks/useQuickBooksAccess';
import { useCustomerMutations, useCustomersByOrg } from '@/features/teams/hooks/useCustomerAccount';
import { useCustomer } from '@/features/teams/hooks/useCustomerAccount';
import type { QBCustomerPayload } from '@/features/teams/services/customerAccountService';
import { toast } from 'sonner';

interface QuickBooksCustomerMappingProps {
  teamId: string;
  teamName: string;
  customerId?: string | null;
}

function qbCustomerToPayload(c: QuickBooksCustomer): QBCustomerPayload {
  return {
    Id: c.Id,
    DisplayName: c.DisplayName,
    CompanyName: c.CompanyName,
    Email: c.PrimaryEmailAddr?.Address,
    Phone: c.PrimaryPhone?.FreeFormNumber,
  };
}

export const QuickBooksCustomerMapping: React.FC<QuickBooksCustomerMappingProps> = ({
  teamId,
  teamName,
  customerId,
}) => {
  const { currentOrganization } = useOrganization();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<'closed' | 'import' | 'link'>('closed');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<QuickBooksCustomer | null>(null);
  const [accountSearchQuery, setAccountSearchQuery] = useState('');

  const { data: canManage = false, isLoading: permissionLoading } = useQuickBooksAccess();
  const featureEnabled = isQuickBooksEnabled();

  const { data: connectionStatus } = useQuery({
    queryKey: ['quickbooks', 'connection', currentOrganization?.id],
    queryFn: () => getConnectionStatus(currentOrganization!.id),
    enabled: !!currentOrganization?.id && canManage && featureEnabled,
    staleTime: 60 * 1000,
  });

  const { data: existingMapping, isLoading: mappingLoading } = useQuery({
    queryKey: ['quickbooks', 'team-mapping', currentOrganization?.id, teamId],
    queryFn: () => getTeamCustomerMapping(currentOrganization!.id, teamId),
    enabled:
      !!currentOrganization?.id &&
      !!teamId &&
      canManage &&
      featureEnabled &&
      connectionStatus?.isConnected,
  });

  const {
    data: customerSearchResult,
    isLoading: searchLoading,
    refetch: refetchCustomers,
  } = useQuery({
    queryKey: ['quickbooks', 'customers', currentOrganization?.id, searchQuery],
    queryFn: () => searchCustomers(currentOrganization!.id, searchQuery),
    enabled: !!currentOrganization?.id && mode === 'import' && connectionStatus?.isConnected,
    staleTime: 30 * 1000,
  });

  const { data: linkedCustomer } = useCustomer(customerId ?? undefined);

  const { data: orgCustomers } = useCustomersByOrg(
    mode === 'link' ? currentOrganization?.id : undefined
  );

  const customerMutations = useCustomerMutations(currentOrganization?.id);

  // Legacy mapping mutations (kept for backward compat with invoice export)
  const updateLegacyMapping = useMutation({
    mutationFn: ({ custId, displayName }: { custId: string; displayName: string }) =>
      updateTeamCustomerMapping(currentOrganization!.id, teamId, custId, displayName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quickbooks', 'team-mapping'] });
    },
  });

  const clearLegacyMapping = useMutation({
    mutationFn: () => clearTeamCustomerMapping(currentOrganization!.id, teamId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quickbooks', 'team-mapping'] });
    },
  });

  // ---- Import flow ----
  const handleImportAndLink = async () => {
    if (!selectedCustomer || !currentOrganization) return;
    try {
      const payload = qbCustomerToPayload(selectedCustomer);
      const created = await customerMutations.importFromQB.mutateAsync({ qb: payload });
      await customerMutations.link.mutateAsync({ teamId, customerId: created.id });
      // Legacy compat
      await updateLegacyMapping.mutateAsync({
        custId: selectedCustomer.Id,
        displayName: selectedCustomer.DisplayName,
      });
      queryClient.invalidateQueries({ queryKey: ['team', teamId] });
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      closeDialog();
    } catch {
      // Errors handled by mutation hooks
    }
  };

  // ---- Refresh flow ----
  const handleRefresh = async () => {
    if (!linkedCustomer?.quickbooks_customer_id || !currentOrganization) return;
    try {
      const result = await searchCustomers(
        currentOrganization.id,
        linkedCustomer.quickbooks_display_name ?? linkedCustomer.name
      );
      const match = result.customers?.find(
        (c: QuickBooksCustomer) => c.Id === linkedCustomer.quickbooks_customer_id
      );
      if (!match) {
        toast.error('Could not find the linked QuickBooks customer. It may have been deleted.');
        return;
      }
      const payload = qbCustomerToPayload(match);
      await customerMutations.refreshFromQB.mutateAsync({
        customerId: linkedCustomer.id,
        qb: payload,
      });
      queryClient.invalidateQueries({ queryKey: ['team', teamId] });
      queryClient.invalidateQueries({ queryKey: ['teams'] });
    } catch {
      // Errors handled by mutation hooks
    }
  };

  // ---- Link existing account flow ----
  const handleLinkExisting = async (accountId: string) => {
    try {
      await customerMutations.link.mutateAsync({ teamId, customerId: accountId });
      const account = orgCustomers?.find(c => c.id === accountId);
      if (account?.quickbooks_customer_id) {
        await updateLegacyMapping.mutateAsync({
          custId: account.quickbooks_customer_id,
          displayName: account.quickbooks_display_name ?? account.name,
        });
      }
      queryClient.invalidateQueries({ queryKey: ['team', teamId] });
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      closeDialog();
      toast.success(`Team "${teamName}" linked to account`);
    } catch {
      // Errors handled by mutation hooks
    }
  };

  // ---- Unlink ----
  const handleUnlink = async () => {
    if (!window.confirm('Remove the customer account link from this team?')) return;
    try {
      await customerMutations.link.mutateAsync({ teamId, customerId: null });
      await clearLegacyMapping.mutateAsync();
      queryClient.invalidateQueries({ queryKey: ['team', teamId] });
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      toast.success('Customer account unlinked');
    } catch {
      // Errors handled by mutation hooks
    }
  };

  const closeDialog = () => {
    setMode('closed');
    setSelectedCustomer(null);
    setSearchQuery('');
    setAccountSearchQuery('');
  };

  if (!featureEnabled || permissionLoading) return null;
  if (!canManage || !connectionStatus?.isConnected) return null;

  const customers = customerSearchResult?.customers || [];
  const filteredAccounts = (orgCustomers ?? []).filter((a) =>
    a.name.toLowerCase().includes(accountSearchQuery.toLowerCase())
  );

  const isLinked = !!customerId && !!linkedCustomer;

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Link2 className="h-4 w-4" />
            QuickBooks Customer
          </CardTitle>
          <CardDescription className="text-xs">
            Link this team to a QuickBooks customer for invoice export
          </CardDescription>
        </CardHeader>
        <CardContent>
          {mappingLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Loading...
            </div>
          ) : isLinked ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-success/10 text-success border-success/30">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Linked
                </Badge>
                {linkedCustomer.quickbooks_synced_at && (
                  <span className="text-xs text-muted-foreground">
                    Synced{' '}
                    {new Date(linkedCustomer.quickbooks_synced_at).toLocaleDateString()}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{linkedCustomer.name}</span>
              </div>
              <div className="flex gap-2 flex-wrap">
                {linkedCustomer.quickbooks_customer_id && (
                  <Button variant="outline" size="sm" onClick={handleRefresh}>
                    <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                    Refresh from QB
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={() => setMode('import')}>
                  Change
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleUnlink}
                  className="text-destructive hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : existingMapping ? (
            /* Legacy mapping exists but no customer account link yet */
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Legacy Mapping
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{existingMapping.display_name}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                This team has a legacy QuickBooks mapping. Import the customer to create a full
                account record.
              </p>
              <Button variant="outline" size="sm" onClick={() => setMode('import')}>
                <Download className="h-3.5 w-3.5 mr-1.5" />
                Import as Account
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                No customer account linked. Import from QuickBooks or link an existing account.
              </p>
              <div className="flex gap-2 flex-wrap">
                <Button variant="outline" size="sm" onClick={() => setMode('import')}>
                  <Download className="h-3.5 w-3.5 mr-1.5" />
                  Import from QB
                </Button>
                <Button variant="outline" size="sm" onClick={() => setMode('link')}>
                  <Link2 className="h-3.5 w-3.5 mr-1.5" />
                  Link Existing
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Import Dialog */}
      <Dialog open={mode === 'import'} onOpenChange={() => closeDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Import from QuickBooks</DialogTitle>
            <DialogDescription>
              Search QuickBooks customers to import and link to &ldquo;{teamName}&rdquo;
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search customers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <ScrollArea className="h-[300px] pr-4">
              {searchLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : customerSearchResult?.error ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <AlertTriangle className="h-8 w-8 text-destructive mb-2" />
                  <p className="text-sm text-muted-foreground">{customerSearchResult.error}</p>
                  <Button variant="outline" size="sm" className="mt-2" onClick={() => refetchCustomers()}>
                    Retry
                  </Button>
                </div>
              ) : customers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Building2 className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {searchQuery ? 'No customers found' : 'No customers in QuickBooks'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {customers.map((c) => (
                    <button
                      key={c.Id}
                      onClick={() => setSelectedCustomer(c)}
                      className={`w-full p-3 rounded-lg border text-left transition-colors ${
                        selectedCustomer?.Id === c.Id
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50 hover:bg-muted/50'
                      }`}
                    >
                      <div className="font-medium text-sm">{c.DisplayName}</div>
                      {c.CompanyName && c.CompanyName !== c.DisplayName && (
                        <div className="text-xs text-muted-foreground">{c.CompanyName}</div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={closeDialog}>
                Cancel
              </Button>
              <Button
                onClick={handleImportAndLink}
                disabled={!selectedCustomer || customerMutations.importFromQB.isPending}
              >
                {customerMutations.importFromQB.isPending && (
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                )}
                Import &amp; Link
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Link Existing Account Dialog */}
      <Dialog open={mode === 'link'} onOpenChange={() => closeDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Link Existing Account</DialogTitle>
            <DialogDescription>
              Choose an existing customer account to link to &ldquo;{teamName}&rdquo;
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search accounts..."
                value={accountSearchQuery}
                onChange={(e) => setAccountSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <ScrollArea className="h-[300px] pr-4">
              {filteredAccounts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Building2 className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {accountSearchQuery ? 'No accounts match' : 'No customer accounts yet'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredAccounts.map((acct) => (
                    <button
                      key={acct.id}
                      onClick={() => handleLinkExisting(acct.id)}
                      className="w-full p-3 rounded-lg border text-left transition-colors border-border hover:border-primary/50 hover:bg-muted/50"
                    >
                      <div className="font-medium text-sm">{acct.name}</div>
                      {acct.email && (
                        <div className="text-xs text-muted-foreground">{acct.email}</div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={closeDialog}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default QuickBooksCustomerMapping;
