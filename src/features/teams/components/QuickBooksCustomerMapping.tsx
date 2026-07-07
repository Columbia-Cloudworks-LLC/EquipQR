// fallow-ignore-file code-duplication
// Duplication rationale: Repeated mapping row blocks per customer are intentional
/**
 * QuickBooks Customer Mapping Component
 *
 * Links a team's customer account to a QuickBooks customer for invoice export.
 * Supports import, refresh, remap, link-existing, and unlink flows.
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
  /** When true, render inside CustomerAccountCard without an outer Card shell. */
  embedded?: boolean;
}

function qbCustomerToPayload(c: QuickBooksCustomer): QBCustomerPayload {
  return {
    Id: c.Id,
    DisplayName: c.DisplayName,
    GivenName: c.GivenName,
    FamilyName: c.FamilyName,
    CompanyName: c.CompanyName,
    Taxable: c.Taxable,
    Email: c.Email ?? c.PrimaryEmailAddr?.Address,
    Phone: c.Phone ?? c.PrimaryPhone?.FreeFormNumber,
    Mobile: c.Mobile,
    Fax: c.Fax,
    AlternatePhone: c.AlternatePhone,
    contacts: c.contacts,
    BillAddr: c.BillAddr,
    ShipAddr: c.ShipAddr,
  };
}

export const QuickBooksCustomerMapping: React.FC<QuickBooksCustomerMappingProps> = ({
  teamId,
  teamName,
  customerId,
  embedded = false,
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

  const updateLegacyMapping = useMutation({
    mutationFn: ({ custId, displayName }: { custId: string; displayName: string }) =>
      updateTeamCustomerMapping(currentOrganization!.id, teamId, custId, displayName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quickbooks', 'team-mapping'] });
      queryClient.invalidateQueries({ queryKey: ['quickbooks', 'resolved-mapping'] });
    },
  });

  const clearLegacyMapping = useMutation({
    mutationFn: () => clearTeamCustomerMapping(currentOrganization!.id, teamId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quickbooks', 'team-mapping'] });
      queryClient.invalidateQueries({ queryKey: ['quickbooks', 'resolved-mapping'] });
    },
  });

  const invalidateTeamQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['team', teamId] });
    queryClient.invalidateQueries({ queryKey: ['teams'] });
  };

  const handleImportAndLink = async () => {
    if (!selectedCustomer || !currentOrganization) return;
    try {
      const payload = qbCustomerToPayload(selectedCustomer);

      if (customerId && linkedCustomer) {
        await customerMutations.remapFromQB.mutateAsync({
          customerId: linkedCustomer.id,
          qb: payload,
        });
      } else {
        const created = await customerMutations.importFromQB.mutateAsync({ qb: payload });
        await customerMutations.link.mutateAsync({ teamId, customerId: created.id });
      }

      await updateLegacyMapping.mutateAsync({
        custId: selectedCustomer.Id,
        displayName: selectedCustomer.DisplayName,
      });
      invalidateTeamQueries();
      closeDialog();
    } catch {
      // Errors handled by mutation hooks
    }
  };

  const handleRefresh = async () => {
    if (!linkedCustomer?.quickbooks_customer_id || !currentOrganization) return;
    try {
      const result = await searchCustomers(currentOrganization.id, undefined, {
        quickbooksCustomerId: linkedCustomer.quickbooks_customer_id,
      });
      const match = result.customers?.[0];
      if (!match) {
        toast.error('Could not find the linked QuickBooks customer. It may have been deleted.');
        return;
      }
      const payload = qbCustomerToPayload(match);
      await customerMutations.refreshFromQB.mutateAsync({
        customerId: linkedCustomer.id,
        qb: payload,
      });
      invalidateTeamQueries();
    } catch {
      // Errors handled by mutation hooks
    }
  };

  const handleLinkExisting = async (accountId: string) => {
    try {
      await customerMutations.link.mutateAsync({ teamId, customerId: accountId });
      const account = orgCustomers?.find((c) => c.id === accountId);
      if (account?.quickbooks_customer_id) {
        await updateLegacyMapping.mutateAsync({
          custId: account.quickbooks_customer_id,
          displayName: account.quickbooks_display_name ?? account.name,
        });
      } else {
        await clearLegacyMapping.mutateAsync();
      }
      invalidateTeamQueries();
      closeDialog();
      toast.success(`Team "${teamName}" linked to account`);
    } catch {
      // Errors handled by mutation hooks
    }
  };

  const handleUnlink = async () => {
    if (!window.confirm('Remove the customer account link from this team?')) return;
    try {
      await customerMutations.link.mutateAsync({ teamId, customerId: null });
      await clearLegacyMapping.mutateAsync();
      invalidateTeamQueries();
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
  const isImportLinkPending =
    customerMutations.importFromQB.isPending ||
    customerMutations.remapFromQB.isPending ||
    customerMutations.link.isPending ||
    updateLegacyMapping.isPending;

  const isLinked = !!customerId && !!linkedCustomer;
  const isChangingExisting = isLinked && mode === 'import';

  const body = (
    <>
      {mappingLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <RefreshCw className="h-4 w-4 animate-spin" />
          Loading...
        </div>
      ) : isLinked ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="bg-success/10 text-success border-success/30">
              <CheckCircle className="h-3 w-3 mr-1" />
              Linked for invoice export
            </Badge>
            {linkedCustomer.quickbooks_customer_id && (
              <span className="text-xs text-muted-foreground">
                QB ID {linkedCustomer.quickbooks_customer_id}
              </span>
            )}
            {linkedCustomer.quickbooks_synced_at && (
              <span className="text-xs text-muted-foreground">
                Synced {new Date(linkedCustomer.quickbooks_synced_at).toLocaleDateString()}
              </span>
            )}
          </div>
          {linkedCustomer.quickbooks_display_name &&
            linkedCustomer.quickbooks_display_name !== linkedCustomer.name && (
              <p className="text-xs text-muted-foreground">
                QuickBooks name: {linkedCustomer.quickbooks_display_name}
              </p>
            )}
          <div className="flex gap-2 flex-wrap">
            {linkedCustomer.quickbooks_customer_id && (
              <Button variant="outline" size="sm" onClick={handleRefresh}>
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                Sync from QuickBooks
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => setMode('import')}>
              Change QB customer
            </Button>
            <Button variant="outline" size="sm" onClick={() => setMode('link')}>
              Link different account
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleUnlink}
              className="text-destructive hover:text-destructive"
            >
              <X className="h-4 w-4 mr-1" />
              Unlink
            </Button>
          </div>
        </div>
      ) : existingMapping ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Legacy mapping only
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">{existingMapping.display_name}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Import this QuickBooks customer to create a full customer account and enable contact
            sync.
          </p>
          <Button variant="outline" size="sm" onClick={() => setMode('import')}>
            <Download className="h-3.5 w-3.5 mr-1.5" />
            Import as account
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Link a QuickBooks customer to enable invoice export for this team&apos;s work orders.
          </p>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => setMode('import')}>
              <Download className="h-3.5 w-3.5 mr-1.5" />
              Import from QuickBooks
            </Button>
            <Button variant="outline" size="sm" onClick={() => setMode('link')}>
              <Link2 className="h-3.5 w-3.5 mr-1.5" />
              Link existing account
            </Button>
          </div>
        </div>
      )}

      <Dialog open={mode === 'import'} onOpenChange={() => closeDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {isChangingExisting ? 'Change QuickBooks customer' : 'Import from QuickBooks'}
            </DialogTitle>
            <DialogDescription>
              {isChangingExisting
                ? `Choose a different QuickBooks customer for "${teamName}". The linked customer account will be updated in place.`
                : `Search QuickBooks customers to import and link to "${teamName}"`}
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
                      type="button"
                      onClick={() => setSelectedCustomer(c)}
                      className={`w-full p-3 rounded-lg border text-left transition-colors ${
                        selectedCustomer?.Id === c.Id
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50 hover:bg-muted/50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-medium text-sm">{c.DisplayName}</div>
                        {c.Taxable !== undefined && (
                          <Badge variant="outline" className="text-[10px]">
                            {c.Taxable ? 'Taxable' : 'Tax Exempt'}
                          </Badge>
                        )}
                      </div>
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
                disabled={!selectedCustomer || isImportLinkPending}
              >
                {isImportLinkPending && <RefreshCw className="h-4 w-4 animate-spin mr-2" />}
                {isChangingExisting ? 'Update link' : 'Import & link'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={mode === 'link'} onOpenChange={() => closeDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Link existing account</DialogTitle>
            <DialogDescription>
              Choose an existing EquipQR customer account to link to &ldquo;{teamName}&rdquo;
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
                      type="button"
                      onClick={() => handleLinkExisting(acct.id)}
                      className="w-full p-3 rounded-lg border text-left transition-colors border-border hover:border-primary/50 hover:bg-muted/50"
                    >
                      <div className="font-medium text-sm">{acct.name}</div>
                      {acct.email && (
                        <div className="text-xs text-muted-foreground">{acct.email}</div>
                      )}
                      {acct.quickbooks_customer_id && (
                        <div className="text-xs text-muted-foreground mt-1">
                          QuickBooks ID {acct.quickbooks_customer_id}
                        </div>
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

  if (embedded) {
    return (
      <div className="border-t pt-3 mt-1 space-y-2">
        <p className="text-xs font-medium text-muted-foreground">QuickBooks invoice export</p>
        {body}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Link2 className="h-4 w-4" />
          QuickBooks invoice export
        </CardTitle>
        <CardDescription className="text-xs">
          Connect this team&apos;s customer account to a QuickBooks customer for draft invoice export
        </CardDescription>
      </CardHeader>
      <CardContent>{body}</CardContent>
    </Card>
  );
};
