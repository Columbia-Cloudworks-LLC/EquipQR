import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Pencil, Trash2, Shield, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { useSuperAdminAccess } from '@/hooks/useSuperAdminAccess';
import {
  useExemptions,
  useCreateExemption,
  useUpdateExemption,
  useDeleteExemption,
  useAdminOrganizations,
} from '@/hooks/useBillingExemptions';
import type { BillingExemptionWithDetails, ExemptionFormData } from '@/types/billingExemptions';
import { Alert, AlertDescription } from '@/components/ui/alert';

const BillingExemptionsAdmin = () => {
  const { isSuperAdmin, isLoading: superAdminLoading } = useSuperAdminAccess();
  const [selectedOrgId, setSelectedOrgId] = useState<string>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingExemption, setEditingExemption] = useState<BillingExemptionWithDetails | null>(null);
  const [deletingExemptionId, setDeletingExemptionId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState<ExemptionFormData>({
    organization_id: '',
    exemption_type: 'user_licenses',
    exemption_value: 0,
    reason: '',
    expires_at: '',
  });

  const { data: organizations, isLoading: orgsLoading } = useAdminOrganizations();
  const { data: exemptions, isLoading: exemptionsLoading } = useExemptions(
    selectedOrgId === 'all' ? undefined : selectedOrgId
  );
  const createMutation = useCreateExemption();
  const updateMutation = useUpdateExemption();
  const deleteMutation = useDeleteExemption();

  // Access control check
  if (superAdminLoading) {
    return (
      <div className="p-4 sm:p-6 space-y-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">Loading...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isSuperAdmin) {
    return (
      <div className="p-4 sm:p-6 space-y-6">
        <Card className="border-destructive/20 bg-destructive/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
              <div>
                <div className="text-sm text-foreground font-semibold">Access Denied</div>
                <div className="text-sm text-muted-foreground mt-1">
                  You do not have permission to access the billing exemptions admin dashboard.
                  This feature is restricted to super administrators only.
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleCreate = () => {
    setFormData({
      organization_id: selectedOrgId === 'all' ? '' : selectedOrgId,
      exemption_type: 'user_licenses',
      exemption_value: 0,
      reason: '',
      expires_at: '',
    });
    setIsCreateDialogOpen(true);
  };

  const handleEdit = (exemption: BillingExemptionWithDetails) => {
    setEditingExemption(exemption);
    setFormData({
      organization_id: exemption.organization_id,
      exemption_type: exemption.exemption_type,
      exemption_value: exemption.exemption_value,
      reason: exemption.reason || '',
      expires_at: exemption.expires_at ? exemption.expires_at.split('T')[0] : '',
    });
    setIsEditDialogOpen(true);
  };

  const handleDelete = (exemptionId: string) => {
    setDeletingExemptionId(exemptionId);
    setIsDeleteDialogOpen(true);
  };

  const handleSubmitCreate = () => {
    createMutation.mutate(formData, {
      onSuccess: () => {
        setIsCreateDialogOpen(false);
      },
    });
  };

  const handleSubmitEdit = () => {
    if (!editingExemption) return;
    
    updateMutation.mutate(
      {
        id: editingExemption.id,
        data: {
          exemption_type: formData.exemption_type,
          exemption_value: formData.exemption_value,
          reason: formData.reason,
          expires_at: formData.expires_at || undefined,
        },
      },
      {
        onSuccess: () => {
          setIsEditDialogOpen(false);
          setEditingExemption(null);
        },
      }
    );
  };

  const handleConfirmDelete = () => {
    if (!deletingExemptionId) return;
    
    deleteMutation.mutate(deletingExemptionId, {
      onSuccess: () => {
        setIsDeleteDialogOpen(false);
        setDeletingExemptionId(null);
      },
    });
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Billing Exemptions Admin</h1>
          <p className="text-sm text-muted-foreground">
            Manage billing exemptions for organizations
          </p>
        </div>
        <Badge variant="secondary" className="gap-1">
          <Shield className="h-3 w-3" />
          Super Admin
        </Badge>
      </div>

      {/* Alert */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Billing exemptions grant additional license capacity without charges. 
          They are typically used for testing, trials, or special agreements.
        </AlertDescription>
      </Alert>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 space-y-2">
              <Label htmlFor="org-filter">Organization</Label>
              <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
                <SelectTrigger id="org-filter">
                  <SelectValue placeholder="All Organizations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Organizations</SelectItem>
                  {organizations?.map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name} ({org.member_count} members)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={handleCreate} disabled={orgsLoading}>
                <Plus className="mr-2 h-4 w-4" />
                Create Exemption
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Exemptions Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Exemptions {selectedOrgId !== 'all' && exemptions ? `(${exemptions.length})` : ''}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {exemptionsLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading exemptions...</div>
          ) : !exemptions || exemptions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {selectedOrgId !== 'all' ? 'No exemptions found for this organization.' : 'Select an organization or create an exemption.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Organization</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Granted</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {exemptions.map((exemption) => {
                    const isExpired = exemption.expires_at && new Date(exemption.expires_at) < new Date();
                    const isActive = exemption.is_active && !isExpired;
                    
                    return (
                      <TableRow key={exemption.id}>
                        <TableCell className="font-medium">
                          {exemption.organizations?.name || 'Unknown'}
                        </TableCell>
                        <TableCell className="capitalize">
                          {exemption.exemption_type.replace(/_/g, ' ')}
                        </TableCell>
                        <TableCell className="font-semibold">
                          +{exemption.exemption_value}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {exemption.reason || '—'}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(exemption.granted_at), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {exemption.expires_at
                            ? format(new Date(exemption.expires_at), 'MMM d, yyyy')
                            : 'Never'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={isActive ? 'default' : 'secondary'}>
                            {isActive ? 'Active' : isExpired ? 'Expired' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(exemption)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(exemption.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Billing Exemption</DialogTitle>
            <DialogDescription>
              Grant additional capacity to an organization without billing.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="create-org">Organization *</Label>
              <Select
                value={formData.organization_id}
                onValueChange={(value) => setFormData({ ...formData, organization_id: value })}
              >
                <SelectTrigger id="create-org">
                  <SelectValue placeholder="Select organization" />
                </SelectTrigger>
                <SelectContent>
                  {organizations?.map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-type">Exemption Type *</Label>
              <Select
                value={formData.exemption_type}
                onValueChange={(value) => setFormData({ ...formData, exemption_type: value })}
              >
                <SelectTrigger id="create-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user_licenses">User Licenses</SelectItem>
                  <SelectItem value="storage">Storage</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-value">Value *</Label>
              <Input
                id="create-value"
                type="number"
                min="0"
                value={formData.exemption_value}
                onChange={(e) =>
                  setFormData({ ...formData, exemption_value: parseInt(e.target.value) || 0 })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-reason">Reason</Label>
              <Textarea
                id="create-reason"
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                placeholder="e.g., Testing account, Special trial, Partnership agreement"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-expires">Expiration Date</Label>
              <Input
                id="create-expires"
                type="date"
                value={formData.expires_at}
                onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">Leave empty for no expiration</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmitCreate}
              disabled={!formData.organization_id || createMutation.isPending}
            >
              {createMutation.isPending ? 'Creating...' : 'Create Exemption'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Billing Exemption</DialogTitle>
            <DialogDescription>
              Update the exemption details below.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Organization</Label>
              <Input
                value={editingExemption?.organizations?.name || 'Unknown'}
                disabled
                className="bg-muted"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-type">Exemption Type *</Label>
              <Select
                value={formData.exemption_type}
                onValueChange={(value) => setFormData({ ...formData, exemption_type: value })}
              >
                <SelectTrigger id="edit-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user_licenses">User Licenses</SelectItem>
                  <SelectItem value="storage">Storage</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-value">Value *</Label>
              <Input
                id="edit-value"
                type="number"
                min="0"
                value={formData.exemption_value}
                onChange={(e) =>
                  setFormData({ ...formData, exemption_value: parseInt(e.target.value) || 0 })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-reason">Reason</Label>
              <Textarea
                id="edit-reason"
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-expires">Expiration Date</Label>
              <Input
                id="edit-expires"
                type="date"
                value={formData.expires_at}
                onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmitEdit}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? 'Updating...' : 'Update Exemption'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Exemption?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The exemption will be permanently removed,
              and the organization will lose the exempted capacity.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default BillingExemptionsAdmin;

