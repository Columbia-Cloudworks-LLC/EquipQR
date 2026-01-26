/**
 * QuickBooks Customer Mapping Component
 * 
 * Allows admin/owners to map a team to a QuickBooks customer for invoice export.
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
  AlertTriangle
} from 'lucide-react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getConnectionStatus,
  getTeamCustomerMapping,
  updateTeamCustomerMapping,
  clearTeamCustomerMapping,
  searchCustomers,
  type QuickBooksCustomer
} from '@/services/quickbooks';
import { isQuickBooksEnabled } from '@/lib/flags';
import { useQuickBooksAccess } from '@/hooks/useQuickBooksAccess';
import { toast } from 'sonner';

interface QuickBooksCustomerMappingProps {
  teamId: string;
  teamName: string;
}

export const QuickBooksCustomerMapping: React.FC<QuickBooksCustomerMappingProps> = ({
  teamId,
  teamName
}) => {
  const { currentOrganization } = useOrganization();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<QuickBooksCustomer | null>(null);

  // Use the QuickBooks access hook which checks can_manage_quickbooks permission
  const { data: canManage = false, isLoading: permissionLoading } = useQuickBooksAccess();

  // Check if feature is enabled
  const featureEnabled = isQuickBooksEnabled();

  // Query for connection status
  const { data: connectionStatus } = useQuery({
    queryKey: ['quickbooks', 'connection', currentOrganization?.id],
    queryFn: () => getConnectionStatus(currentOrganization!.id),
    enabled: !!currentOrganization?.id && canManage && featureEnabled,
    staleTime: 60 * 1000,
  });

  // Query for existing mapping
  const { data: existingMapping, isLoading: mappingLoading } = useQuery({
    queryKey: ['quickbooks', 'team-mapping', currentOrganization?.id, teamId],
    queryFn: () => getTeamCustomerMapping(currentOrganization!.id, teamId),
    enabled: !!currentOrganization?.id && !!teamId && canManage && featureEnabled && connectionStatus?.isConnected,
  });

  // Query for customer search
  const { 
    data: customerSearchResult, 
    isLoading: searchLoading,
    refetch: refetchCustomers
  } = useQuery({
    queryKey: ['quickbooks', 'customers', currentOrganization?.id, searchQuery],
    queryFn: () => searchCustomers(currentOrganization!.id, searchQuery),
    enabled: !!currentOrganization?.id && isDialogOpen && connectionStatus?.isConnected,
    staleTime: 30 * 1000,
  });

  // Mutation for updating mapping
  const updateMutation = useMutation({
    mutationFn: ({ customerId, displayName }: { customerId: string; displayName: string }) =>
      updateTeamCustomerMapping(currentOrganization!.id, teamId, customerId, displayName),
    onSuccess: () => {
      toast.success(`Team "${teamName}" mapped to QuickBooks customer`);
      queryClient.invalidateQueries({ queryKey: ['quickbooks', 'team-mapping'] });
      setIsDialogOpen(false);
      setSelectedCustomer(null);
    },
    onError: (error: Error) => {
      toast.error(`Failed to update mapping: ${error.message}`);
    },
  });

  // Mutation for clearing mapping
  const clearMutation = useMutation({
    mutationFn: () => clearTeamCustomerMapping(currentOrganization!.id, teamId),
    onSuccess: () => {
      toast.success(`QuickBooks customer mapping removed from "${teamName}"`);
      queryClient.invalidateQueries({ queryKey: ['quickbooks', 'team-mapping'] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to clear mapping: ${error.message}`);
    },
  });

  // Handle customer selection
  const handleSelectCustomer = (customer: QuickBooksCustomer) => {
    setSelectedCustomer(customer);
  };

  // Handle save
  const handleSave = () => {
    if (!selectedCustomer) return;
    updateMutation.mutate({
      customerId: selectedCustomer.Id,
      displayName: selectedCustomer.DisplayName,
    });
  };

  // Handle clear mapping
  const handleClearMapping = () => {
    if (window.confirm('Are you sure you want to remove the QuickBooks customer mapping for this team?')) {
      clearMutation.mutate();
    }
  };

  // Don't render if feature is disabled or user doesn't have permission
  if (!featureEnabled || !canManage) {
    return null;
  }

  // Don't render if QuickBooks is not connected
  if (!connectionStatus?.isConnected) {
    return null;
  }

  const customers = customerSearchResult?.customers || [];

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
          {mappingLoading || permissionLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Loading...
            </div>
          ) : existingMapping ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Mapped
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{existingMapping.display_name}</span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsDialogOpen(true)}
                >
                  Change
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearMapping}
                  disabled={clearMutation.isPending}
                  className="text-destructive hover:text-destructive"
                >
                  {clearMutation.isPending ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <X className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                No QuickBooks customer mapped. Map a customer to enable invoice export for work orders assigned to this team.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsDialogOpen(true)}
              >
                <Link2 className="h-4 w-4 mr-2" />
                Select Customer
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Customer Selection Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Select QuickBooks Customer</DialogTitle>
            <DialogDescription>
              Choose a customer from QuickBooks to link to "{teamName}"
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search customers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Customer List */}
            <ScrollArea className="h-[300px] pr-4">
              {searchLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : customerSearchResult?.error ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <AlertTriangle className="h-8 w-8 text-destructive mb-2" />
                  <p className="text-sm text-muted-foreground">{customerSearchResult.error}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => refetchCustomers()}
                  >
                    Retry
                  </Button>
                </div>
              ) : customers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Building2 className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {searchQuery ? 'No customers found matching your search' : 'No customers found in QuickBooks'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {customers.map((customer) => (
                    <button
                      key={customer.Id}
                      onClick={() => handleSelectCustomer(customer)}
                      className={`w-full p-3 rounded-lg border text-left transition-colors ${
                        selectedCustomer?.Id === customer.Id
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50 hover:bg-muted/50'
                      }`}
                    >
                      <div className="font-medium text-sm">{customer.DisplayName}</div>
                      {customer.CompanyName && customer.CompanyName !== customer.DisplayName && (
                        <div className="text-xs text-muted-foreground">{customer.CompanyName}</div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsDialogOpen(false);
                  setSelectedCustomer(null);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={!selectedCustomer || updateMutation.isPending}
              >
                {updateMutation.isPending ? (
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default QuickBooksCustomerMapping;
