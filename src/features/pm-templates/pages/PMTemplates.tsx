import React, { useState } from 'react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { usePermissions } from '@/hooks/usePermissions';
import { useSimplifiedOrganizationRestrictions } from '@/features/organization/hooks/useSimplifiedOrganizationRestrictions';
import { usePMTemplates, usePMTemplate, useClonePMTemplate, useDeletePMTemplate } from '@/features/pm-templates/hooks/usePMTemplates';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, Copy, Edit, Trash2, Wrench, Users, Shield, Globe, Lock } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { TemplateAssignmentDialog } from '@/features/pm-templates/components/TemplateAssignmentDialog';
import { ChecklistTemplateEditor } from '@/features/organization/components/ChecklistTemplateEditor';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import Page from '@/components/layout/Page';

// Enhanced Template Card Component
interface TemplateCardProps {
  template: {
    id: string;
    name: string;
    description?: string | null;
    organization_id: string | null;
    is_protected: boolean;
    sections: { name: string; count: number }[];
    itemCount: number;
  };
  isOrgTemplate: boolean;
  isAdmin: boolean;
  canCreateCustomTemplates: boolean;
  onEdit: (templateId: string) => void;
  onApply: (templateId: string) => void;
  onClone: (templateId: string) => void;
  onDelete: (templateId: string) => void;
}

const TemplateCard: React.FC<TemplateCardProps> = ({ 
  template, 
  isOrgTemplate, 
  isAdmin,
  canCreateCustomTemplates,
  onEdit, 
  onApply, 
  onClone, 
  onDelete 
}) => {
  // Use the already-processed summary data
  const sections = template.sections || [];
  const totalItems = template.itemCount || 0;

  const canEdit = isAdmin && isOrgTemplate && !template.is_protected && canCreateCustomTemplates;
  const canDelete = isAdmin && isOrgTemplate && !template.is_protected && canCreateCustomTemplates;
  const canClone = canCreateCustomTemplates;

  const navigate = useNavigate();
  const handleView = () => navigate(`/dashboard/pm-templates/${template.id}`);

  return (
    <Card className="h-full flex flex-col hover:bg-muted/50 transition-colors">
      <CardHeader
        className="flex-grow cursor-pointer"
        role="button"
        tabIndex={0}
        onClick={handleView}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleView()}
      >
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg line-clamp-2">{template.name}</CardTitle>
          <div className="flex gap-1 ml-2">
            {!isOrgTemplate && (
              <Badge variant="secondary" className="text-xs">
                <Globe className="w-3 h-3 mr-1" />
                Global
              </Badge>
            )}
            {template.is_protected && (
              <Badge variant="outline" className="text-xs">
                <Shield className="w-3 h-3 mr-1" />
                Protected
              </Badge>
            )}
          </div>
        </div>
        
        {template.description && (
          <p className="text-sm text-muted-foreground line-clamp-3 mt-2">
            {template.description}
          </p>
        )}

        <div className="space-y-3 mt-4">
          {/* Section breakdown */}
          <div>
            <h4 className="text-sm font-medium mb-2">Sections ({sections.length})</h4>
            <div className="space-y-1">
              {sections.slice(0, 3).map((section, index) => (
                <div key={index} className="flex justify-between text-xs text-muted-foreground">
                  <span className="truncate">{section.name}</span>
                  <span>{section.count} items</span>
                </div>
              ))}
              {sections.length > 3 && (
                <div className="text-xs text-muted-foreground">
                  +{sections.length - 3} more sections
                </div>
              )}
            </div>
          </div>

          {/* Total items */}
          <div className="flex justify-between text-sm">
            <span className="font-medium">Total Items:</span>
            <span>{totalItems}</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="flex flex-col gap-2">
          <Button 
            onClick={() => onApply(template.id)} 
            className="w-full"
            size="sm"
          >
            <Wrench className="mr-2 h-4 w-4" />
            Apply to Equipment
          </Button>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onClone(template.id)}
              className="flex-1"
              disabled={!canClone}
              title={!canClone ? 'Custom PM templates require user licenses' : ''}
            >
              {!canClone && <Lock className="mr-1 h-3 w-3" />}
              <Copy className="mr-1 h-3 w-3" />
              Clone
            </Button>
            
            {canEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit(template.id)}
                className="flex-1"
              >
                <Edit className="mr-1 h-3 w-3" />
                Edit
              </Button>
            )}
            
            {canDelete && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="px-2">
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Template</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete "{template.name}"? This action cannot be undone.
                      {!isOrgTemplate && " Global templates cannot be deleted."}
                      {template.is_protected && " Protected templates cannot be deleted."}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={() => onDelete(template.id)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const PMTemplates = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { currentOrganization } = useOrganization();
  const { hasRole } = usePermissions();
  const { restrictions } = useSimplifiedOrganizationRestrictions();
  const { data: templates, isLoading } = usePMTemplates();
  
  const [editingTemplate, setEditingTemplate] = useState<string | null>(searchParams.get('edit'));
  const [templateToApply, setTemplateToApply] = useState<string | null>(null);
  const [cloneDialogOpen, setCloneDialogOpen] = useState<string | null>(null);
  const [cloneName, setCloneName] = useState('');

  // Fetch the template being edited
  const { data: templateToEdit } = usePMTemplate(editingTemplate || '');
  
  // Mutations
  const cloneTemplateMutation = useClonePMTemplate();
  const deleteTemplateMutation = useDeletePMTemplate();

  // Only org admins can access this page
  const isAdmin = hasRole(['owner', 'admin']);
  const canCreateCustomTemplates = restrictions.canCreateCustomPMTemplates;

  if (!currentOrganization) {
    return (
      <Page maxWidth="7xl" padding="responsive">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">PM Templates</h1>
            <p className="text-muted-foreground">
              Please select an organization to manage PM templates.
            </p>
          </div>
        </div>
      </Page>
    );
  }

  if (!isAdmin) {
    return (
      <Page maxWidth="7xl" padding="responsive">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">PM Templates</h1>
            <p className="text-muted-foreground">
              You need administrator permissions to access this page.
            </p>
          </div>
        </div>
      </Page>
    );
  }

  const handleCreateTemplate = () => {
    setEditingTemplate('new');
  };

  const handleEditTemplate = (templateId: string) => {
    setEditingTemplate(templateId);
  };

  const handleCloseEditor = () => {
    setEditingTemplate(null);
    if (searchParams.get('edit')) {
      searchParams.delete('edit');
      setSearchParams(searchParams, { replace: true });
    }
  };

  const handleApplyTemplate = (templateId: string) => {
    setTemplateToApply(templateId);
  };

  const handleCloseApplication = () => {
    setTemplateToApply(null);
  };

  const handleCloneTemplate = (templateId: string) => {
    const template = templates?.find(t => t.id === templateId);
    setCloneName(template ? `${template.name} (Copy)` : '');
    setCloneDialogOpen(templateId);
  };

  const handleConfirmClone = () => {
    if (cloneDialogOpen && cloneName.trim()) {
      cloneTemplateMutation.mutate(
        { sourceId: cloneDialogOpen, newName: cloneName.trim() },
        {
          onSuccess: () => {
            setCloneDialogOpen(null);
            setCloneName('');
          }
        }
      );
    }
  };

  const handleDeleteTemplate = (templateId: string) => {
    deleteTemplateMutation.mutate(templateId);
  };

  // Separate templates into global and organization-specific
  const globalTemplates = templates?.filter(t => !t.organization_id) || [];
  const orgTemplates = templates?.filter(t => t.organization_id === currentOrganization?.id) || [];
  
  // For free users, show upgrade message if they try to access org templates
  const showUpgradeMessage = !canCreateCustomTemplates && isAdmin;

  return (
    <Page maxWidth="7xl" padding="responsive">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">PM Templates</h1>
          <p className="text-muted-foreground mt-2">
            Manage preventative maintenance checklist templates for your organization.
          </p>
        </div>
        {isAdmin && (
          <Button 
            onClick={handleCreateTemplate}
            disabled={!canCreateCustomTemplates}
            title={!canCreateCustomTemplates ? 'Custom PM templates require user licenses' : ''}
          >
            {!canCreateCustomTemplates && <Lock className="mr-2 h-4 w-4" />}
            <Plus className="mr-2 h-4 w-4" />
            New Template
          </Button>
        )}
      </div>

      {showUpgradeMessage && (
        <Alert>
          <Lock className="h-4 w-4" />
          <AlertDescription>
            Custom PM templates require user licenses. You can still use global templates like the Forklift PM checklist. 
            <strong> Purchase user licenses to create, edit, and clone custom PM templates.</strong>
          </AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="space-y-3">
                <div className="h-6 bg-muted rounded w-3/4"></div>
                <div className="h-4 bg-muted rounded w-full"></div>
                <div className="h-4 bg-muted rounded w-2/3"></div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="h-10 bg-muted rounded"></div>
                <div className="h-10 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (templates && (globalTemplates.length > 0 || orgTemplates.length > 0)) ? (
        <div className="space-y-8">
          {/* Global Templates */}
          {globalTemplates.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <Globe className="mr-2 h-5 w-5" />
                Global Templates
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {globalTemplates.map((template) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    isOrgTemplate={false}
                    isAdmin={isAdmin}
                    canCreateCustomTemplates={canCreateCustomTemplates}
                    onEdit={handleEditTemplate}
                    onApply={handleApplyTemplate}
                    onClone={handleCloneTemplate}
                    onDelete={handleDeleteTemplate}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Organization Templates */}
          {orgTemplates.length > 0 && canCreateCustomTemplates && (
            <div>
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <Users className="mr-2 h-5 w-5" />
                Organization Templates
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {orgTemplates.map((template) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    isOrgTemplate={true}
                    isAdmin={isAdmin}
                    canCreateCustomTemplates={canCreateCustomTemplates}
                    onEdit={handleEditTemplate}
                    onApply={handleApplyTemplate}
                    onClone={handleCloneTemplate}
                    onDelete={handleDeleteTemplate}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <Card className="text-center py-12">
          <CardContent>
            <Wrench className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Templates Available</h3>
            <p className="text-muted-foreground mb-6">
              {canCreateCustomTemplates 
                ? 'Create your first PM checklist template to get started.'
                : 'Purchase user licenses to create custom PM templates, or use the available global templates.'}
            </p>
            {isAdmin && canCreateCustomTemplates && (
              <Button onClick={handleCreateTemplate}>
                <Plus className="mr-2 h-4 w-4" />
                Create Template
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {editingTemplate && (
        <Dialog open={!!editingTemplate} onOpenChange={(open) => !open && handleCloseEditor()}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-auto">
            <DialogHeader>
              <DialogTitle>
                {editingTemplate === 'new' ? 'Create PM Template' : 'Edit PM Template'}
              </DialogTitle>
              <DialogDescription>
                {editingTemplate === 'new' ? 'Create a new PM template' : 'Edit existing PM template'}
              </DialogDescription>
            </DialogHeader>
            <ChecklistTemplateEditor
              template={editingTemplate === 'new' ? undefined : templateToEdit}
              onSave={handleCloseEditor}
              onCancel={handleCloseEditor}
            />
          </DialogContent>
        </Dialog>
      )}

      {templateToApply && (
        <TemplateAssignmentDialog
          templateId={templateToApply}
          open={!!templateToApply}
          onClose={handleCloseApplication}
        />
      )}

      {/* Clone Template Dialog */}
      <Dialog open={!!cloneDialogOpen} onOpenChange={(open) => !open && setCloneDialogOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clone Template</DialogTitle>
            <DialogDescription>
              Create a copy of this template that you can customize for your organization.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="clone-name">New Template Name</Label>
              <Input
                id="clone-name"
                value={cloneName}
                onChange={(e) => setCloneName(e.target.value)}
                placeholder="Enter name for cloned template"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloneDialogOpen(null)}>
              Cancel
            </Button>
            <Button 
              onClick={handleConfirmClone}
              disabled={!cloneName.trim() || cloneTemplateMutation.isPending}
            >
              {cloneTemplateMutation.isPending ? 'Cloning...' : 'Clone Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </Page>
  );
};

export default PMTemplates;
